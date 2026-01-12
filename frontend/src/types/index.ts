/**
 * Type definitions for the Spotlist Checker Frontend
 */

// ============ API Types ============

export interface AnalysisMetadata {
    report_type: string;
    company_name?: string;
    competitor_company_name?: string;
    date_from?: string;
    date_to?: string;
    channel_filter?: string;
    timestamp?: string;
}

export interface SpotData {
    timestamp: string;
    cost_numeric?: number;
    program_original?: string;
    program_norm?: string;
    channel_display?: string;
    creative_norm?: string;
    Channel?: string;
    Spend?: number;
    Claim?: string;
    'EPG name'?: string;
    [key: string]: unknown;
}

export interface AnalysisMetrics {
    total_spots: number;
    double_bookings_count: number;
    double_spend: number;
    total_spend: number;
    double_booking_percentage: number;
    potential_savings: number;
}

export interface WindowSummary {
    window_start: string;
    window_end: string;
    spots: SpotData[];
    spend: number;
}

export interface AnalysisResult {
    metrics: AnalysisMetrics;
    window_summaries: WindowSummary[];
    data: SpotData[];
    field_map?: Record<string, string>;
    metadata?: AnalysisMetadata;
}

export interface HistoryItem {
    id: string;
    company_name: string;
    report_type: string;
    timestamp: string;
    metrics?: AnalysisMetrics;
}

// ============ Form Types ============

export interface ReportConfig {
    name: string;
    requiredParams: string[];
    optionalParams: string[];
    description: string;
    tips: string[];
    showCompanySelector: boolean;
    showChannelFilter: boolean;
    showAdvancedFilters: boolean;
    defaultDateRange: number;
    channelFilterRequired?: boolean;
    showTopTenSubtype?: boolean;
    showPeriodInfo?: boolean;
    showBrandSelector?: boolean;
}

export type ReportType =
    | 'spotlist'
    | 'topTen'
    | 'reachFrequency'
    | 'deepAnalysis'
    | 'daypartAnalysis'
    | 'competitor';

export type TopTenSubtype = 'spots' | 'events' | 'channel';

export interface FilterConfig {
    weekdays: string[];
    dayparts: string[];
    epgCategories: string[];
    profiles: string[];
}

export interface AnalysisConfig {
    creative_match_mode: number;
    creative_match_text: string;
    time_window_minutes: number;
}

export interface FormValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    canProceed: boolean;
}

export interface DateRangeInfo {
    daysDiff: number;
    daysSelected: number | null;
    isValid: boolean;
    periodInfo: {
        period: string;
        variant: 'success' | 'warning';
    } | null;
}

// ============ Store Types ============

export interface AnalysisStoreState {
    // Data source
    dataSource: 'file' | 'aeos';
    file: File | null;

    // Company selection
    companyName: string;
    companyId: number | null;
    competitorCompanyName: string;
    competitorCompanyId: number | null;

    // Selection
    brandIds: number[];
    productIds: number[];

    // Date range
    dateFrom: string;
    dateTo: string;

    // Filters
    channelFilter: string;
    reportType: ReportType;
    topTenSubtype: TopTenSubtype;
    filters: FilterConfig;
    config: AnalysisConfig;

    // UI
    activeTab: string;
    showWizard: boolean;
    loading: boolean;
    progress: { percentage: number; message: string; stage: string };
    error: string | null;

    // Results
    results: AnalysisResult | null;
    collectedData: SpotData[] | null;
}

export interface DashboardStoreState {
    activeView: string | null;
    filters: Record<string, unknown> | null;
    filteredData: SpotData[] | null;
    filtersExpanded: boolean;
    enrichedData: SpotData[] | null;
    enrichmentLoading: boolean;
    showShortcuts: boolean;
    isExporting: boolean;
}

// ============ Component Props ============

export interface DashboardProps {
    data: AnalysisResult | null;
}

export interface DoubleBookingsTableProps {
    data: SpotData[];
    fieldMap?: Record<string, string>;
}

export interface MetricsCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    description?: string;
    trend?: {
        value: number;
        direction: 'up' | 'down';
    };
}

// ============ Hook Types ============

export interface UseAnalysisHistoryReturn {
    history: HistoryItem[];
    saveAnalysis: (data: AnalysisResult) => Promise<void>;
    deleteAnalysis: (id: string) => Promise<void>;
    dbAvailable: boolean;
}

export interface UseAeosFormReturn {
    reportConfig: ReportConfig;
    validation: FormValidation;
    applyDatePreset: (days: number) => void;
    dateRangeInfo: DateRangeInfo | null;
    formSummary: string;
    getDefaultDateTo: () => string;
    getDefaultDateFrom: (daysAgo: number) => string;
}
