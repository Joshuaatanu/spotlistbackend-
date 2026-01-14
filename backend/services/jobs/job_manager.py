"""
Job Manager - Handles background job execution with concurrency control.

Uses in-memory tracking with database persistence for reliability.
No Redis/Celery required - uses asyncio tasks.
"""

import asyncio
from typing import Dict, Optional, Set
from datetime import datetime
import threading

MAX_CONCURRENT_JOBS = 3


class JobManager:
    """
    Singleton job manager for background task coordination.

    Tracks running jobs in memory and enforces concurrency limits.
    Jobs are persisted in the database for durability across restarts.
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
            "running_job_ids": list(self.running_job_ids)
        }


# Singleton instance
job_manager = JobManager()
