/**
 * Analysis Store - Zustand store for analysis workflow state
 * Centralizes state previously scattered across App.jsx (26+ variables)
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const initialFormState = {
    // Data source
    dataSource: 'file', // 'file' or 'aeos'
    file: null,

    // Company selection
    companyName: '',
    companyId: null,
    competitorCompanyName: '',
    competitorCompanyId: null,

    // Brand/Product selection
    brandIds: [],
    productIds: [],

    // Date range
    dateFrom: '',
    dateTo: '',

    // Filters
    channelFilter: '',
    reportType: 'spotlist',
    topTenSubtype: 'spots',
    filters: {
        weekdays: [],
        dayparts: [],
        epgCategories: [],
        profiles: [],
    },

    // Analysis config
    config: {
        creative_match_mode: 1,
        creative_match_text: '',
        time_window_minutes: 60,
    },
};

const initialUIState = {
    // UI state
    activeTab: 'analyze',
    showWizard: false,

    // Loading/Progress
    loading: false,
    progress: { percentage: 0, message: '', stage: 'info' },
    error: null,

    // Results
    results: null,
    collectedData: null,
};

export const useAnalysisStore = create(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                ...initialFormState,
                ...initialUIState,

                // ===== Form Actions =====

                setDataSource: (dataSource) => set({ dataSource }),
                setFile: (file) => set({ file }),

                // Company actions
                setCompanyName: (companyName) => set({ companyName }),
                setCompanyId: (companyId) => set((state) => ({
                    companyId,
                    // Reset brand/product when company changes
                    ...(companyId !== state.companyId ? { brandIds: [], productIds: [] } : {}),
                })),
                setCompetitorCompanyName: (competitorCompanyName) => set({ competitorCompanyName }),
                setCompetitorCompanyId: (competitorCompanyId) => set({ competitorCompanyId }),

                // Selection actions
                setBrandIds: (brandIds) => set({ brandIds }),
                setProductIds: (productIds) => set({ productIds }),

                // Date actions
                setDateFrom: (dateFrom) => set({ dateFrom }),
                setDateTo: (dateTo) => set({ dateTo }),

                // Filter actions
                setChannelFilter: (channelFilter) => set({ channelFilter }),
                setReportType: (reportType) => set({ reportType }),
                setTopTenSubtype: (topTenSubtype) => set({ topTenSubtype }),
                setFilters: (filters) => set({ filters }),

                // Config actions
                setConfig: (config) => set((state) => ({
                    config: typeof config === 'function' ? config(state.config) : config,
                })),

                // ===== UI Actions =====

                setActiveTab: (activeTab) => set({ activeTab }),
                setShowWizard: (showWizard) => set({ showWizard }),

                // ===== Analysis Actions =====

                startLoading: () => set({
                    loading: true,
                    error: null,
                    progress: { percentage: 0, message: 'Starting...', stage: 'info' },
                }),

                updateProgress: (progress) => set({ progress }),

                setError: (error) => set({
                    error,
                    loading: false,
                }),

                setResults: (results) => set({
                    results,
                    loading: false,
                    activeTab: 'results',
                    collectedData: null,
                }),

                setCollectedData: (collectedData) => set({
                    collectedData,
                    loading: false,
                }),

                stopLoading: () => set({ loading: false }),

                // ===== Reset Actions =====

                resetForm: () => set(initialFormState),

                resetAll: () => set({
                    ...initialFormState,
                    ...initialUIState,
                }),

                // ===== Computed/Derived =====

                // Check if form is valid for analysis
                isFormValid: () => {
                    const state = get();
                    const requiresCompany = ['spotlist', 'competitor', 'deepAnalysis', 'daypartAnalysis'].includes(state.reportType);

                    if (state.dataSource === 'file') {
                        return !!state.file;
                    }

                    return (!requiresCompany || state.companyName) && state.dateFrom && state.dateTo;
                },
            }),
            {
                name: 'analysis-store',
                // Only persist form config, not results or loading states
                partialize: (state) => ({
                    config: state.config,
                    dataSource: state.dataSource,
                }),
            }
        ),
        { name: 'AnalysisStore' }
    )
);

// Selector hooks for common selections
export const useFormState = () => useAnalysisStore((state) => ({
    dataSource: state.dataSource,
    file: state.file,
    companyName: state.companyName,
    companyId: state.companyId,
    competitorCompanyName: state.competitorCompanyName,
    competitorCompanyId: state.competitorCompanyId,
    brandIds: state.brandIds,
    productIds: state.productIds,
    dateFrom: state.dateFrom,
    dateTo: state.dateTo,
    channelFilter: state.channelFilter,
    reportType: state.reportType,
    topTenSubtype: state.topTenSubtype,
    filters: state.filters,
    config: state.config,
}));

export const useUIState = () => useAnalysisStore((state) => ({
    activeTab: state.activeTab,
    showWizard: state.showWizard,
    loading: state.loading,
    progress: state.progress,
    error: state.error,
}));

export const useResults = () => useAnalysisStore((state) => ({
    results: state.results,
    collectedData: state.collectedData,
}));
