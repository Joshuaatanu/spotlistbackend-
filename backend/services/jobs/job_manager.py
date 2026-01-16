"""
Job Manager - Handles background job execution with concurrency control.

Uses in-memory tracking with database persistence for reliability.
On startup, recovers from stale jobs left in 'running' state and processes queued jobs.
No Redis/Celery required - uses asyncio tasks.
"""

import asyncio
from typing import Dict, Optional, Set, List
from datetime import datetime
import threading
import logging

MAX_CONCURRENT_JOBS = 3

logger = logging.getLogger(__name__)


class JobManager:
    """
    Singleton job manager for background task coordination.

    Tracks running jobs in memory and enforces concurrency limits.
    Jobs are persisted in the database for durability across restarts.

    On startup, the manager:
    1. Marks any stale 'running' jobs as failed (from previous server instance)
    2. Processes queued jobs to resume work
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize the job manager state."""
        self._running_jobs: Dict[str, asyncio.Task] = {}
        self._job_lock = asyncio.Lock()
        self._recovered = False
        print("[JobManager] Initialized with max concurrent jobs:", MAX_CONCURRENT_JOBS)

    @property
    def running_count(self) -> int:
        """Get the number of currently running jobs."""
        return len(self._running_jobs)

    @property
    def running_job_ids(self) -> Set[str]:
        """Get the IDs of currently running jobs."""
        return set(self._running_jobs.keys())

    def can_start_job(self) -> bool:
        """Check if a new job can be started (within concurrency limit)."""
        return self.running_count < MAX_CONCURRENT_JOBS

    async def register_job(self, job_id: str, task: asyncio.Task) -> bool:
        """
        Register a running job.

        Args:
            job_id: The job UUID
            task: The asyncio task running the job

        Returns:
            True if registered, False if limit reached
        """
        async with self._job_lock:
            if not self.can_start_job():
                return False
            self._running_jobs[job_id] = task
            print(f"[JobManager] Registered job {job_id}. Running: {self.running_count}")
            return True

    async def unregister_job(self, job_id: str):
        """
        Unregister a completed/failed job.

        Args:
            job_id: The job UUID
        """
        async with self._job_lock:
            if job_id in self._running_jobs:
                del self._running_jobs[job_id]
                print(f"[JobManager] Unregistered job {job_id}. Running: {self.running_count}")

    def is_job_running(self, job_id: str) -> bool:
        """Check if a specific job is currently running."""
        return job_id in self._running_jobs

    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a running job.

        Args:
            job_id: The job UUID

        Returns:
            True if cancelled, False if not found
        """
        async with self._job_lock:
            task = self._running_jobs.get(job_id)
            if task:
                task.cancel()
                del self._running_jobs[job_id]
                print(f"[JobManager] Cancelled job {job_id}")
                return True
            return False

    def get_status(self) -> Dict:
        """Get current job manager status."""
        return {
            "running_count": self.running_count,
            "max_concurrent": MAX_CONCURRENT_JOBS,
            "can_start": self.can_start_job(),
            "running_job_ids": list(self.running_job_ids),
            "recovered": self._recovered
        }

    async def recover_on_startup(self) -> Dict:
        """
        Recover from server restart by handling stale jobs.

        This should be called once on application startup.
        It will:
        1. Find jobs marked as 'running' in the database (stale from previous instance)
        2. Mark them as 'failed' with appropriate error message
        3. Process any queued jobs

        Returns:
            Dict with recovery statistics
        """
        if self._recovered:
            logger.info("[JobManager] Already recovered, skipping")
            return {"already_recovered": True}

        stats = {
            "stale_jobs_found": 0,
            "stale_jobs_marked_failed": 0,
            "queued_jobs_started": 0,
            "errors": []
        }

        try:
            # Import here to avoid circular imports
            from supabase_client import (
                get_stale_running_jobs,
                mark_stale_jobs_as_failed,
                get_pending_jobs
            )

            # Step 1: Find and mark stale running jobs as failed
            logger.info("[JobManager] Checking for stale running jobs...")
            stale_jobs = get_stale_running_jobs()
            stats["stale_jobs_found"] = len(stale_jobs)

            if stale_jobs:
                stale_job_ids = [job["id"] for job in stale_jobs]
                logger.warning(
                    f"[JobManager] Found {len(stale_jobs)} stale running jobs: {stale_job_ids}"
                )

                # Mark them as failed
                marked = mark_stale_jobs_as_failed(
                    stale_job_ids,
                    error_message="Job interrupted by server restart. Please retry."
                )
                stats["stale_jobs_marked_failed"] = marked
                logger.info(f"[JobManager] Marked {marked} stale jobs as failed")
            else:
                logger.info("[JobManager] No stale running jobs found")

            # Step 2: Process queued jobs
            logger.info("[JobManager] Checking for queued jobs...")
            pending_jobs = get_pending_jobs(limit=MAX_CONCURRENT_JOBS)

            if pending_jobs:
                logger.info(f"[JobManager] Found {len(pending_jobs)} queued jobs to process")

                # Import start_job here to avoid circular imports
                from .job_executor import start_job

                for job in pending_jobs:
                    if not self.can_start_job():
                        break

                    job_id = job.get("id")
                    parameters = job.get("parameters", {})

                    if job_id and not self.is_job_running(job_id):
                        started = await start_job(job_id, parameters)
                        if started:
                            stats["queued_jobs_started"] += 1
                            logger.info(f"[JobManager] Started queued job {job_id}")
            else:
                logger.info("[JobManager] No queued jobs to process")

            self._recovered = True
            logger.info(f"[JobManager] Recovery complete: {stats}")

        except ImportError as e:
            error_msg = f"Database client not available: {e}"
            logger.warning(f"[JobManager] {error_msg}")
            stats["errors"].append(error_msg)
            self._recovered = True  # Mark as recovered even if DB unavailable

        except Exception as e:
            error_msg = f"Recovery error: {e}"
            logger.error(f"[JobManager] {error_msg}")
            stats["errors"].append(error_msg)

        return stats


# Singleton instance
job_manager = JobManager()
