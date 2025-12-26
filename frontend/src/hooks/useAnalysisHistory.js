import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Generate or retrieve a session ID for anonymous user identification.
 * Stored in localStorage to persist across page refreshes.
 */
const getSessionId = () => {
    const storageKey = 'spotlist_session_id';
    let sessionId = localStorage.getItem(storageKey);

    if (!sessionId) {
        // Generate a simple UUID-like identifier
        sessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(storageKey, sessionId);
    }

    return sessionId;
};

/**
 * Custom hook for managing analysis history with database persistence.
 * Falls back to local state if database is unavailable.
 */
export function useAnalysisHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dbAvailable, setDbAvailable] = useState(null);

    const sessionId = getSessionId();

    // Check database availability on mount
    useEffect(() => {
        const checkDb = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/db/health`);
                setDbAvailable(response.data?.connected === true);
            } catch (err) {
                console.log('Database not available, using local storage fallback');
                setDbAvailable(false);
            }
        };
        checkDb();
    }, []);

    // Fetch history from database or localStorage
    useEffect(() => {
        const fetchHistory = async () => {
            if (dbAvailable === null) return; // Wait for db check

            setLoading(true);
            try {
                if (dbAvailable) {
                    // Fetch from API
                    const response = await axios.get(`${API_BASE_URL}/analyses`, {
                        params: { session_id: sessionId, limit: 10 }
                    });
                    setHistory(response.data || []);
                } else {
                    // Fallback to localStorage
                    const stored = localStorage.getItem('spotlist_history');
                    setHistory(stored ? JSON.parse(stored) : []);
                }
            } catch (err) {
                console.error('Error fetching history:', err);
                setError(err.message);
                // Fallback to localStorage
                const stored = localStorage.getItem('spotlist_history');
                setHistory(stored ? JSON.parse(stored) : []);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [dbAvailable, sessionId]);

    /**
     * Save a new analysis to the database.
     * @param {Object} analysis - The analysis result to save
     * @returns {Object} The saved analysis with database ID
     */
    const saveAnalysis = useCallback(async (analysis) => {
        const analysisToSave = {
            ...analysis,
            id: analysis.id || Date.now(),
            timestamp: analysis.timestamp || new Date().toISOString(),
        };

        if (dbAvailable) {
            try {
                const response = await axios.post(`${API_BASE_URL}/analyses`, {
                    session_id: sessionId,
                    file_name: analysis.fileName || 'Unknown',
                    metrics: analysis.metrics || {},
                    // Store spotlist data (limit to 5000 records for large datasets)
                    spotlist_data: analysis.data?.slice(0, 5000) || null,
                    metadata: {
                        report_type: analysis.metadata?.report_type || 'spotlist',
                        timestamp: analysisToSave.timestamp,
                        // Store window_summaries and field_map for full dashboard rendering
                        window_summaries: analysis.window_summaries || null,
                        field_map: analysis.field_map || null,
                        ...analysis.metadata
                    }
                });

                // Update with database ID
                analysisToSave.dbId = response.data?.id;
            } catch (err) {
                console.error('Error saving to database:', err);
                // Continue with local storage fallback
            }
        }

        // Update local state
        setHistory(prev => {
            const updated = [analysisToSave, ...prev].slice(0, 10);
            // Also save to localStorage as backup
            localStorage.setItem('spotlist_history', JSON.stringify(updated));
            return updated;
        });

        return analysisToSave;
    }, [dbAvailable, sessionId]);

    /**
     * Delete an analysis from history.
     * @param {string} id - The analysis ID to delete
     */
    const deleteAnalysis = useCallback(async (id) => {
        // Find the analysis to get its database ID
        const analysis = history.find(a => a.id === id || a.dbId === id);

        if (dbAvailable && analysis?.dbId) {
            try {
                await axios.delete(`${API_BASE_URL}/analyses/${analysis.dbId}`, {
                    params: { session_id: sessionId }
                });
            } catch (err) {
                console.error('Error deleting from database:', err);
            }
        }

        // Update local state
        setHistory(prev => {
            const updated = prev.filter(a => a.id !== id && a.dbId !== id);
            localStorage.setItem('spotlist_history', JSON.stringify(updated));
            return updated;
        });
    }, [dbAvailable, sessionId, history]);

    return {
        history,
        loading,
        error,
        dbAvailable,
        sessionId,
        saveAnalysis,
        deleteAnalysis,
        setHistory
    };
}

/**
 * Custom hook for managing user configuration with database persistence.
 */
export function useConfiguration(defaultConfig = {}) {
    const [config, setConfigState] = useState(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [dbAvailable, setDbAvailable] = useState(null);

    const sessionId = getSessionId();

    // Check database and fetch saved config on mount
    useEffect(() => {
        const loadConfig = async () => {
            try {
                // Check database availability
                const healthResponse = await axios.get(`${API_BASE_URL}/db/health`);
                const isDbAvailable = healthResponse.data?.connected === true;
                setDbAvailable(isDbAvailable);

                if (isDbAvailable) {
                    // Try to fetch from database
                    const configResponse = await axios.get(`${API_BASE_URL}/configurations/${sessionId}`);
                    if (configResponse.data?.config) {
                        setConfigState(prev => ({ ...prev, ...configResponse.data.config }));
                        setLoading(false);
                        return;
                    }
                }
            } catch (err) {
                console.log('Database config not available');
                setDbAvailable(false);
            }

            // Fallback to localStorage
            const stored = localStorage.getItem('spotlistConfig');
            if (stored) {
                try {
                    setConfigState(prev => ({ ...prev, ...JSON.parse(stored) }));
                } catch (e) {
                    console.error('Error parsing stored config:', e);
                }
            }
            setLoading(false);
        };

        loadConfig();
    }, [sessionId]);

    /**
     * Update configuration and save to database/localStorage.
     */
    const setConfig = useCallback((newConfig) => {
        const updatedConfig = typeof newConfig === 'function'
            ? newConfig(config)
            : newConfig;

        setConfigState(updatedConfig);

        // Save to localStorage immediately
        localStorage.setItem('spotlistConfig', JSON.stringify(updatedConfig));

        // Save to database if available (non-blocking)
        if (dbAvailable) {
            axios.post(`${API_BASE_URL}/configurations`, {
                session_id: sessionId,
                config: updatedConfig
            }).catch(err => {
                console.error('Error saving config to database:', err);
            });
        }
    }, [config, dbAvailable, sessionId]);

    return {
        config,
        setConfig,
        loading,
        dbAvailable,
        sessionId
    };
}

export { getSessionId };
