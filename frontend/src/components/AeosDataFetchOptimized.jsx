import { useEffect, useState } from 'react';
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
import { useAeosForm, REPORT_CONFIGS, getDefaultDateTo, getDefaultDateFrom } from '@/hooks/useAeosForm';

export default function AeosDataFetchOptimized({
    companyName,
    setCompanyName,
    companyId,
    setCompanyId,
    competitorCompanyName,
    setCompetitorCompanyName,
    competitorCompanyId,
    setCompetitorCompanyId,
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

    // Use custom hook for form validation and utilities
    const {
        reportConfig,
        validation,
        applyDatePreset,
        dateRangeInfo,
        formSummary,
    } = useAeosForm({
        companyName,
        dateFrom,
        dateTo,
        channelFilter,
        reportType,
        setDateFrom,
        setDateTo,
    });


    return (
        <div className="flex flex-col gap-4 overflow-visible">
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
                    {reportType === 'competitor' ? (
                        <>
                            {/* Two Company Selectors for Competitor Analysis */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 border rounded-lg bg-muted/30">
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                        🏢 Company A
                                    </p>
                                    <CompanySelector
                                        companyName={companyName}
                                        setCompanyName={setCompanyName}
                                        setCompanyId={setCompanyId}
                                    />
                                </div>
                                <div className="p-3 border rounded-lg bg-muted/30">
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                        🏢 Company B (Competitor)
                                    </p>
                                    <CompanySelector
                                        companyName={competitorCompanyName}
                                        setCompanyName={setCompetitorCompanyName}
                                        setCompanyId={setCompetitorCompanyId}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-amber-600 mt-2 font-medium">
                                💡 Select two companies to compare their TV advertising performance
                            </p>
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            )}

            {/* Brand Selector - for spotlist only (not competitor) */}
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
