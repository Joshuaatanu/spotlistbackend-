import { useState, useMemo, useCallback, useEffect } from 'react';
import { DollarSign, AlertTriangle, Layers, Activity, Download, Users, TrendingUp, BarChart3 } from 'lucide-react';
import ExcelJS from 'exceljs';
import MetricsCard from './MetricsCard';
import { DoubleSpendChart, DoubleCountChart } from './Charts';
import WindowTable from './WindowTable';
import DoubleBookingsTable from './DoubleBookingsTable';
import { DaypartAnalysis, ChannelPerformance, EPGCategoryBreakdown } from './AdditionalMetrics';
import AdvancedFilters from './AdvancedFilters';
import AIInsights from './AIInsights';
import TopTenReportView from './TopTenReportView';
import ReachFrequencyReportView from './ReachFrequencyReportView';
import DeepAnalysisReportView from './DeepAnalysisReportView';
import DashboardOverview from './DashboardOverview';
import { enrichDataArray, initializeMetadata } from '../utils/metadataEnricher';

export default function Dashboard({ data }) {
    const { metrics, window_summaries, data: rawData, field_map: fieldMap, metadata } = data || {};
    const [filters, setFilters] = useState(null);
    const [filteredData, setFilteredData] = useState(null);
    const [enrichedData, setEnrichedData] = useState(null);
    const [enrichmentLoading, setEnrichmentLoading] = useState(false);
    
    // Initialize metadata on component mount
    useEffect(() => {
        initializeMetadata().catch(err => {
            console.warn('Failed to initialize metadata cache:', err);
        });
    }, []);

    // Enrich data when rawData changes
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
                // Debug: log first item to see what fields are available
                if (enriched && enriched.length > 0) {
                    console.log('Sample enriched item:', enriched[0]);
                    console.log('Channel fields:', {
                        channel: enriched[0].channel,
                        Channel: enriched[0].Channel,
                        channel_id: enriched[0].channel_id,
                        channel_display: enriched[0].channel_display,
                        program_original: enriched[0].program_original
                    });
                }
            })
            .catch(err => {
                console.error('Failed to enrich data:', err);
                // Fallback to raw data if enrichment fails
                setEnrichedData(rawData);
                setEnrichmentLoading(false);
            });
    }, [rawData]);

    // Use enriched data if available, otherwise fall back to raw data
    const displayData = enrichedData || rawData;

    // Detect report type from metadata or data structure
    const reportType = useMemo(() => {
        // Check metadata first
        if (metadata?.report_type) {
            return metadata.report_type;
        }
        
        // Check data structure to infer report type
        if (!displayData || !Array.isArray(displayData) || displayData.length === 0) {
            return 'spotlist'; // Default
        }
        
        const firstItem = displayData[0];
        const keys = Object.keys(firstItem);
        
        // Check for Top Ten indicators (ranking, top entities)
        if (keys.some(k => k.toLowerCase().includes('rank')) || 
            keys.some(k => k.toLowerCase().includes('top'))) {
            return 'topTen';
        }
        
        // Check for Reach & Frequency indicators
        if (keys.some(k => k.toLowerCase().includes('frequency')) &&
            keys.some(k => k.toLowerCase().includes('reach'))) {
            return 'reachFrequency';
        }
        
        // Check for Deep Analysis KPIs
        if (keys.some(k => ['amr-perc', 'amr_perc', 'share', 'ats-avg', 'atv-avg'].includes(k.toLowerCase())) ||
            keys.some(k => k.toLowerCase().includes('amr')) ||
            keys.some(k => k.toLowerCase().includes('share'))) {
            return 'deepAnalysis';
        }
        
        // Check for daypart analysis structure
        if (keys.some(k => k.toLowerCase().includes('daypart')) &&
            !keys.some(k => k.toLowerCase().includes('is_double'))) {
            return 'daypartAnalysis';
        }
        
        // Default to spotlist (has is_double, cost, etc.)
        return 'spotlist';
    }, [metadata, displayData]);
    
    // Use 120-minute window metrics by default (matching personal analysis)
    const displayMetrics = useMemo(() => {
        if (window_summaries && window_summaries.length > 0) {
            // Find 120-minute window summary
            const window120 = window_summaries.find(w => w.window_minutes === 120);
            if (window120 && window120.all) {
                return window120.all;
            }
        }
        // Fallback to default metrics if 120-minute not found
        return metrics;
    }, [window_summaries, metrics]);

    // Prepare data for table (memoized)
    const allTable = useMemo(() => {
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

    // Apply filters function (memoized)
    const applyFilters = useCallback((filterConfig) => {
        setFilters(filterConfig);
        if (!filterConfig || !displayData) {
            setFilteredData(null);
            return;
        }

        let filtered = [...displayData];

        // Channel filter
        if (filterConfig.channels && filterConfig.channels.length > 0) {
            filtered = filtered.filter(d => {
                const channel = d[fieldMap?.program_column] || d.Channel || d.program_original;
                return filterConfig.channels.includes(channel);
            });
        }

        // Date range filter
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

        // Daypart filter
        if (filterConfig.dayparts && filterConfig.dayparts.length > 0) {
            filtered = filtered.filter(d => {
                const daypart = d[fieldMap?.daypart_column] || d['Airing daypart'];
                return filterConfig.dayparts.includes(daypart);
            });
        }

        // Category filter
        if (filterConfig.categories && filterConfig.categories.length > 0) {
            filtered = filtered.filter(d => {
                const category = d[fieldMap?.epg_category_column] || d['EPG category'];
                return filterConfig.categories.includes(category);
            });
        }

        // Brand filter
        if (filterConfig.brands && filterConfig.brands.length > 0) {
            filtered = filtered.filter(d => filterConfig.brands.includes(d.Brand));
        }

        // Placement filter
        if (filterConfig.placement) {
            filtered = filtered.filter(d => {
                const placement = d['Before / Within content'] || d.Placement;
                return placement === filterConfig.placement;
            });
        }

        // Spend range filter
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

        // Duration range filter
        if (filterConfig.minDuration && fieldMap?.duration_column) {
            filtered = filtered.filter(d => {
                const duration = parseFloat(d[fieldMap.duration_column] || d.Duration || 0);
                return duration >= parseFloat(filterConfig.minDuration);
            });
        }
        if (filterConfig.maxDuration && fieldMap?.duration_column) {
            filtered = filtered.filter(d => {
                const duration = parseFloat(d[fieldMap.duration_column] || d.Duration || 0);
                return duration <= parseFloat(filterConfig.maxDuration);
            });
        }

        setFilteredData(filtered);
    }, [displayData, fieldMap]);

    // Filter displayData for double bookings only for the charts (memoized)
    const dataToUse = filteredData || displayData;
    const doubleBookings = useMemo(() => {
        return dataToUse.filter(r => r.is_double);
    }, [dataToUse]);

    const downloadFilteredCSV = async () => {
        const dataToExport = filteredData || displayData;
        if (!dataToExport || !dataToExport.length) return;

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Spotlist Data');

        // Get headers from the first row
        const headers = Object.keys(dataToExport[0]);
        
        // Add header row with styling
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true, size: 11 };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' } // Light gray background
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 20;

        // Style header cells
        headerRow.eachCell((cell, colNumber) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Add data rows with conditional highlighting for double bookings
        dataToExport.forEach((row) => {
            const rowData = headers.map(header => {
                let val = row[header];
                if (val === null || val === undefined) return '';
                return val;
            });
            
            const excelRow = worksheet.addRow(rowData);
            
            // Check if this row is a double booking
            const isDouble = row.is_double === true || row.is_double === 'true' || row.is_double === 1;
            
            if (isDouble) {
                // Highlight double booking rows with light red background
                excelRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFE5E5' } // Light red/pink background
                };
                excelRow.font = { color: { argb: 'FF991B1B' } }; // Dark red text
            }

            // Add borders to all cells
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

        // Auto-fit column widths
        worksheet.columns.forEach((column) => {
            let maxLength = 10;
            column.eachCell({ includeEmpty: false }, (cell) => {
                const cellValue = cell.value ? cell.value.toString() : '';
                if (cellValue.length > maxLength) {
                    maxLength = cellValue.length;
                }
            });
            column.width = Math.min(maxLength + 2, 50); // Cap at 50 characters
        });

        // Freeze the header row
        worksheet.views = [
            { state: 'frozen', ySplit: 1 }
        ];

        // Generate Excel file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const filterSuffix = filters ? '_filtered' : '';
        link.setAttribute('download', `spotlist_annotated${filterSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Check if additional metrics are available
    const hasXRP = displayMetrics?.total_xrp !== undefined;
    const hasReach = displayMetrics?.total_reach !== undefined;

    // Show loading state while enriching data
    if (enrichmentLoading && !displayData) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '400px',
                flexDirection: 'column',
                gap: 'var(--space-m)'
            }}>
                <div className="loading-spinner" />
                <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                    Enriching data with metadata...
                </div>
            </div>
        );
    }

    // Render report-type-specific views
    if (reportType === 'topTen') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                <DashboardOverview data={data} reportType={reportType} metadata={metadata} />
                <TopTenReportView data={displayData} reportType={reportType} />
            </div>
        );
    }

    if (reportType === 'reachFrequency') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                <DashboardOverview data={data} reportType={reportType} metadata={metadata} />
                <ReachFrequencyReportView data={displayData || data} reportType={reportType} />
            </div>
        );
    }

    if (reportType === 'deepAnalysis') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                <DashboardOverview data={data} reportType={reportType} metadata={metadata} />
                <DeepAnalysisReportView data={displayData} reportType={reportType} />
            </div>
        );
    }
    
    if (reportType === 'daypartAnalysis') {
        // Daypart analysis can use similar structure to spotlist but with different focus
        // For now, render with daypart emphasis
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <DashboardOverview data={data} reportType={reportType} metadata={metadata} />
                <div className="card">
                    <h2>Daypart Analysis Report</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Performance analysis by time of day segments
                    </p>
                </div>
                {fieldMap?.daypart_column && (
                    <div className="card">
                        <h3 style={{ marginBottom: '24px' }}>Performance by Daypart</h3>
                        <DaypartAnalysis
                            data={filteredData || displayData}
                            daypartField={fieldMap.daypart_column}
                            costField={fieldMap.cost_column}
                            xrpField={fieldMap.xrp_column}
                            reachField={fieldMap.reach_column}
                        />
                    </div>
                )}
                {displayData && displayData.length > 0 && (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h3 style={{ margin: 0 }}>Daypart Data</h3>
                        </div>
                        <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10 }}>
                                    <tr>
                                        {Object.keys(displayData[0]).map(key => (
                                            <th key={key} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--font-size-sm)', borderBottom: '2px solid var(--border-color)' }}>
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayData.slice(0, 100).map((row, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            {Object.keys(displayData[0]).map(key => (
                                                <td key={key} style={{ padding: '12px 16px', fontSize: 'var(--font-size-sm)' }}>
                                                    {row[key] !== null && row[key] !== undefined ? String(row[key]) : '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Default: Spotlist Report View
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Dashboard Overview - Quick Stats */}
            <DashboardOverview data={data} reportType={reportType} metadata={metadata} />
            
            {/* AI Insights */}
            <AIInsights metrics={metrics} />

            {/* Legacy Summary Metrics (kept for backward compatibility) */}
            <div className="grid grid-cols-4" style={{ gap: '24px' }}>
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

            {/* Duplicate Breakdown */}
            <div className="card">
                <h3 style={{ marginBottom: 'var(--space-l)' }}>
                    Duplicate Booking Analysis
                </h3>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                    gap: 'var(--space-xl)' 
                }}>
                    {/* Cost of Duplicate Bookings */}
                    <div>
                        <div style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--text-secondary)',
                            marginBottom: 'var(--space-s)'
                        }}>
                            Cost of Duplicate Bookings
                        </div>
                        <div style={{
                            fontSize: 'var(--font-size-2xl)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: 'var(--accent-error)',
                            marginBottom: 'var(--space-xs)'
                        }}>
                            €{displayMetrics.double_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Percentage of Duplicate Bookings (% of costs) */}
                    <div>
                        <div style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--text-secondary)',
                            marginBottom: 'var(--space-s)'
                        }}>
                            Percentage of Duplicate Bookings
                        </div>
                        <div style={{
                            fontSize: 'var(--font-size-2xl)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: 'var(--accent-error)',
                            marginBottom: 'var(--space-xs)'
                        }}>
                            {(displayMetrics.percent_cost * 100).toFixed(2)}%
                        </div>
                        <div style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-tertiary)'
                        }}>
                            as % of costs
                        </div>
                    </div>

                    {/* Total Number of Affected Spots */}
                    <div>
                        <div style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--text-secondary)',
                            marginBottom: 'var(--space-s)'
                        }}>
                            Total Number of Affected Spots
                        </div>
                        <div style={{
                            fontSize: 'var(--font-size-2xl)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: 'var(--accent-error)',
                            marginBottom: 'var(--space-xs)'
                        }}>
                            {displayMetrics.double_spots.toLocaleString()}
                        </div>
                    </div>

                    {/* Same Programme Duplicates */}
                    {displayMetrics.same_sendung_spots !== undefined && (
                        <div>
                            <div style={{
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 'var(--font-weight-semibold)',
                                color: 'var(--text-secondary)',
                                marginBottom: 'var(--space-s)'
                            }}>
                                Same Programme Duplicates
                            </div>
                            <div style={{
                                fontSize: 'var(--font-size-2xl)',
                                fontWeight: 'var(--font-weight-bold)',
                                color: 'var(--accent-warning)',
                                marginBottom: 'var(--space-xs)'
                            }}>
                                {displayMetrics.same_sendung_spots.toLocaleString()}
                            </div>
                        </div>
                    )}

                    {/* Different Programme Duplicates */}
                    {displayMetrics.diff_sendung_spots !== undefined && (
                        <div>
                            <div style={{
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 'var(--font-weight-semibold)',
                                color: 'var(--text-secondary)',
                                marginBottom: 'var(--space-s)'
                            }}>
                                Different Programme Duplicates
                            </div>
                            <div style={{
                                fontSize: 'var(--font-size-2xl)',
                                fontWeight: 'var(--font-weight-bold)',
                                color: 'var(--accent-error)',
                                marginBottom: 'var(--space-xs)'
                            }}>
                                {displayMetrics.diff_sendung_spots.toLocaleString()}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Additional Metrics (if available) */}
            {(hasXRP || hasReach) && (
                <div className="grid grid-cols-4" style={{ gap: '24px' }}>
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
                    {metrics.cost_per_xrp !== undefined && (
                        <MetricsCard
                            title="Cost per XRP"
                            value={`€${metrics.cost_per_xrp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            icon={BarChart3}
                        />
                    )}
                    {metrics.cost_per_reach !== undefined && (
                        <MetricsCard
                            title="Cost per Reach"
                            value={`€${metrics.cost_per_reach.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            icon={BarChart3}
                        />
                    )}
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1" style={{ gap: '32px' }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0 }}>
                            Trend Activity
                            {filteredData && <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-normal)', color: 'var(--text-secondary)' }}> (Filtered)</span>}
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontWeight: 'var(--font-weight-semibold)' }}>
                            Last 30 Days
                        </div>
                    </div>
                    <DoubleCountChart data={doubleBookings} programField={fieldMap?.program_column} />
                </div>
            </div>

            {/* Advanced Filters */}
            <AdvancedFilters 
                data={displayData} 
                fieldMap={fieldMap}
                onFilterChange={applyFilters}
            />


            {/* Additional Analysis Charts */}
            {(fieldMap?.daypart_column || fieldMap?.epg_category_column) && (
                <div className="grid grid-cols-2" style={{ gap: '32px' }}>
                    {fieldMap?.daypart_column && (
                        <div className="card">
                            <h3 style={{ marginBottom: '24px' }}>
                                Performance by Daypart
                            </h3>
                            <DaypartAnalysis
                                data={filteredData || displayData}
                                daypartField={fieldMap.daypart_column}
                                costField={fieldMap.cost_column}
                                xrpField={fieldMap.xrp_column}
                                reachField={fieldMap.reach_column}
                            />
                        </div>
                    )}
                    {fieldMap?.epg_category_column && (
                        <div className="card">
                            <h3 style={{ marginBottom: '24px' }}>
                                Spend by EPG Category
                            </h3>
                            <EPGCategoryBreakdown
                                data={filteredData || displayData}
                                categoryField={fieldMap.epg_category_column}
                                costField={fieldMap.cost_column}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Channel Performance */}
            {fieldMap?.program_column && (
                <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>
                        Channel Performance & Efficiency
                        {filteredData && <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-normal)', color: 'var(--text-secondary)' }}> (Filtered)</span>}
                    </h3>
                    <ChannelPerformance
                            data={filteredData || displayData}
                        programField={fieldMap.program_column}
                        costField={fieldMap.cost_column}
                        xrpField={fieldMap.xrp_column}
                        reachField={fieldMap.reach_column}
                    />
                </div>
            )}

            {/* Detailed Tables */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <h3 style={{ margin: 0, marginBottom: '4px' }}>
                            Double Bookings by Time Window (All)
                        </h3>
                    </div>
                    <WindowTable summaries={allTable} />
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <h3 style={{ margin: 0, marginBottom: '4px' }}>
                            Detailed Double Bookings {filteredData && <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-normal)', color: 'var(--text-secondary)' }}>({doubleBookings.length} of {displayData.filter(r => r.is_double).length})</span>}
                        </h3>
                        <p style={{ 
                            fontSize: '14px', 
                            color: 'var(--text-secondary)', 
                            margin: 0,
                            marginTop: '4px'
                        }}>
                            Click on a row to view details. Use Advanced Filters above to narrow down results.
                        </p>
                    </div>
                    <DoubleBookingsTable data={doubleBookings} fieldMap={fieldMap} />
                </div>
            </div>

            {/* Download Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={downloadFilteredCSV} className="btn">
                    <Download size={20} />
                    {filters ? 'Export Filtered Excel' : 'Download Annotated Excel'}
                </button>
            </div>
        </div>
    );
}
