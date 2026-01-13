import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { DollarSign, AlertTriangle, Layers, Activity, Download, Users, TrendingUp, BarChart3, Clock, Trophy, Eye, Loader2, Calendar, Grid3X3, Target, Film } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import ExcelJS from 'exceljs';
import MetricsCard from './MetricsCard';
import { DoubleSpendChart, DoubleCountChart } from './Charts';
import WindowTable from './WindowTable';
import DoubleBookingsTable from './DoubleBookingsTable';
import { DaypartAnalysis, ChannelPerformance, EPGCategoryBreakdown } from './AdditionalMetrics';
import AdvancedFilters from './AdvancedFilters';
import AIInsights from './AIInsights';
// Lazy load heavy report view components for code splitting
const TopTenReportView = lazy(() => import('./TopTenReportView'));
const ReachFrequencyReportView = lazy(() => import('./ReachFrequencyReportView'));
const DeepAnalysisReportView = lazy(() => import('./DeepAnalysisReportView'));
const DaypartAnalysisReportView = lazy(() => import('./DaypartAnalysisReportView'));
const CompetitorComparison = lazy(() => import('./CompetitorComparison'));
const DoubleBookingsTimeline = lazy(() => import('./analytics/DoubleBookingsTimeline'));
const DoubleBookingsHeatmap = lazy(() => import('./analytics/DoubleBookingsHeatmap'));
const DoubleBookingsInsights = lazy(() => import('./analytics/DoubleBookingsInsights'));
const CampaignPlanner = lazy(() => import('./analytics/CampaignPlanner'));
const PositionAnalyzer = lazy(() => import('./analytics/PositionAnalyzer'));
const CreativeAgeAnalyzer = lazy(() => import('./analytics/CreativeAgeAnalyzer'));
import DashboardOverview from './DashboardOverview';
import { enrichDataArray, initializeMetadata } from '../utils/metadataEnricher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { DashboardSkeleton } from './DashboardSkeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp, KeyboardShortcutsButton } from './KeyboardShortcutsHelp';
import { FullscreenChart } from './FullscreenChart';
import { useToast } from '@/hooks/useToast';

// Loading fallback for lazy loaded components
const ReportViewLoading = () => (
    <div className="flex items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading report view...</span>
    </div>
);

// Available view modes for switching
const VIEW_MODES = [
    { id: 'spotlist', label: 'Spotlist', icon: Layers, description: 'Double booking analysis' },
    { id: 'competitor', label: 'Competitor', icon: Users, description: 'Brand comparison' },
    { id: 'daypartAnalysis', label: 'Daypart', icon: Clock, description: 'Performance by time' },
    { id: 'topTen', label: 'Top Ten', icon: Trophy, description: 'Rankings analysis' },
    { id: 'deepAnalysis', label: 'KPIs', icon: Activity, description: 'Channel performance' },
    { id: 'position', label: 'Position', icon: Target, description: 'Placement analysis' },
];

export default function Dashboard({ data }) {
    const { metrics, window_summaries, data: rawData, field_map: fieldMap, metadata } = data || {};

    // Use Zustand store for dashboard state
    const {
        filters,
        setFilters,
        filteredData,
        setFilteredData,
        enrichedData,
        setEnrichedData,
        enrichmentLoading,
        setEnrichmentLoading,
        showShortcuts,
        setShowShortcuts,
        filtersExpanded,
        toggleFilters,
        activeView,
        setActiveView,
        clearFilters,
    } = useDashboardStore();

    const { toast } = useToast();

    // Keyboard shortcuts - use store actions
    useKeyboardShortcuts({
        'f': () => toggleFilters(),
        '?': () => setShowShortcuts(true),
        'escape': () => { setShowShortcuts(false); },
    });

    useEffect(() => {
        initializeMetadata().catch(err => {
            console.warn('Failed to initialize metadata cache:', err);
        });
    }, []);

    useEffect(() => {
        if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
            setEnrichedData(null);
            return;
        }

        setEnrichmentLoading(true);
        enrichDataArray(rawData, {
            enrichChannels: true,
            enrichCompanies: true,
            enrichDayparts: true,
            enrichEPGCategories: true,
            enrichProfiles: true
        })
            .then(enriched => {
                setEnrichedData(enriched);
                setEnrichmentLoading(false);
            })
            .catch(err => {
                console.error('Failed to enrich data:', err);
                setEnrichedData(rawData);
                setEnrichmentLoading(false);
            });
    }, [rawData]);

    const displayData = enrichedData || rawData;

    // Auto-detected report type based on data structure
    const detectedReportType = useMemo(() => {
        if (metadata?.report_type) return metadata.report_type;
        if (!displayData || !Array.isArray(displayData) || displayData.length === 0) return 'spotlist';

        const firstItem = displayData[0];
        const keys = Object.keys(firstItem);

        if (keys.some(k => k.toLowerCase().includes('rank'))) return 'topTen';
        if (keys.some(k => k.toLowerCase().includes('frequency')) &&
            keys.some(k => k.toLowerCase().includes('reach'))) return 'reachFrequency';
        if (keys.some(k => ['amr-perc', 'amr_perc', 'share'].includes(k.toLowerCase()))) return 'deepAnalysis';
        if (keys.some(k => k.toLowerCase().includes('daypart')) &&
            !keys.some(k => k.toLowerCase().includes('is_double'))) return 'daypartAnalysis';

        return 'spotlist';
    }, [metadata, displayData]);

    // Use activeView if manually set, otherwise use detected type
    const reportType = activeView || detectedReportType;

    // Check if view switching is supported (only for spotlist data with is_double field)
    const canSwitchViews = useMemo(() => {
        if (!displayData || !Array.isArray(displayData) || displayData.length === 0) return false;
        // If it's spotlist data, we can switch to other analysis views
        const firstItem = displayData[0];
        const keys = Object.keys(firstItem);
        return keys.some(k => k.toLowerCase().includes('is_double') || k.toLowerCase().includes('daypart'));
    }, [displayData]);

    const displayMetrics = useMemo(() => {
        if (window_summaries && window_summaries.length > 0) {
            const window120 = window_summaries.find(w => w.window_minutes === 120);
            if (window120 && window120.all) return window120.all;
        }
        return metrics;
    }, [window_summaries, metrics]);

    const allTable = useMemo(() => {
        if (!window_summaries || !Array.isArray(window_summaries)) return [];
        return window_summaries.map(w => {
            const m = w.all;
            if (!m) return null;
            return {
                window: `Within ${w.window_minutes} min`,
                spots_abs: m.double_spots,
                spots_pct: (m.percent_spots * 100).toFixed(2) + '%',
                budget_abs: m.double_cost,
                budget_pct: (m.percent_cost * 100).toFixed(2) + '%'
            };
        }).filter(Boolean);
    }, [window_summaries]);

    const applyFilters = useCallback((filterConfig) => {
        setFilters(filterConfig);
        if (!filterConfig || !displayData) {
            setFilteredData(null);
            return;
        }

        let filtered = [...displayData];

        if (filterConfig.channels?.length > 0) {
            filtered = filtered.filter(d => {
                const channel = d[fieldMap?.program_column] || d.Channel || d.program_original;
                return filterConfig.channels.includes(channel);
            });
        }

        if (filterConfig.dates) {
            if (filterConfig.dates.start) {
                filtered = filtered.filter(d => {
                    const date = d.timestamp ? d.timestamp.split('T')[0] : d['Airing date'];
                    return date >= filterConfig.dates.start;
                });
            }
            if (filterConfig.dates.end) {
                filtered = filtered.filter(d => {
                    const date = d.timestamp ? d.timestamp.split('T')[0] : d['Airing date'];
                    return date <= filterConfig.dates.end;
                });
            }
        }

        if (filterConfig.dayparts?.length > 0) {
            filtered = filtered.filter(d => {
                const daypart = d[fieldMap?.daypart_column] || d['Airing daypart'];
                return filterConfig.dayparts.includes(daypart);
            });
        }

        if (filterConfig.categories?.length > 0) {
            filtered = filtered.filter(d => {
                const category = d[fieldMap?.epg_category_column] || d['EPG category'];
                return filterConfig.categories.includes(category);
            });
        }

        if (filterConfig.brands?.length > 0) {
            filtered = filtered.filter(d => filterConfig.brands.includes(d.Brand));
        }

        if (filterConfig.placement) {
            filtered = filtered.filter(d => {
                const placement = d['Before / Within content'] || d.Placement;
                return placement === filterConfig.placement;
            });
        }

        if (filterConfig.minSpend) {
            filtered = filtered.filter(d => {
                const spend = d.cost_numeric || d[fieldMap?.cost_column] || d.Spend || 0;
                return spend >= parseFloat(filterConfig.minSpend);
            });
        }
        if (filterConfig.maxSpend) {
            filtered = filtered.filter(d => {
                const spend = d.cost_numeric || d[fieldMap?.cost_column] || d.Spend || 0;
                return spend <= parseFloat(filterConfig.maxSpend);
            });
        }

        setFilteredData(filtered);
    }, [displayData, fieldMap]);

    const dataToUse = filteredData || displayData || [];
    const doubleBookings = useMemo(() => {
        if (!dataToUse || !Array.isArray(dataToUse)) return [];
        return dataToUse.filter(r => r.is_double);
    }, [dataToUse]);

    const downloadFilteredCSV = async () => {
        const dataToExport = filteredData || displayData;
        if (!dataToExport?.length) {
            toast({
                title: 'No data to export',
                description: 'There is no data available to export.',
                variant: 'destructive',
            });
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Spotlist Data');

            const headers = Object.keys(dataToExport[0]);
            const headerRow = worksheet.addRow(headers);
            headerRow.font = { bold: true, size: 11 };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 20;

            headerRow.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            dataToExport.forEach((row) => {
                const rowData = headers.map(header => row[header] ?? '');
                const excelRow = worksheet.addRow(rowData);
                const isDouble = row.is_double === true || row.is_double === 'true' || row.is_double === 1;

                if (isDouble) {
                    excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE5E5' } };
                    excelRow.font = { color: { argb: 'FF991B1B' } };
                }

                excelRow.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                });
            });

            worksheet.columns.forEach((column) => {
                let maxLength = 10;
                column.eachCell({ includeEmpty: false }, (cell) => {
                    const cellValue = cell.value ? cell.value.toString() : '';
                    if (cellValue.length > maxLength) maxLength = cellValue.length;
                });
                column.width = Math.min(maxLength + 2, 50);
            });

            worksheet.views = [{ state: 'frozen', ySplit: 1 }];

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            const filterSuffix = filters ? '_filtered' : '';
            link.setAttribute('download', `spotlist_annotated${filterSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: 'Export successful',
                description: `Exported ${dataToExport.length} rows to Excel.`,
                variant: 'success',
            });
        } catch (error) {
            console.error('Export failed:', error);
            toast({
                title: 'Export failed',
                description: 'An error occurred while exporting the data.',
                variant: 'destructive',
            });
        }
    };

    const hasXRP = displayMetrics?.total_xrp !== undefined;
    const hasReach = displayMetrics?.total_reach !== undefined;

    // View Switcher Component - Streamlined
    const ViewSwitcher = () => {
        if (!canSwitchViews) return null;

        return (
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">View:</span>
                    <div className="flex gap-1">
                        {VIEW_MODES.map(mode => {
                            const Icon = mode.icon;
                            const isActive = reportType === mode.id;
                            return (
                                <Button
                                    key={mode.id}
                                    variant={isActive ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveView(mode.id)}
                                    className={cn(
                                        "h-8 px-3 text-xs",
                                        !isActive && "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Icon className="size-3.5 mr-1.5" />
                                    {mode.label}
                                </Button>
                            );
                        })}
                    </div>
                </div>
                {activeView && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveView(null)}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                        Reset
                    </Button>
                )}
            </div>
        );
    };

    if (enrichmentLoading && !displayData) {
        return <DashboardSkeleton />;
    }

    // Render appropriate view based on reportType (wrapped in Suspense for lazy loading)
    const renderReportView = () => {
        const reportContent = (() => {
            switch (reportType) {
                case 'competitor':
                    return <CompetitorComparison data={displayData} fieldMap={fieldMap} />;
                case 'topTen':
                    return <TopTenReportView data={displayData} reportType={reportType} />;
                case 'reachFrequency':
                    return <ReachFrequencyReportView data={displayData || data} reportType={reportType} />;
                case 'deepAnalysis':
                    return <DeepAnalysisReportView data={displayData} reportType={reportType} />;
                case 'position':
                    return <PositionAnalyzer data={displayData} fieldMap={fieldMap} />;
                default:
                    return null; // Spotlist view is handled separately below
            }
        })();

        return (
            <Suspense fallback={<ReportViewLoading />}>
                {reportContent}
            </Suspense>
        );
    };

    // For non-spotlist views, render with view switcher
    if (reportType !== 'spotlist') {
        return (
            <div className="flex flex-col gap-8">
                <DashboardOverview data={data} reportType={reportType} metadata={metadata} />
                <ViewSwitcher />
                {renderReportView()}
            </div>
        );
    }

    // Default: Spotlist Report View
    return (
        <div className="flex flex-col gap-8">
            {/* Keyboard Shortcuts Help Modal */}
            <KeyboardShortcutsHelp open={showShortcuts} onOpenChange={setShowShortcuts} />

            {/* Dashboard Overview */}
            <DashboardOverview data={data} reportType={reportType} metadata={metadata} />

            {/* View Switcher */}
            <ViewSwitcher />

            {/* AI Insights */}
            <AIInsights metrics={metrics} />

            {/* Summary Metrics - Two Row Layout */}
            <div className="space-y-3">
                {/* Primary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricsCard
                        title="Total Spend"
                        value={`€${displayMetrics.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        icon={DollarSign}
                    />
                    <MetricsCard
                        title="Double Booking Spend"
                        value={`€${displayMetrics.double_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        subValue={`${(displayMetrics.percent_cost * 100).toFixed(2)}% of total`}
                        icon={AlertTriangle}
                        isCritical={displayMetrics.double_cost > 0}
                    />
                    <MetricsCard
                        title="Total Spots"
                        value={displayMetrics.total_spots.toLocaleString()}
                        icon={Layers}
                    />
                    <MetricsCard
                        title="Double Spots"
                        value={displayMetrics.double_spots.toLocaleString()}
                        subValue={`${(displayMetrics.percent_spots * 100).toFixed(2)}% of spots`}
                        icon={Activity}
                        isCritical={displayMetrics.double_spots > 0}
                    />
                </div>

                {/* Secondary Metrics - Breakdown by Programme Type */}
                {(displayMetrics.same_sendung_spots !== undefined || displayMetrics.diff_sendung_spots !== undefined) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayMetrics.same_sendung_spots !== undefined && (
                            <Card className="border border-border bg-card">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground mb-1">Same Programme</div>
                                            <div className="text-2xl font-semibold text-foreground tabular-nums">
                                                {displayMetrics.same_sendung_spots.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">Double bookings</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {displayMetrics.diff_sendung_spots !== undefined && (
                            <Card className="border border-border bg-card">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground mb-1">Different Programme</div>
                                            <div className="text-2xl font-semibold text-destructive tabular-nums">
                                                {displayMetrics.diff_sendung_spots.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">Double bookings</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* Additional Metrics (XRP/Reach) */}
            {(hasXRP || hasReach) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {hasXRP && (
                        <>
                            <MetricsCard
                                title="Total XRP (Reach Points)"
                                value={displayMetrics.total_xrp.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                subValue="Cumulative reach points"
                                icon={TrendingUp}
                            />
                            <MetricsCard
                                title="Double Booking XRP"
                                value={displayMetrics.double_xrp.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                subValue={`${(displayMetrics.percent_xrp * 100).toFixed(1)}% of total`}
                                icon={AlertTriangle}
                                isCritical={displayMetrics.double_xrp > 0}
                            />
                        </>
                    )}
                    {hasReach && (
                        <>
                            <MetricsCard
                                title="Total Reach (%)"
                                value={displayMetrics.total_reach.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                subValue="% of households reached"
                                icon={Users}
                            />
                            <MetricsCard
                                title="Double Booking Reach"
                                value={displayMetrics.double_reach.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                subValue={`${(displayMetrics.percent_reach * 100).toFixed(1)}% of total`}
                                icon={AlertTriangle}
                                isCritical={displayMetrics.double_reach > 0}
                            />
                        </>
                    )}
                </div>
            )}

            {/* Trend Activity Chart */}
            <FullscreenChart title="Trend Activity">
                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            Trend Activity
                            {filteredData && <Badge variant="secondary" className="text-xs">Filtered</Badge>}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground font-semibold">Last 30 Days</span>
                    </CardHeader>
                    <CardContent>
                        <DoubleCountChart data={doubleBookings} programField={fieldMap?.program_column} />
                    </CardContent>
                </Card>
            </FullscreenChart>

            {/* Advanced Filters */}
            <AdvancedFilters
                data={displayData}
                fieldMap={fieldMap}
                onFilterChange={applyFilters}
            />

            {/* Additional Analysis Charts */}
            {(fieldMap?.daypart_column || fieldMap?.epg_category_column) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {fieldMap?.daypart_column && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance by Daypart</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <DaypartAnalysis
                                    data={filteredData || displayData}
                                    daypartField={fieldMap.daypart_column}
                                    costField={fieldMap.cost_column}
                                    xrpField={fieldMap.xrp_column}
                                    reachField={fieldMap.reach_column}
                                />
                            </CardContent>
                        </Card>
                    )}
                    {fieldMap?.epg_category_column && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Spend by EPG Category</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <EPGCategoryBreakdown
                                    data={filteredData || displayData}
                                    categoryField={fieldMap.epg_category_column}
                                    costField={fieldMap.cost_column}
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Channel Performance */}
            {fieldMap?.program_column && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Channel Performance & Efficiency
                            {filteredData && <Badge variant="secondary" className="text-xs">Filtered</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChannelPerformance
                            data={filteredData || displayData}
                            programField={fieldMap.program_column}
                            costField={fieldMap.cost_column}
                            xrpField={fieldMap.xrp_column}
                            reachField={fieldMap.reach_column}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Detailed Tables */}
            <div className="flex flex-col gap-8">
                <Card className="overflow-hidden">
                    <CardHeader className="border-b">
                        <CardTitle>Double Bookings by Time Window</CardTitle>
                    </CardHeader>
                    <WindowTable summaries={allTable} />
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader className="border-b">
                        <div>
                            <CardTitle className="flex items-center gap-2 mb-1">
                                Detailed Double Bookings
                                {filteredData && (
                                    <Badge variant="secondary" className="text-xs">
                                        {doubleBookings.length} of {displayData.filter(r => r.is_double).length}
                                    </Badge>
                                )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Click on a row to view details. Use Advanced Filters above to narrow down results.
                            </p>
                        </div>
                    </CardHeader>
                    <DoubleBookingsTable data={doubleBookings} fieldMap={fieldMap} />
                </Card>
            </div>

            {/* Download Action */}
            <div className="flex justify-end">
                <Button onClick={downloadFilteredCSV}>
                    <Download className="size-5" />
                    {filters ? 'Export Filtered Excel' : 'Download Annotated Excel'}
                </Button>
            </div>
        </div>
    );
}
