/**
 * Jobs Store - Zustand store for background job state management
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const useJobsStore = create(
    devtools(
        (set, get) => ({
            // State
            jobs: [],
            loading: false,
            error: null,
            pollingInterval: null,

            // Actions
            fetchJobs: async (sessionId) => {
                try {
                    const response = await axios.get(`${API_BASE_URL}/jobs`, {
                        params: { session_id: sessionId }
                    });
                    set({
                        jobs: response.data.jobs || [],
                        error: null
                    });
                    return response.data;
                } catch (error) {
                    console.error('Error fetching jobs:', error);
                    set({ error: error.message });
                    return null;
                }
            },

            createJob: async (sessionId, jobData) => {
                set({ loading: true, error: null });
                try {
                    const response = await axios.post(`${API_BASE_URL}/jobs`, {
                        session_id: sessionId,
                        job_name: jobData.job_name,
                        job_type: jobData.job_type || 'spotlist',
                        parameters: jobData.parameters
                    });

                    // Add to local state immediately
                    set((state) => ({
                        jobs: [response.data, ...state.jobs],
                        loading: false
                    }));

                    return response.data;
                } catch (error) {
                    console.error('Error creating job:', error);
                    set({
                        loading: false,
                        error: error.response?.data?.detail || error.message
                    });
                    throw error;
                }
            },

            cancelJob: async (jobId, sessionId) => {
                try {
                    await axios.delete(`${API_BASE_URL}/jobs/${jobId}`, {
                        params: { session_id: sessionId }
                    });

                    // Remove from local state or update status
                    set((state) => ({
                        jobs: state.jobs.map(j =>
                            j.id === jobId
                                ? { ...j, status: 'failed', error_message: 'Cancelled by user' }
                                : j
                        )
                    }));

                    return true;
                } catch (error) {
                    console.error('Error cancelling job:', error);
                    set({ error: error.message });
                    throw error;
                }
            },

            retryJob: async (jobId, sessionId) => {
                try {
                    const response = await axios.post(`${API_BASE_URL}/jobs/${jobId}/retry`, null, {
                        params: { session_id: sessionId }
                    });

                    // Update local state
                    set((state) => ({
                        jobs: state.jobs.map(j =>
                            j.id === jobId
                                ? { ...j, status: 'pending', progress: 0, error_message: null }
                                : j
                        )
                    }));

                    return response.data;
                } catch (error) {
                    console.error('Error retrying job:', error);
                    set({ error: error.message });
                    throw error;
                }
            },

            deleteJob: async (jobId, sessionId) => {
                try {
                    await axios.delete(`${API_BASE_URL}/jobs/${jobId}`, {
                        params: { session_id: sessionId }
                    });

                    // Remove from local state
                    set((state) => ({
                        jobs: state.jobs.filter(j => j.id !== jobId)
                    }));

                    return true;
                } catch (error) {
                    console.error('Error deleting job:', error);
                    throw error;
                }
            },

            // Fetch a single job with full data (including result_data)
            getJobWithData: async (jobId, sessionId) => {
                try {
                    const response = await axios.get(`${API_BASE_URL}/jobs/${jobId}`, {
                        params: { session_id: sessionId }
                    });
                    return response.data;
                } catch (error) {
                    console.error('Error fetching job:', error);
                    throw error;
                }
            },

            // Polling for status updates
            startPolling: (sessionId, interval = 5000) => {
                const { pollingInterval } = get();
                if (pollingInterval) return; // Already polling

                // Initial fetch
                get().fetchJobs(sessionId);

                const poll = setInterval(() => {
                    get().fetchJobs(sessionId);
                }, interval);

                set({ pollingInterval: poll });
            },

            stopPolling: () => {
                const { pollingInterval } = get();
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    set({ pollingInterval: null });
                }
            },

            // Update a single job in state (for optimistic updates)
            updateJob: (jobId, updates) => {
                set((state) => ({
                    jobs: state.jobs.map(j =>
                        j.id === jobId ? { ...j, ...updates } : j
                    )
                }));
            },

            // Clear error
            clearError: () => set({ error: null }),

            // Computed getters (accessed via get())
            getRunningJobs: () => get().jobs.filter(j => j.status === 'running'),
            getPendingJobs: () => get().jobs.filter(j => ['pending', 'queued'].includes(j.status)),
            getCompletedJobs: () => get().jobs.filter(j => j.status === 'completed'),
            getFailedJobs: () => get().jobs.filter(j => j.status === 'failed'),
        }),
        { name: 'JobsStore' }
    )
);

// Selector hooks for common selections
export const useRunningJobs = () => useJobsStore(
    useShallow((state) => state.jobs.filter(j => j.status === 'running'))
);

export const usePendingJobs = () => useJobsStore(
    useShallow((state) => state.jobs.filter(j => ['pending', 'queued'].includes(j.status)))
);

export const useCompletedJobs = () => useJobsStore(
    useShallow((state) => state.jobs.filter(j => j.status === 'completed'))
);

export const useJobCounts = () => useJobsStore(
    useShallow((state) => ({
        running: state.jobs.filter(j => j.status === 'running').length,
        pending: state.jobs.filter(j => ['pending', 'queued'].includes(j.status)).length,
        completed: state.jobs.filter(j => j.status === 'completed').length,
        failed: state.jobs.filter(j => j.status === 'failed').length,
        total: state.jobs.length
    }))
);
