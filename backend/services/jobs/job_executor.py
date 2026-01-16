"""
Job Executor - Executes data collection jobs in background with retry logic.

Features:
- Retry logic with exponential backoff (max 3 retries)
- Progress updates persisted to database
- Graceful error handling and recovery
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Callable

# Import supabase functions for job updates
from supabase_client import (
    update_job_status,
    complete_job as db_complete_job,
    get_pending_jobs,
    get_running_jobs_count,
    increment_job_retry,
    get_job_by_id as db_get_job_by_id,
)
from .job_manager import job_manager

# Configure logger
logger = logging.getLogger(__name__)

# Maximum rows to collect to prevent memory exhaustion
MAX_ROWS = 50000

# Retry configuration
MAX_RETRIES = 3
RETRY_BASE_DELAY = 2  # seconds (exponential: 2s, 4s, 8s)


async def update_progress(job_id: str, progress: int, message: str, stage: str = "info"):
    """Update job progress in database."""
    try:
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: update_job_status(
                job_id,
                status="running",
                progress=progress,
                progress_message=message
            )
        )
    except Exception as e:
        logger.warning(f"Job {job_id} - Failed to update progress: {e}")


async def execute_job_with_retry(job_id: str, parameters: Dict[str, Any], retry_count: int = 0):
    """
    Execute a data collection job with retry logic.

    Args:
        job_id: The job UUID
        parameters: Job parameters including company_name, dates, filters, etc.
        retry_count: Current retry attempt (0-indexed)
    """
    loop = asyncio.get_event_loop()

    try:
        # Mark job as running with retry info
        await loop.run_in_executor(
            None,
            lambda: update_job_status(
                job_id,
                status="running",
                progress=0,
                progress_message=f"Starting data collection{f' (retry {retry_count})' if retry_count > 0 else ''}...",
                started_at=datetime.utcnow()
            )
        )

        await update_progress(job_id, 0, "Initializing AEOS client...", "info")
        logger.info(f"Job {job_id} - Initializing (attempt {retry_count + 1}/{MAX_RETRIES})")

        # Import AEOS components
        try:
            from integration.aeos_client import AEOSClient
            from integration.spotlist_checker import SpotlistChecker
            from utils import flatten_spotlist_report
            AEOS_AVAILABLE = True
            logger.debug(f"Job {job_id} - AEOS components imported")
        except ImportError as e:
            AEOS_AVAILABLE = False
            logger.error(f"Job {job_id} - AEOS import failed: {e}")

        if not AEOS_AVAILABLE:
            # Don't retry for import errors - they won't resolve
            await loop.run_in_executor(
                None,
                lambda: update_job_status(
                    job_id,
                    status="failed",
                    error_message="AEOS integration not available",
                    completed_at=datetime.utcnow()
                )
            )
            return

        # Initialize AEOS client
        await update_progress(job_id, 5, "Connecting to AEOS...", "info")
        logger.debug(f"Job {job_id} - Creating AEOS client")

        try:
            client = await loop.run_in_executor(None, AEOSClient)
            checker = SpotlistChecker(client)
            logger.debug(f"Job {job_id} - AEOS client created")
        except Exception as e:
            logger.error(f"Job {job_id} - AEOS client error: {e}")
            # Retry on connection errors
            raise RetryableError(f"Error initializing AEOS: {str(e)}")

        # Extract parameters
        company_name = parameters.get("company_name", "")
        date_from = parameters.get("date_from")
        date_to = parameters.get("date_to")
        channel_filter = parameters.get("channel_filter")
        report_type = parameters.get("report_type", "spotlist")
        brand_ids = parameters.get("brand_ids")
        product_ids = parameters.get("product_ids")
        weekdays = parameters.get("weekdays")
        dayparts = parameters.get("dayparts")
        epg_categories = parameters.get("epg_categories")
        profiles = parameters.get("profiles")

        await update_progress(job_id, 10, "Fetching channels...", "info")

        # Get channels
        try:
            all_channels_raw = await loop.run_in_executor(None, client.get_analytics_channels)
        except Exception as e:
            raise RetryableError(f"Failed to fetch channels: {str(e)}")

        # Filter channels if specified
        if channel_filter and channel_filter.strip():
            filter_terms = [term.strip().lower() for term in channel_filter.split(',') if term.strip()]
            all_channels = [
                ch for ch in all_channels_raw
                if any(term in ch.get("caption", "").lower() for term in filter_terms)
            ]
            if not all_channels:
                all_channels = all_channels_raw
        else:
            all_channels = all_channels_raw

        total_channels = len(all_channels)
        await update_progress(job_id, 15, f"Processing {total_channels} channels...", "info")

        # Collect data from channels (with memory limit)
        all_rows = []
        channels_with_data = 0
        row_limit_reached = False
        target = company_name.lower() if company_name else ""
        consecutive_errors = 0

        for idx, ch in enumerate(all_channels):
            channel_id = ch["value"]
            channel_caption = ch["caption"]

            # Calculate progress (15% to 70%)
            progress = 15 + (idx / total_channels) * 55 if total_channels > 0 else 15
            await update_progress(
                job_id,
                int(progress),
                f"Processing {channel_caption} ({idx + 1}/{total_channels})...",
                "info"
            )

            try:
                # Get spotlist for channel
                report = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        checker.get_spotlist,
                        channel_id,
                        date_from,
                        date_to,
                    ),
                    timeout=300.0  # 5 minute timeout per channel
                )
                consecutive_errors = 0  # Reset on success

                # Flatten report data using the same utility as main streaming
                rows = flatten_spotlist_report(report)

                if not rows:
                    continue

                # Filter by company if specified (with row limit check)
                channel_matches = 0
                for r in rows:
                    # Check row limit to prevent memory exhaustion
                    if len(all_rows) >= MAX_ROWS:
                        row_limit_reached = True
                        break

                    r["Channel"] = channel_caption

                    if target:
                        company = str(r.get("Company") or r.get("Kunde") or "").lower()
                        if target in company:
                            all_rows.append(r)
                            channel_matches += 1
                    else:
                        all_rows.append(r)
                        channel_matches += 1

                if channel_matches > 0:
                    channels_with_data += 1

                # If row limit reached, stop processing more channels
                if row_limit_reached:
                    await update_progress(
                        job_id,
                        int(progress),
                        f"Row limit ({MAX_ROWS}) reached, stopping collection...",
                        "warning"
                    )
                    break

            except asyncio.TimeoutError:
                consecutive_errors += 1
                await update_progress(
                    job_id,
                    int(progress),
                    f"Timeout on {channel_caption}, continuing...",
                    "warning"
                )
            except Exception as e:
                consecutive_errors += 1
                await update_progress(
                    job_id,
                    int(progress),
                    f"Error on {channel_caption}: {str(e)[:50]}",
                    "warning"
                )

            # If too many consecutive errors, something is wrong - retry the job
            if consecutive_errors >= 5:
                raise RetryableError(f"Too many consecutive channel errors ({consecutive_errors})")

        await update_progress(job_id, 70, f"Found {len(all_rows)} spots from {channels_with_data} channels", "success")

        if not all_rows:
            await loop.run_in_executor(
                None,
                lambda: update_job_status(
                    job_id,
                    status="failed",
                    error_message=f"No data found for {date_from} to {date_to}",
                    completed_at=datetime.utcnow()
                )
            )
            return

        await update_progress(job_id, 85, "Preparing results...", "info")

        # Prepare result metadata
        result_metadata = {
            "company_name": company_name,
            "date_from": date_from,
            "date_to": date_to,
            "channel_filter": channel_filter,
            "report_type": report_type,
            "total_spots": len(all_rows),
            "channels_with_data": channels_with_data,
            "retry_count": retry_count,
        }

        await update_progress(job_id, 95, "Saving results...", "info")

        # Complete job with results
        success = await loop.run_in_executor(
            None,
            lambda: db_complete_job(job_id, all_rows, result_metadata)
        )

        if success:
            logger.info(f"Job {job_id} completed with {len(all_rows)} spots (attempt {retry_count + 1})")
        else:
            raise RetryableError("Failed to save results to database")

    except RetryableError as e:
        logger.warning(f"Job {job_id} - Retryable error: {e}")
        await handle_retry(job_id, parameters, retry_count, str(e))

    except asyncio.CancelledError:
        await loop.run_in_executor(
            None,
            lambda: update_job_status(
                job_id,
                status="failed",
                error_message="Job was cancelled",
                completed_at=datetime.utcnow()
            )
        )
        raise

    except Exception as e:
        logger.error(f"Job {job_id} - Unexpected exception: {e}")
        logger.exception("Full traceback:")
        # Unexpected errors may be retryable
        await handle_retry(job_id, parameters, retry_count, str(e)[:500])

    finally:
        logger.debug(f"Job {job_id} - Cleaning up")
        await job_manager.unregister_job(job_id)
        # Try to start next queued job
        await process_queued_jobs()


class RetryableError(Exception):
    """Error that indicates the job should be retried."""
    pass


async def handle_retry(job_id: str, parameters: Dict[str, Any], current_retry: int, error_message: str):
    """Handle retry logic with exponential backoff."""
    loop = asyncio.get_event_loop()

    if current_retry < MAX_RETRIES - 1:
        next_retry = current_retry + 1
        delay = RETRY_BASE_DELAY * (2 ** current_retry)  # Exponential: 2s, 4s, 8s

        logger.info(f"Job {job_id} - Scheduling retry {next_retry + 1}/{MAX_RETRIES} in {delay}s")

        # Update job status to pending_retry
        await loop.run_in_executor(
            None,
            lambda: update_job_status(
                job_id,
                status="pending_retry",
                progress_message=f"Retrying in {delay}s... (attempt {next_retry + 1}/{MAX_RETRIES})",
                error_message=error_message
            )
        )

        # Increment retry count in database
        await loop.run_in_executor(
            None,
            lambda: increment_job_retry(job_id)
        )

        # Wait before retrying
        await asyncio.sleep(delay)

        # Retry the job
        await execute_job_with_retry(job_id, parameters, next_retry)
    else:
        logger.error(f"Job {job_id} - Max retries ({MAX_RETRIES}) exceeded")
        await loop.run_in_executor(
            None,
            lambda: update_job_status(
                job_id,
                status="failed",
                error_message=f"Max retries exceeded. Last error: {error_message}",
                completed_at=datetime.utcnow()
            )
        )


# Keep the old function name for backwards compatibility
async def execute_job(job_id: str, parameters: Dict[str, Any]):
    """Execute a data collection job (wrapper for retry-enabled version)."""
    await execute_job_with_retry(job_id, parameters, retry_count=0)


async def start_job(job_id: str, parameters: Dict[str, Any]) -> bool:
    """
    Start a job execution as background task.

    Args:
        job_id: The job UUID
        parameters: Job parameters

    Returns:
        True if job was started, False if queued (limit reached)
    """
    if not job_manager.can_start_job():
        # Update status to queued
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: update_job_status(job_id, status="queued")
        )
        logger.info(f"Job {job_id} queued (concurrency limit reached)")
        return False

    # Create and register task
    task = asyncio.create_task(execute_job(job_id, parameters))
    registered = await job_manager.register_job(job_id, task)

    if not registered:
        # Race condition - another job started first
        task.cancel()
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: update_job_status(job_id, status="queued")
        )
        return False

    logger.info(f"Started job {job_id}")
    return True


async def process_queued_jobs():
    """Check for queued jobs and start them if capacity available."""
    if not job_manager.can_start_job():
        return

    loop = asyncio.get_event_loop()
    pending_jobs = await loop.run_in_executor(None, lambda: get_pending_jobs(limit=3))

    for job in pending_jobs:
        if not job_manager.can_start_job():
            break

        job_id = job.get("id")
        parameters = job.get("parameters", {})

        if job_id and not job_manager.is_job_running(job_id):
            await start_job(job_id, parameters)
