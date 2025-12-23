import { useEffect, useMemo, useState } from 'react';
import { Database, Calendar, Building2, Info, AlertCircle, CheckCircle2, BarChart3 } from 'lucide-react';
import ReportTypeSelector from './ReportTypeSelector';
import EnhancedFilters from './EnhancedFilters';
import CompanySelector from './CompanySelector';
import BrandSelector from './BrandSelector';
import ProductSelector from './ProductSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

    const reportConfig = REPORT_CONFIGS[reportType] || REPORT_CONFIGS.spotlist;

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

    useEffect(() => {
        if (!dateFrom) {
            setDateFrom(getDefaultDateFrom(reportConfig.defaultDateRange));
        }
        if (!dateTo) {
            setDateTo(getDefaultDateTo());
        }
    }, []);

    useEffect(() => {
        // Optional: reset dates when changing report types
    }, [reportType]);

    const validation = useMemo(() => {
        const errors = [];
        const warnings = [];

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

    const applyDatePreset = (days) => {
        setDateTo(getDefaultDateTo());
        setDateFrom(getDefaultDateFrom(days));
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Report Type Selector */}
            <div>
                <ReportTypeSelector
                    reportType={reportType || 'spotlist'}
                    setReportType={setReportType || (() => { })}
                />

                {/* Report Description & Help */}
                <Alert variant="info" className="mt-3">
                    <Info className="size-4" />
                    <AlertDescription className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs">{reportConfig.description}</p>
                                {showHelp && (
                                    <ul className="text-xs text-muted-foreground mt-2 list-disc pl-4 space-y-1">
                                        {reportConfig.tips.map((tip, i) => (
                                            <li key={i}>{tip}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <Button
                                variant="link"
                                size="sm"
                                onClick={() => setShowHelp(!showHelp)}
                                className="text-xs h-auto p-0"
                            >
                                {showHelp ? 'Hide' : 'Tips'}
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            </div>

            {/* Top Ten Subtype Selector */}
            {reportConfig.showTopTenSubtype && (
                <div>
                    <Label className="flex items-center gap-2 mb-2">
                        <BarChart3 className="size-4" />
                        Top Ten Type
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: 'spots', label: 'Top Spots', desc: 'Top 10 ads by XRP' },
                            { value: 'events', label: 'Top Events', desc: 'Top 10 events by Share' },
                            { value: 'channel', label: 'Top Channels', desc: 'Top 10 channels by Share' }
                        ].map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setTopTenSubtype(option.value)}
                                className={cn(
                                    "p-4 border-2 rounded-lg text-left transition-all",
                                    topTenSubtype === option.value
                                        ? "border-primary bg-primary/10"
                                        : "border-border bg-card hover:border-primary/50 hover:bg-muted"
                                )}
                            >
                                <div className="font-semibold text-sm">{option.label}</div>
                                <div className="text-xs text-muted-foreground">{option.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Company Selector */}
            {reportConfig.showCompanySelector && (
                <div>
                    <CompanySelector
                        companyName={companyName}
                        setCompanyName={setCompanyName}
                        setCompanyId={setCompanyId}
                    />
                    {reportConfig.requiredParams.includes('companyName') && (
                        <p className="text-xs text-muted-foreground mt-1">
                            * Required for this report type
                        </p>
                    )}
                </div>
            )}

            {/* Brand Selector */}
            {reportType === 'spotlist' && companyId && (
                <BrandSelector
                    companyId={companyId}
                    brandIds={brandIds}
                    setBrandIds={setBrandIds}
                />
            )}

            {/* Product Selector */}
            {reportType === 'spotlist' && ((brandIds && brandIds.length > 0) || companyId) && (
                <ProductSelector
                    brandIds={brandIds}
                    companyId={companyId}
                    productIds={productIds}
                    setProductIds={setProductIds}
                />
            )}

            {/* Date Range with Quick Presets */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <Label className="flex items-center gap-2">
                        <Calendar className="size-4" />
                        {reportConfig.showPeriodInfo ? 'Date Range (Period Selection)' : 'Date Range'}
                    </Label>
                    <div className="flex gap-1">
                        {[7, 14, 30, 90].map(days => (
                            <Button
                                key={days}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => applyDatePreset(days)}
                                className="h-7 px-2 text-xs"
                            >
                                {days}d
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            max={dateTo || getDefaultDateTo()}
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            min={dateFrom || getDefaultDateFrom(reportConfig.defaultDateRange)}
                            max={getDefaultDateTo()}
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

                    return (
                        <div className="mt-2">
                            <p className="text-xs text-muted-foreground">
                                {daysDiff >= 0 ? `${daysDiff + 1} days selected` : 'Invalid date range'}
                            </p>
                            {periodInfo && (
                                <Alert variant={periodInfo.variant} className="mt-2">
                                    <AlertCircle className="size-4" />
                                    <AlertDescription>
                                        <p className="font-medium text-xs">API Period: {periodInfo.period}</p>
                                        <p className="text-xs">Top Ten reports only support "Yesterday" or "Last 7 days". Your date range will be converted automatically.</p>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Channel Filter */}
            {reportConfig.showChannelFilter && (
                <div>
                    <Label className="flex items-center gap-2 mb-2">
                        <Database className="size-4" />
                        Channel Filter {!reportConfig.channelFilterRequired && '(Optional)'}
                    </Label>
                    <Input
                        type="text"
                        value={channelFilter}
                        onChange={(e) => setChannelFilter(e.target.value)}
                        placeholder="e.g., VOX, RTL or VOX,RTL,Pro7 (leave empty for all channels)"
                        className={cn(
                            reportConfig.channelFilterRequired && !channelFilter && "border-destructive"
                        )}
                    />
                    <p className={cn(
                        "text-xs mt-1",
                        reportConfig.channelFilterRequired && !channelFilter ? "text-destructive" : "text-muted-foreground"
                    )}>
                        {channelFilter
                            ? `Searching channels: ${channelFilter.split(',').map(c => c.trim()).join(', ')}`
                            : reportConfig.channelFilterRequired
                                ? '* Required: Enter at least one channel name'
                                : 'Searching all available channels'}
                    </p>
                </div>
            )}

            {/* Enhanced Filters */}
            {reportConfig.showAdvancedFilters && (
                <EnhancedFilters
                    filters={filters || {}}
                    setFilters={setFilters || (() => { })}
                />
            )}

            {/* Validation Messages */}
            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                <div className="flex flex-col gap-2">
                    {validation.errors.map((error, i) => (
                        <Alert key={`error-${i}`} variant="destructive">
                            <AlertCircle className="size-4" />
                            <AlertDescription className="text-xs">{error}</AlertDescription>
                        </Alert>
                    ))}
                    {validation.warnings.map((warning, i) => (
                        <Alert key={`warning-${i}`} variant="warning">
                            <Info className="size-4" />
                            <AlertDescription className="text-xs">{warning}</AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}

            {/* Ready to Fetch Indicator */}
            {validation.isValid && (
                <Alert variant="success">
                    <CheckCircle2 className="size-5" />
                    <AlertDescription>
                        <p className="font-medium text-sm text-emerald-600">
                            Ready to fetch {reportConfig.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {companyName && `Company: ${companyName} • `}
                            {dateFrom && dateTo && `${dateFrom} to ${dateTo}`}
                            {channelFilter && ` • Channels: ${channelFilter}`}
                        </p>
                    </AlertDescription>
                </Alert>
            )}

            {/* Info Box */}
            <Alert variant="info">
                <Database className="size-5" />
                <AlertDescription>
                    <p className="font-medium text-sm">Fetching from AEOS TV Audit</p>
                    <p className="text-xs text-muted-foreground">
                        Data will be pulled from the AEOS API based on your selected report type and parameters.
                        Large date ranges may take several minutes to process.
                    </p>
                </AlertDescription>
            </Alert>
        </div>
    );
}
