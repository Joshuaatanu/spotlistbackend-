/**
 * useAeosForm - Custom hook for AEOS data fetch form logic
 * Extracts validation, date utilities, and form state from AeosDataFetchOptimized
 */

import { useMemo, useCallback, useEffect } from 'react';

// Report-specific parameter configurations
export const REPORT_CONFIGS = {
    spotlist: {
        name: 'Spotlist Report',
        requiredParams: ['companyName', 'dateFrom', 'dateTo'],
        optionalParams: ['channelFilter', 'weekdays', 'dayparts', 'epgCategories'],
        description: 'Detailed spot-by-spot analysis with double booking detection',
        tips: [
            'Company name is required for spotlist filtering',
            'Use channel filter to limit to specific stations',
            'Weekday/daypart filters help narrow down analysis'
        ],
        showCompanySelector: true,
        showChannelFilter: true,
        showAdvancedFilters: true,
        defaultDateRange: 7
    },
    topTen: {
        name: 'Top Ten Report',
        requiredParams: ['dateFrom', 'dateTo'],
        optionalParams: ['channelFilter', 'industries', 'categories'],
        description: 'Top 10 rankings by category (ads, events, or channels)',
        tips: [
            '⚠️ API limitation: Only supports "Yesterday" or "Last 7 days" periods',
            'Date range will be automatically converted to closest supported period',
            'Select subtype: Spots (ads by XRP), Events (by Share), or Channels (by Share)',
            'Company filter is not available for Top Ten reports'
        ],
        showCompanySelector: false,
        showChannelFilter: false,
        showAdvancedFilters: false,
        defaultDateRange: 7,
        showTopTenSubtype: true,
        showPeriodInfo: true
    },
    reachFrequency: {
        name: 'Reach & Frequency',
        requiredParams: ['dateFrom', 'dateTo', 'channelFilter'],
        optionalParams: ['profiles', 'dayparts'],
        description: 'Channel reach and audience share analysis (per-channel metrics)',
        tips: [
            'Analyzes channel performance, not advertiser-specific data',
            'At least one channel must be specified',
            'Returns: reach %, share, AMR%, ATS',
            'Profile/daypart filters available for demographic targeting'
        ],
        showCompanySelector: false,
        showChannelFilter: true,
        channelFilterRequired: true,
        showAdvancedFilters: true,
        defaultDateRange: 14
    },
    deepAnalysis: {
        name: 'Deep Analysis (KPIs)',
        requiredParams: ['companyName', 'dateFrom', 'dateTo'],
        optionalParams: ['channelFilter'],
        description: 'In-depth KPI analysis including AMR%, reach%, share, and more',
        tips: [
            'Company name is required for KPI analysis',
            'Best used with 1-4 week date ranges',
            'Provides channel/event level performance metrics'
        ],
        showCompanySelector: true,
        showChannelFilter: true,
        showAdvancedFilters: false,
        defaultDateRange: 14
    },
    daypartAnalysis: {
        name: 'Daypart Analysis',
        requiredParams: ['companyName', 'dateFrom', 'dateTo'],
        optionalParams: ['channelFilter', 'dayparts'],
        description: 'Performance breakdown by time-of-day segments',
        tips: [
            'Company name is required',
            'Analyzes advertising performance across different dayparts',
            'Use daypart filters to focus on specific time segments'
        ],
        showCompanySelector: true,
        showChannelFilter: true,
        showAdvancedFilters: true,
        defaultDateRange: 30
    },
    competitor: {
        name: 'Competitor Analysis',
        requiredParams: ['companyName', 'dateFrom', 'dateTo'],
        optionalParams: ['channelFilter', 'brandIds'],
        description: 'Compare TV advertising between brands (e.g., eBay vs Amazon)',
        tips: [
            'Select a company to analyze their brand competition',
            'After analysis, switch to Competitor view to compare brands',
            'Best used with spotlist data that includes multiple brands'
        ],
        showCompanySelector: true,
        showChannelFilter: true,
        showAdvancedFilters: true,
        showBrandSelector: true,
        defaultDateRange: 30
    }
};

// Date utility functions
export const getDefaultDateTo = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

export const getDefaultDateFrom = (daysAgo) => {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - daysAgo);
    return pastDate.toISOString().split('T')[0];
};

/**
 * Custom hook for AEOS form validation and utilities
 * @param {Object} options - Form field values
 * @returns {Object} Validation state and utility functions
 */
export function useAeosForm({
    companyName,
    dateFrom,
    dateTo,
    channelFilter,
    reportType,
    setDateFrom,
    setDateTo,
}) {
    const reportConfig = REPORT_CONFIGS[reportType] || REPORT_CONFIGS.spotlist;

    // Initialize dates on mount if not set
    useEffect(() => {
        if (!dateFrom && setDateFrom) {
            setDateFrom(getDefaultDateFrom(reportConfig.defaultDateRange));
        }
        if (!dateTo && setDateTo) {
            setDateTo(getDefaultDateTo());
        }
    }, []);

    // Form validation
    const validation = useMemo(() => {
        const errors = [];
        const warnings = [];

        // Required field validation
        if (reportConfig.requiredParams.includes('companyName') && !companyName?.trim()) {
            errors.push('Company name is required for this report type');
        }
        if (reportConfig.requiredParams.includes('dateFrom') && !dateFrom) {
            errors.push('Start date is required');
        }
        if (reportConfig.requiredParams.includes('dateTo') && !dateTo) {
            errors.push('End date is required');
        }
        if (reportConfig.channelFilterRequired && !channelFilter?.trim()) {
            errors.push('Channel filter is required for this report type');
        }

        // Date range validation
        if (dateFrom && dateTo) {
            const fromDate = new Date(dateFrom);
            const toDate = new Date(dateTo);
            const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

            if (daysDiff < 0) {
                errors.push('End date must be after start date');
            } else if (daysDiff > 90) {
                warnings.push('Date range exceeds 90 days - report may take longer to generate');
            } else if (daysDiff > 365) {
                errors.push('Date range cannot exceed 365 days');
            }
        }

        // Channel-specific warnings
        if (reportType === 'reachFrequency' && channelFilter && channelFilter.split(',').length > 5) {
            warnings.push('Reach & Frequency works best with 1-5 channels');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            canProceed: errors.length === 0
        };
    }, [companyName, dateFrom, dateTo, channelFilter, reportType, reportConfig]);

    // Date preset helper
    const applyDatePreset = useCallback((days) => {
        if (setDateTo) setDateTo(getDefaultDateTo());
        if (setDateFrom) setDateFrom(getDefaultDateFrom(days));
    }, [setDateFrom, setDateTo]);

    // Calculate date range info for display
    const dateRangeInfo = useMemo(() => {
        if (!dateFrom || !dateTo) return null;

        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let periodInfo = null;
        if (reportConfig.showPeriodInfo) {
            const toDateOnly = new Date(dateTo);
            toDateOnly.setHours(0, 0, 0, 0);

            if (toDateOnly.getTime() === yesterday.getTime() && daysDiff === 0) {
                periodInfo = { period: 'Yesterday', variant: 'success' };
            } else if (daysDiff <= 6 && daysDiff >= 0) {
                periodInfo = { period: 'Last 7 days', variant: 'success' };
            } else {
                periodInfo = { period: 'Will use "Last 7 days"', variant: 'warning' };
            }
        }

        return {
            daysDiff,
            daysSelected: daysDiff >= 0 ? daysDiff + 1 : null,
            isValid: daysDiff >= 0,
            periodInfo
        };
    }, [dateFrom, dateTo, reportConfig.showPeriodInfo]);

    // Summary text for display
    const formSummary = useMemo(() => {
        const parts = [];
        if (companyName) parts.push(`Company: ${companyName}`);
        if (dateFrom && dateTo) parts.push(`${dateFrom} to ${dateTo}`);
        if (channelFilter) parts.push(`Channels: ${channelFilter}`);
        return parts.join(' • ');
    }, [companyName, dateFrom, dateTo, channelFilter]);

    return {
        reportConfig,
        validation,
        applyDatePreset,
        dateRangeInfo,
        formSummary,
        // Date utilities
        getDefaultDateTo,
        getDefaultDateFrom,
    };
}

export default useAeosForm;
