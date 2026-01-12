/**
 * Tests for useAnalysisHistory hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Need to mock the module before importing the hook
vi.mock('../config', () => ({
    API_BASE_URL: 'http://localhost:8000'
}));

describe('getSessionId', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('generates session ID on first call', async () => {
        // Import after mocks are set up
        const { getSessionId } = await import('../useAnalysisHistory');

        const sessionId = getSessionId();

        expect(sessionId).toBeTruthy();
        expect(sessionId).toMatch(/^sess_/);
    });

    it('returns same session ID on subsequent calls', async () => {
        const { getSessionId } = await import('../useAnalysisHistory');

        const sessionId1 = getSessionId();
        const sessionId2 = getSessionId();

        expect(sessionId1).toBe(sessionId2);
    });

    it('persists session ID in localStorage', async () => {
        const { getSessionId } = await import('../useAnalysisHistory');

        const sessionId = getSessionId();
        const storedId = localStorage.getItem('spotlist_session_id');

        expect(storedId).toBe(sessionId);
    });
});

describe('useAnalysisHistory', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();

        // Default mock responses
        axios.get.mockImplementation((url) => {
            if (url.includes('/db/health')) {
                return Promise.resolve({ data: { connected: false } });
            }
            return Promise.resolve({ data: [] });
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('returns initial state', async () => {
        const { useAnalysisHistory } = await import('../useAnalysisHistory');

        const { result } = renderHook(() => useAnalysisHistory());

        expect(result.current.history).toEqual([]);
        expect(result.current.sessionId).toBeTruthy();
        expect(typeof result.current.saveAnalysis).toBe('function');
        expect(typeof result.current.deleteAnalysis).toBe('function');
    });

    it('checks database health on mount', async () => {
        const { useAnalysisHistory } = await import('../useAnalysisHistory');

        renderHook(() => useAnalysisHistory());

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/db/health')
            );
        });
    });

    it('falls back to localStorage when database unavailable', async () => {
        // Set up localStorage with existing history
        const existingHistory = [
            { id: '123', metrics: { total_spots: 100 } }
        ];
        localStorage.setItem('spotlist_history', JSON.stringify(existingHistory));

        axios.get.mockResolvedValue({ data: { connected: false } });

        const { useAnalysisHistory } = await import('../useAnalysisHistory');
        const { result } = renderHook(() => useAnalysisHistory());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.history).toEqual(existingHistory);
    });

    it('saves analysis to localStorage when DB unavailable', async () => {
        axios.get.mockResolvedValue({ data: { connected: false } });

        const { useAnalysisHistory } = await import('../useAnalysisHistory');
        const { result } = renderHook(() => useAnalysisHistory());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        const analysisData = {
            fileName: 'test.csv',
            metrics: { total_spots: 100, double_spots: 10 },
            data: [{ channel: 'RTL' }],
        };

        await act(async () => {
            await result.current.saveAnalysis(analysisData);
        });

        expect(result.current.history).toHaveLength(1);
        expect(result.current.history[0].metrics.total_spots).toBe(100);

        // Verify localStorage was updated
        const stored = JSON.parse(localStorage.getItem('spotlist_history'));
        expect(stored).toHaveLength(1);
    });

    it('deletes analysis from history', async () => {
        const existingHistory = [
            { id: '123', metrics: { total_spots: 100 } },
            { id: '456', metrics: { total_spots: 200 } }
        ];
        localStorage.setItem('spotlist_history', JSON.stringify(existingHistory));

        axios.get.mockResolvedValue({ data: { connected: false } });

        const { useAnalysisHistory } = await import('../useAnalysisHistory');
        const { result } = renderHook(() => useAnalysisHistory());

        await waitFor(() => {
            expect(result.current.history).toHaveLength(2);
        });

        await act(async () => {
            await result.current.deleteAnalysis('123');
        });

        expect(result.current.history).toHaveLength(1);
        expect(result.current.history[0].id).toBe('456');
    });

    it('limits history to 10 items', async () => {
        axios.get.mockResolvedValue({ data: { connected: false } });

        const { useAnalysisHistory } = await import('../useAnalysisHistory');
        const { result } = renderHook(() => useAnalysisHistory());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Add 12 analyses
        for (let i = 0; i < 12; i++) {
            await act(async () => {
                await result.current.saveAnalysis({
                    fileName: `test${i}.csv`,
                    metrics: { total_spots: i },
                });
            });
        }

        // Should be limited to 10
        expect(result.current.history.length).toBeLessThanOrEqual(10);
    });
});

describe('useConfiguration', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();

        axios.get.mockResolvedValue({ data: { connected: false } });
    });

    it('returns default config when no saved config exists', async () => {
        const { useConfiguration } = await import('../useAnalysisHistory');

        const defaultConfig = { theme: 'light', timeWindow: 60 };
        const { result } = renderHook(() => useConfiguration(defaultConfig));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.config).toEqual(expect.objectContaining(defaultConfig));
    });

    it('loads config from localStorage', async () => {
        const savedConfig = { theme: 'dark', timeWindow: 120 };
        localStorage.setItem('spotlistConfig', JSON.stringify(savedConfig));

        const { useConfiguration } = await import('../useAnalysisHistory');
        const { result } = renderHook(() => useConfiguration({ theme: 'light' }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.config.theme).toBe('dark');
        expect(result.current.config.timeWindow).toBe(120);
    });

    it('saves config to localStorage when updated', async () => {
        const { useConfiguration } = await import('../useAnalysisHistory');
        const { result } = renderHook(() => useConfiguration({ theme: 'light' }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        act(() => {
            result.current.setConfig({ theme: 'dark' });
        });

        expect(result.current.config.theme).toBe('dark');

        const stored = JSON.parse(localStorage.getItem('spotlistConfig'));
        expect(stored.theme).toBe('dark');
    });
});
