/**
 * Hook for managing background jobs with polling and notifications
 */

import { useEffect, useCallback, useRef } from 'react';
import { useJobsStore, useJobCounts } from '../stores/jobsStore';
import { getSessionId } from './useAnalysisHistory';
import { useToast } from './useToast';
import {
    sendJobNotification,
    sendJobFailedNotification,
    requestNotificationPermission,
    notificationsEnabled
} from '../utils/notifications';

/**
 * Custom hook for managing background data collection jobs.
 * Handles polling, notifications, and job lifecycle.
 */
export function useBackgroundJobs() {
    const sessionId = getSessionId();
    const { toast } = useToast();
    const prevJobStatesRef = useRef(new Map());

    const {
        jobs,
        loading,
        error,
        fetchJobs,
        createJob,
        cancelJob,
        retryJob,
        deleteJob,
        getJobWithData,
        startPolling,
        stopPolling,
        clearError,
    } = useJobsStore();

    const counts = useJobCounts();

    // Start polling on mount
    useEffect(() => {
        startPolling(sessionId, 5000); // Poll every 5 seconds
        return () => stopPolling();
    }, [sessionId, startPolling, stopPolling]);

    // Watch for job status changes and show notifications
    useEffect(() => {
        const prevStates = prevJobStatesRef.current;

        jobs.forEach(job => {
            const prevStatus = prevStates.get(job.id);

            // Skip if this is a new job we haven't seen before (initial load)
            if (prevStatus === undefined) {
                prevStates.set(job.id, job.status);
                return;
            }

            // Check for status changes
            if (prevStatus !== job.status) {
                if (job.status === 'completed' && prevStatus === 'running') {
                    // Job just completed
                    toast({
                        title: 'Job Complete',
                        description: `"${job.job_name}" finished collecting ${job.result_metadata?.total_spots?.toLocaleString() || 0} spots.`,
                        variant: 'success',
                    });

                    // Send browser notification
                    sendJobNotification(job);
                } else if (job.status === 'failed' && prevStatus === 'running') {
                    // Job failed
                    toast({
                        title: 'Job Failed',
                        description: `"${job.job_name}" failed: ${job.error_message || 'Unknown error'}`,
                        variant: 'destructive',
                    });

                    sendJobFailedNotification(job);
                } else if (job.status === 'running' && ['pending', 'queued'].includes(prevStatus)) {
                    // Job started
                    toast({
                        title: 'Job Started',
                        description: `"${job.job_name}" is now running.`,
                        variant: 'default',
                    });
                }

                prevStates.set(job.id, job.status);
            }
        });

        // Clean up old job IDs
        const currentIds = new Set(jobs.map(j => j.id));
        for (const id of prevStates.keys()) {
            if (!currentIds.has(id)) {
                prevStates.delete(id);
            }
        }
    }, [jobs, toast]);

    /**
     * Queue a new background job
     * @param {Object} jobConfig - Job configuration
     * @param {string} jobConfig.job_name - User-friendly name
     * @param {string} jobConfig.job_type - Type of job (spotlist, topTen, etc.)
     * @param {Object} jobConfig.parameters - Job parameters
     */
    const queueJob = useCallback(async (jobConfig) => {
        // Request notification permission on first job
        if (!notificationsEnabled()) {
            await requestNotificationPermission();
        }

        try {
            const job = await createJob(sessionId, jobConfig);

            if (counts.running >= 3) {
                toast({
                    title: 'Job Queued',
                    description: `"${jobConfig.job_name}" has been queued. It will start when a slot opens.`,
                    variant: 'default',
                });
            } else {
                toast({
                    title: 'Job Created',
                    description: `"${jobConfig.job_name}" is starting...`,
                    variant: 'default',
                });
            }

            return job;
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to create job: ${error.message}`,
                variant: 'destructive',
            });
            throw error;
        }
    }, [sessionId, createJob, counts.running, toast]);

    /**
     * Cancel a running or pending job
     */
    const handleCancelJob = useCallback(async (jobId) => {
        try {
            await cancelJob(jobId, sessionId);
            toast({
                title: 'Job Cancelled',
                description: 'The job has been cancelled.',
                variant: 'default',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to cancel job: ${error.message}`,
                variant: 'destructive',
            });
        }
    }, [sessionId, cancelJob, toast]);

    /**
     * Retry a failed job
     */
    const handleRetryJob = useCallback(async (jobId) => {
        try {
            await retryJob(jobId, sessionId);
            toast({
                title: 'Job Retry',
                description: 'The job has been queued for retry.',
                variant: 'default',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to retry job: ${error.message}`,
                variant: 'destructive',
            });
        }
    }, [sessionId, retryJob, toast]);

    /**
     * Delete a completed or failed job
     */
    const handleDeleteJob = useCallback(async (jobId) => {
        try {
            await deleteJob(jobId, sessionId);
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to delete job: ${error.message}`,
                variant: 'destructive',
            });
        }
    }, [sessionId, deleteJob, toast]);

    /**
     * Fetch a job with full data (including result_data)
     */
    const fetchJobWithData = useCallback(async (jobId) => {
        try {
            return await getJobWithData(jobId, sessionId);
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to fetch job data: ${error.message}`,
                variant: 'destructive',
            });
            throw error;
        }
    }, [sessionId, getJobWithData, toast]);

    return {
        // State
        jobs,
        loading,
        error,
        ...counts,

        // Actions
        queueJob,
        cancelJob: handleCancelJob,
        retryJob: handleRetryJob,
        deleteJob: handleDeleteJob,
        refreshJobs: () => fetchJobs(sessionId),
        fetchJobWithData,
        clearError,

        // Helpers
        sessionId,
        hasRunningJobs: counts.running > 0,
        hasPendingJobs: counts.pending > 0,
    };
}

export default useBackgroundJobs;
