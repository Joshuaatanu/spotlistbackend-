/**
 * API Client with built-in retry logic and error handling.
 *
 * Features:
 * - Automatic retry on network errors and 503 responses
 * - Exponential backoff (1s, 2s, 4s)
 * - Request/response interceptors for error handling
 * - Configurable retry behavior
 */

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { API_BASE_URL } from '../config';

// Create axios instance with default configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 second default timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Configure retry behavior
axiosRetry(apiClient, {
    retries: 3, // Number of retry attempts
    retryDelay: (retryCount) => {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount - 1) * 1000;
        console.log(`[API] Retry attempt ${retryCount}, waiting ${delay}ms...`);
        return delay;
    },
    retryCondition: (error) => {
        // Retry on network errors
        if (axiosRetry.isNetworkError(error)) {
            console.log('[API] Network error detected, will retry');
            return true;
        }

        // Retry on specific status codes
        if (error.response) {
            const status = error.response.status;
            // Retry on 503 (Service Unavailable), 502 (Bad Gateway), 504 (Gateway Timeout)
            if ([502, 503, 504].includes(status)) {
                console.log(`[API] Server error ${status} detected, will retry`);
                return true;
            }
            // Retry on 429 (Too Many Requests) - rate limiting
            if (status === 429) {
                console.log('[API] Rate limited, will retry');
                return true;
            }
        }

        return false;
    },
    onRetry: (retryCount, error, requestConfig) => {
        console.log(`[API] Retrying request to ${requestConfig.url} (attempt ${retryCount})`);
    },
});

// Request interceptor for logging and modifications
apiClient.interceptors.request.use(
    (config) => {
        // Log outgoing requests in development
        if (import.meta.env.DEV) {
            console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
    },
    (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle specific error cases
        if (error.response) {
            const { status, data } = error.response;

            // Log error details
            console.error(`[API] Error ${status}:`, data?.detail || data?.message || error.message);

            // Handle circuit breaker open (from backend)
            if (status === 503 && data?.detail?.includes('circuit breaker')) {
                console.warn('[API] Circuit breaker is open, service temporarily unavailable');
            }

            // Handle authentication errors
            if (status === 401) {
                console.warn('[API] Authentication required');
                // Could redirect to login here if needed
            }

            // Handle validation errors
            if (status === 422) {
                console.warn('[API] Validation error:', data);
            }
        } else if (error.code === 'ECONNABORTED') {
            console.error('[API] Request timeout');
        } else if (!error.response) {
            console.error('[API] Network error - no response received');
        }

        return Promise.reject(error);
    }
);

/**
 * Fetch with automatic retry and error handling.
 *
 * @param {string} url - API endpoint
 * @param {object} options - Axios request options
 * @returns {Promise} - Response data
 */
export async function fetchWithRetry(url, options = {}) {
    try {
        const response = await apiClient(url, options);
        return response.data;
    } catch (error) {
        // Re-throw with more context
        const message = error.response?.data?.detail || error.message;
        const enhancedError = new Error(message);
        enhancedError.status = error.response?.status;
        enhancedError.originalError = error;
        throw enhancedError;
    }
}

/**
 * GET request with retry
 */
export async function get(url, params = {}, options = {}) {
    return fetchWithRetry(url, { method: 'GET', params, ...options });
}

/**
 * POST request with retry
 */
export async function post(url, data = {}, options = {}) {
    return fetchWithRetry(url, { method: 'POST', data, ...options });
}

/**
 * PUT request with retry
 */
export async function put(url, data = {}, options = {}) {
    return fetchWithRetry(url, { method: 'PUT', data, ...options });
}

/**
 * DELETE request with retry
 */
export async function del(url, options = {}) {
    return fetchWithRetry(url, { method: 'DELETE', ...options });
}

/**
 * Check API health status
 */
export async function checkHealth() {
    try {
        const response = await apiClient.get('/health', { timeout: 5000 });
        return { healthy: true, ...response.data };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            status: error.response?.status,
        };
    }
}

/**
 * Check detailed system health
 */
export async function checkDetailedHealth() {
    try {
        const response = await apiClient.get('/health/detailed', { timeout: 15000 });
        return response.data;
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
        };
    }
}

export default apiClient;
