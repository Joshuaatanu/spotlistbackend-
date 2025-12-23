import { useEffect, useMemo, useState } from 'react';
import { Database, Calendar, Building2, Info, AlertCircle, CheckCircle2, BarChart3 } from 'lucide-react';
import ReportTypeSelector from './ReportTypeSelector';
import EnhancedFilters from './EnhancedFilters';
import CompanySelector from './CompanySelector';
import BrandSelector from './BrandSelector';
import ProductSelector from './ProductSelector';

// Report-specific parameter configurations
const REPORT_CONFIGS = {
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
        defaultDateRange: 7 // days
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
        showCompanySelector: false, // Not supported by Top Ten API
        showChannelFilter: false, // Not supported by Top Ten API
        showAdvancedFilters: false,
        defaultDateRange: 7, // Changed to 7 days to match API limitation
        showTopTenSubtype: true, // Show subtype selector
        showPeriodInfo: true // Show period limitation info
    },
    reachFrequency: {
        name: 'Reach & Frequency',
        requiredParams: ['companyName', 'dateFrom', 'dateTo', 'channelFilter'],
        optionalParams: ['profiles', 'dayparts'],
        description: 'Audience reach and frequency distribution analysis',
        tips: [
            'Company name is required for reach analysis',
            'At least one channel must be specified',
            'Profile selection targets specific demographics'
        ],
        showCompanySelector: true,
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
    }
};

export default function AeosDataFetchOptimized({
    companyName,
    setCompanyName,
    companyId,
    setCompanyId,
    brandIds,
    setBrandIds,
    productIds,
    setProductIds,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    channelFilter,
    setChannelFilter,
    reportType,
    setReportType,
    filters,
    setFilters,
    topTenSubtype,
    setTopTenSubtype
}) {
    const [showHelp, setShowHelp] = useState(false);

    // Get current report configuration
    const reportConfig = REPORT_CONFIGS[reportType] || REPORT_CONFIGS.spotlist;

    // Helper functions for date handling
    const getDefaultDateTo = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    const getDefaultDateFrom = (daysAgo) => {
        const today = new Date();
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - daysAgo);
        return pastDate.toISOString().split('T')[0];
    };

    // Initialize dates based on report type
    useEffect(() => {
        if (!dateFrom) {
            setDateFrom(getDefaultDateFrom(reportConfig.defaultDateRange));
        }
        if (!dateTo) {
            setDateTo(getDefaultDateTo());
        }
    }, []);

    // Update date range when report type changes (optional - can be removed if not desired)
    useEffect(() => {
        if (reportType) {
            // Optionally reset dates when changing report types
            // Commented out to preserve user selections
            // setDateFrom(getDefaultDateFrom(reportConfig.defaultDateRange));
            // setDateTo(getDefaultDateTo());
        }
    }, [reportType]);

    // Validation state
    const validation = useMemo(() => {
        const errors = [];
        const warnings = [];

        // Check required parameters
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

        // Check date range validity
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

        // Report-specific warnings
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

    // Quick date range presets
    const applyDatePreset = (days) => {
        setDateTo(getDefaultDateTo());
        setDateFrom(getDefaultDateFrom(days));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
            {/* Report Type Selector - Moved to top for better UX */}
            <div>
                <ReportTypeSelector
                    reportType={reportType || 'spotlist'}
                    setReportType={setReportType || (() => {})}
                />

                {/* Report Description & Help */}
                <div style={{
                    marginTop: 'var(--space-s)',
                    padding: 'var(--space-s) var(--space-m)',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.15)',
                    borderRadius: '6px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-s)' }}>
                        <Info size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ flex: 1 }}>
                            <p style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--text-secondary)',
                                margin: 0
                            }}>
                                {reportConfig.description}
                            </p>
                            {showHelp && (
                                <ul style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-tertiary)',
                                    margin: 'var(--space-xs) 0 0 0',
                                    paddingLeft: 'var(--space-m)',
                                    listStyle: 'disc'
                                }}>
                                    {reportConfig.tips.map((tip, i) => (
                                        <li key={i} style={{ marginTop: '4px' }}>{tip}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowHelp(!showHelp)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-primary)',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 500,
                                padding: 0
                            }}
                        >
                            {showHelp ? 'Hide' : 'Tips'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Ten Subtype Selector - Only for Top Ten reports */}
            {reportConfig.showTopTenSubtype && (
                <div>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-s)',
                        marginBottom: 'var(--space-s)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 500,
                        color: 'var(--text-primary)'
                    }}>
                        <BarChart3 size={16} />
                        Top Ten Type
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-s)' }}>
                        {[
                            { value: 'spots', label: 'Top Spots', desc: 'Top 10 ads by XRP' },
                            { value: 'events', label: 'Top Events', desc: 'Top 10 events by Share' },
                            { value: 'channel', label: 'Top Channels', desc: 'Top 10 channels by Share' }
                        ].map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setTopTenSubtype(option.value)}
                                style={{
                                    padding: 'var(--space-m)',
                                    border: `2px solid ${topTenSubtype === option.value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                    borderRadius: '8px',
                                    backgroundColor: topTenSubtype === option.value ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (topTenSubtype !== option.value) {
                                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                        e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (topTenSubtype !== option.value) {
                                        e.currentTarget.style.borderColor = 'var(--border-color)';
                                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                    }
                                }}
                            >
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{option.label}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                    {option.desc}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Company Selector - Conditional based on report type */}
            {reportConfig.showCompanySelector && (
                <div>
                    <CompanySelector
                        companyName={companyName}
                        setCompanyName={setCompanyName}
                        setCompanyId={setCompanyId}
                    />
                    {reportConfig.requiredParams.includes('companyName') && (
                        <p style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-tertiary)',
                            marginTop: 'var(--space-xs)',
                            margin: 'var(--space-xs) 0 0 0'
                        }}>
                            * Required for this report type
                        </p>
                    )}
                </div>
            )}

            {/* Brand Selector - Only for spotlist reports */}
            {reportType === 'spotlist' && companyId && (
                <div style={{ marginTop: 'var(--space-m)' }}>
                    <BrandSelector
                        companyId={companyId}
                        brandIds={brandIds}
                        setBrandIds={setBrandIds}
                    />
                </div>
            )}

            {/* Product Selector - Only for spotlist reports */}
            {/* Show if brands are selected OR if company is selected (to show all products) */}
            {reportType === 'spotlist' && ((brandIds && brandIds.length > 0) || companyId) && (
                <div style={{ marginTop: 'var(--space-m)' }}>
                    <ProductSelector
                        brandIds={brandIds}
                        companyId={companyId}
                        productIds={productIds}
                        setProductIds={setProductIds}
                    />
                </div>
            )}

            {/* Date Range with Quick Presets */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-s)' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-s)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 500,
                        color: 'var(--text-primary)'
                    }}>
                        <Calendar size={16} />
                        {reportConfig.showPeriodInfo ? 'Date Range (Period Selection)' : 'Date Range'}
                    </label>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                        {[7, 14, 30, 90].map(days => (
                            <button
                                key={days}
                                type="button"
                                onClick={() => applyDatePreset(days)}
                                style={{
                                    padding: '4px 8px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 400,
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }}
                            >
                                {days}d
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-m)' }}>
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: 'var(--space-xs)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-secondary)'
                        }}>
                            From
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            max={dateTo || getDefaultDateTo()}
                            style={{
                                width: '100%',
                                padding: 'var(--space-m)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: 'var(--font-size-base)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: 'var(--space-xs)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-secondary)'
                        }}>
                            To
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            min={dateFrom || getDefaultDateFrom(reportConfig.defaultDateRange)}
                            max={getDefaultDateTo()}
                            style={{
                                width: '100%',
                                padding: 'var(--space-m)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: 'var(--font-size-base)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                </div>

                {/* Date Range Info */}
                {dateFrom && dateTo && (() => {
                    const fromDate = new Date(dateFrom);
                    const toDate = new Date(dateTo);
                    const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    // Check if date range matches "Yesterday" or "Last 7 days" for Top Ten
                    let periodInfo = null;
                    if (reportConfig.showPeriodInfo) {
                        const toDateOnly = new Date(dateTo);
                        toDateOnly.setHours(0, 0, 0, 0);
                        const fromDateOnly = new Date(dateFrom);
                        fromDateOnly.setHours(0, 0, 0, 0);
                        
                        if (toDateOnly.getTime() === yesterday.getTime() && daysDiff === 0) {
                            periodInfo = { period: 'Yesterday', color: '#10B981' };
                        } else if (daysDiff <= 6 && daysDiff >= 0) {
                            periodInfo = { period: 'Last 7 days', color: '#10B981' };
                        } else {
                            periodInfo = { period: 'Will use "Last 7 days"', color: '#F59E0B' };
                        }
                    }
                    
                    return (
                        <div>
                            <p style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--text-tertiary)',
                                marginTop: 'var(--space-xs)',
                                margin: 'var(--space-xs) 0 0 0'
                            }}>
                                {daysDiff >= 0 ? `${daysDiff + 1} days selected` : 'Invalid date range'}
                            </p>
                            {periodInfo && (
                                <div style={{
                                    marginTop: 'var(--space-xs)',
                                    padding: 'var(--space-s) var(--space-m)',
                                    backgroundColor: `${periodInfo.color}15`,
                                    border: `1px solid ${periodInfo.color}40`,
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'start',
                                    gap: 'var(--space-s)'
                                }}>
                                    <AlertCircle size={16} style={{ color: periodInfo.color, flexShrink: 0, marginTop: '2px' }} />
                                    <div>
                                        <p style={{
                                            fontSize: 'var(--font-size-xs)',
                                            fontWeight: 500,
                                            color: periodInfo.color,
                                            margin: 0,
                                            marginBottom: '2px'
                                        }}>
                                            API Period: {periodInfo.period}
                                        </p>
                                        <p style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--text-secondary)',
                                            margin: 0
                                        }}>
                                            Top Ten reports only support "Yesterday" or "Last 7 days". Your date range will be converted automatically.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Channel Filter - Conditional based on report type */}
            {reportConfig.showChannelFilter && (
                <div>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-s)',
                        marginBottom: 'var(--space-s)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 500,
                        color: 'var(--text-primary)'
                    }}>
                        <Database size={16} />
                        Channel Filter {!reportConfig.channelFilterRequired && '(Optional)'}
                    </label>
                    <input
                        type="text"
                        value={channelFilter}
                        onChange={(e) => setChannelFilter(e.target.value)}
                        placeholder="e.g., VOX, RTL or VOX,RTL,Pro7 (leave empty for all channels)"
                        style={{
                            width: '100%',
                            padding: 'var(--space-m)',
                            border: `1px solid ${reportConfig.channelFilterRequired && !channelFilter ? '#EF4444' : 'var(--border-color)'}`,
                            borderRadius: '8px',
                            fontSize: 'var(--font-size-base)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                        }}
                    />
                    <p style={{
                        fontSize: 'var(--font-size-xs)',
                        color: reportConfig.channelFilterRequired && !channelFilter ? '#EF4444' : 'var(--text-tertiary)',
                        marginTop: 'var(--space-xs)',
                        margin: 'var(--space-xs) 0 0 0'
                    }}>
                        {channelFilter
                            ? `Searching channels: ${channelFilter.split(',').map(c => c.trim()).join(', ')}`
                            : reportConfig.channelFilterRequired
                                ? '* Required: Enter at least one channel name'
                                : 'Searching all available channels'}
                    </p>
                </div>
            )}

            {/* Enhanced Filters - Conditional based on report type */}
            {reportConfig.showAdvancedFilters && (
                <EnhancedFilters
                    filters={filters || {}}
                    setFilters={setFilters || (() => {})}
                />
            )}

            {/* Validation Messages */}
            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    {validation.errors.map((error, i) => (
                        <div key={`error-${i}`} style={{
                            padding: 'var(--space-s) var(--space-m)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'start',
                            gap: 'var(--space-s)'
                        }}>
                            <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{
                                fontSize: 'var(--font-size-xs)',
                                color: '#EF4444',
                                margin: 0
                            }}>
                                {error}
                            </p>
                        </div>
                    ))}
                    {validation.warnings.map((warning, i) => (
                        <div key={`warning-${i}`} style={{
                            padding: 'var(--space-s) var(--space-m)',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'start',
                            gap: 'var(--space-s)'
                        }}>
                            <Info size={16} style={{ color: '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{
                                fontSize: 'var(--font-size-xs)',
                                color: '#F59E0B',
                                margin: 0
                            }}>
                                {warning}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Ready to Fetch Indicator */}
            {validation.isValid && (
                <div style={{
                    padding: 'var(--space-m)',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'start',
                    gap: 'var(--space-s)'
                }}>
                    <CheckCircle2 size={20} style={{ color: '#10B981', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <p style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 500,
                            color: '#10B981',
                            margin: 0,
                            marginBottom: 'var(--space-xs)'
                        }}>
                            Ready to fetch {reportConfig.name}
                        </p>
                        <p style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-secondary)',
                            margin: 0
                        }}>
                            {companyName && `Company: ${companyName} • `}
                            {dateFrom && dateTo && `${dateFrom} to ${dateTo}`}
                            {channelFilter && ` • Channels: ${channelFilter}`}
                        </p>
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div style={{
                padding: 'var(--space-m)',
                backgroundColor: 'rgba(10, 132, 255, 0.08)',
                border: '1px solid rgba(10, 132, 255, 0.25)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'start',
                gap: 'var(--space-s)'
            }}>
                <Database size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                    <p style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        margin: 0,
                        marginBottom: 'var(--space-xs)'
                    }}>
                        Fetching from AEOS TV Audit
                    </p>
                    <p style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-secondary)',
                        margin: 0
                    }}>
                        Data will be pulled from the AEOS API based on your selected report type and parameters.
                        Large date ranges may take several minutes to process.
                    </p>
                </div>
            </div>
        </div>
    );
}
