/**
 * Dashboard Store - Zustand store for dashboard view state
 * Centralizes state from Dashboard.jsx (15+ variables)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const initialState = {
    // View state
    activeView: null, // null = auto-detect from data, or manual override

    // Filter state
    filters: null,
    filteredData: null,
    filtersExpanded: false,

    // Data enrichment
    enrichedData: null,
    enrichmentLoading: false,

    // UI dialogs
    showShortcuts: false,

    // Export state
    isExporting: false,
};

export const useDashboardStore = create(
    devtools(
        (set, get) => ({
            ...initialState,

            // ===== View Actions =====

            setActiveView: (activeView) => set({ activeView }),
            resetView: () => set({ activeView: null }),

            // ===== Filter Actions =====

            setFilters: (filters) => set({ filters }),
            setFilteredData: (filteredData) => set({ filteredData }),
            toggleFilters: () => set((state) => ({ filtersExpanded: !state.filtersExpanded })),
            setFiltersExpanded: (filtersExpanded) => set({ filtersExpanded }),
            clearFilters: () => set({ filters: null, filteredData: null }),

            // ===== Enrichment Actions =====

            setEnrichedData: (enrichedData) => set({ enrichedData }),
            setEnrichmentLoading: (enrichmentLoading) => set({ enrichmentLoading }),

            // ===== UI Actions =====

            setShowShortcuts: (showShortcuts) => set({ showShortcuts }),
            toggleShortcuts: () => set((state) => ({ showShortcuts: !state.showShortcuts })),

            // ===== Export Actions =====

            setIsExporting: (isExporting) => set({ isExporting }),

            // ===== Reset =====

            reset: () => set(initialState),
        }),
        { name: 'DashboardStore' }
    )
);

// Selector hooks for common selections
export const useViewState = () => useDashboardStore((state) => ({
    activeView: state.activeView,
    filtersExpanded: state.filtersExpanded,
    showShortcuts: state.showShortcuts,
}));

export const useFilterState = () => useDashboardStore((state) => ({
    filters: state.filters,
    filteredData: state.filteredData,
}));

export const useEnrichmentState = () => useDashboardStore((state) => ({
    enrichedData: state.enrichedData,
    enrichmentLoading: state.enrichmentLoading,
}));
