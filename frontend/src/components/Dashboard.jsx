import { useState, useMemo, useCallback } from 'react';
import { DollarSign, AlertTriangle, Layers, Activity, Download, Users, TrendingUp, BarChart3 } from 'lucide-react';
import MetricsCard from './MetricsCard';
import { DoubleSpendChart, DoubleCountChart } from './Charts';
import WindowTable from './WindowTable';
import DoubleBookingsTable from './DoubleBookingsTable';
import { DaypartAnalysis, ChannelPerformance, EPGCategoryBreakdown } from './AdditionalMetrics';
import AdvancedFilters from './AdvancedFilters';
import { DurationAnalysis } from './DurationAnalysis';
import AIInsights from './AIInsights';

export default function Dashboard({ data }) {
    const { metrics, window_summaries, data: rawData, field_map: fieldMap } = data;
    const [filters, setFilters] = useState(null);
    const [filteredData, setFilteredData] = useState(null);

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
        if (!filterConfig || !rawData) {
            setFilteredData(null);
            return;
        }

        let filtered = [...rawData];

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
    }, [rawData, fieldMap]);

    // Filter rawData for double bookings only for the charts (memoized)
    const dataToUse = filteredData || rawData;
    const doubleBookings = useMemo(() => {
        return dataToUse.filter(r => r.is_double);
    }, [dataToUse]);

    const downloadFilteredCSV = () => {
        const dataToExport = filteredData || rawData;
        if (!dataToExport || !dataToExport.length) return;
        const headers = Object.keys(dataToExport[0]);
        const csvContent = [
            headers.join(','),
            ...dataToExport.map(row => headers.map(fieldName => {
                let val = row[fieldName];
                if (val === null || val === undefined) val = '';
                val = String(val).replace(/"/g, '""'); // Escape quotes
                if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`;
                return val;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const filterSuffix = filters ? '_filtered' : '';
        link.setAttribute('download', `spotlist_annotated${filterSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Check if additional metrics are available
    const hasXRP = metrics.total_xrp !== undefined;
    const hasReach = metrics.total_reach !== undefined;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* AI Insights */}
            <AIInsights metrics={metrics} />

            {/* Summary Metrics */}
            <div className="grid grid-cols-4" style={{ gap: '24px' }}>
                <MetricsCard
                    title="Total Spend"
                    value={`€${metrics.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={DollarSign}
                />
                <MetricsCard
                    title="Double Booking Spend"
                    value={`€${metrics.double_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    subValue={`${(metrics.percent_cost * 100).toFixed(1)}% of total`}
                    icon={AlertTriangle}
                    isCritical={metrics.double_cost > 0}
                />
                <MetricsCard
                    title="Total Spots"
                    value={metrics.total_spots.toLocaleString()}
                    icon={Layers}
                />
                <MetricsCard
                    title="Double Spots"
                    value={metrics.double_spots.toLocaleString()}
                    subValue={`${(metrics.percent_spots * 100).toFixed(1)}% of spots`}
                    icon={Activity}
                    isCritical={metrics.double_spots > 0}
                />
            </div>

            {/* Additional Metrics (if available) */}
            {(hasXRP || hasReach) && (
                <div className="grid grid-cols-4" style={{ gap: '24px' }}>
                    {hasXRP && (
                        <>
                            <MetricsCard
                                title="Total XRP Reach"
                                value={metrics.total_xrp.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                icon={TrendingUp}
                            />
                            <MetricsCard
                                title="Double Booking XRP"
                                value={metrics.double_xrp.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                subValue={`${(metrics.percent_xrp * 100).toFixed(1)}% of total`}
                                icon={AlertTriangle}
                                isCritical={metrics.double_xrp > 0}
                            />
                        </>
                    )}
                    {hasReach && (
                        <>
                            <MetricsCard
                                title="Total Reach"
                                value={metrics.total_reach.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                icon={Users}
                            />
                            <MetricsCard
                                title="Double Booking Reach"
                                value={metrics.double_reach.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                subValue={`${(metrics.percent_reach * 100).toFixed(1)}% of total`}
                                icon={AlertTriangle}
                                isCritical={metrics.double_reach > 0}
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
            <div className="grid grid-cols-2" style={{ gap: '32px' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 700 }}>
                        Spend by Channel
                        {filteredData && <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)' }}> (Filtered)</span>}
                    </h3>
                    <DoubleSpendChart
                        data={doubleBookings}
                        costField={fieldMap?.cost_column}
                        programField={fieldMap?.program_column}
                    />
                </div>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                            Trend Activity
                            {filteredData && <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)' }}> (Filtered)</span>}
                        </h3>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            Last 30 Days
                        </div>
                    </div>
                    <DoubleCountChart data={doubleBookings} programField={fieldMap?.program_column} />
                </div>
            </div>

            {/* Advanced Filters */}
            <AdvancedFilters 
                data={rawData} 
                fieldMap={fieldMap}
                onFilterChange={applyFilters}
            />

            {/* Duration Analysis */}
            {fieldMap?.duration_column && (
                <div className="card">
                    <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 700 }}>
                        Duration Analysis {filteredData && `(${filteredData.length} spots)`}
                    </h3>
                    <DurationAnalysis
                        data={filteredData || rawData}
                        durationField={fieldMap.duration_column}
                        costField={fieldMap.cost_column}
                    />
                </div>
            )}

            {/* Additional Analysis Charts */}
            {(fieldMap?.daypart_column || fieldMap?.epg_category_column) && (
                <div className="grid grid-cols-2" style={{ gap: '32px' }}>
                    {fieldMap?.daypart_column && (
                        <div className="card">
                            <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 700 }}>
                                Performance by Daypart
                            </h3>
                            <DaypartAnalysis
                                data={filteredData || rawData}
                                daypartField={fieldMap.daypart_column}
                                costField={fieldMap.cost_column}
                                xrpField={fieldMap.xrp_column}
                                reachField={fieldMap.reach_column}
                            />
                        </div>
                    )}
                    {fieldMap?.epg_category_column && (
                        <div className="card">
                            <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 700 }}>
                                Spend by EPG Category
                            </h3>
                            <EPGCategoryBreakdown
                                data={filteredData || rawData}
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
                    <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 700 }}>
                        Channel Performance & Efficiency
                        {filteredData && <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)' }}> (Filtered)</span>}
                    </h3>
                    <ChannelPerformance
                        data={filteredData || rawData}
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
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, marginBottom: '4px' }}>
                            Double Bookings by Time Window (All)
                        </h3>
                    </div>
                    <WindowTable summaries={allTable} />
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, marginBottom: '4px' }}>
                            Detailed Double Bookings {filteredData && <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)' }}>({doubleBookings.length} of {rawData.filter(r => r.is_double).length})</span>}
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
                    {filters ? 'Export Filtered CSV' : 'Download Annotated CSV'}
                </button>
            </div>
        </div>
    );
}
