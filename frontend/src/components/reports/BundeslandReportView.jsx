import { useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ComposedChart,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Map, TrendingUp, DollarSign, Activity, Users, Target, BarChart3 } from 'lucide-react';

export default function BundeslandReportView({ data, reportType }) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <Map size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px' }} />
                <p className="text-secondary">No Bundesland data available.</p>
            </div>
        );
    }

    const processedData = useMemo(() => {
        // Identify bundesland field (German states)
        const bundeslandKey = Object.keys(data[0] || {}).find(k =>
            ['bundesland', 'state', 'province', 'land'].includes(k.toLowerCase())
        ) || 'bundesland';

        // List of German Bundesländer for reference
        const bundeslaenderNames = [
            'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
            'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
            'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
            'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'
        ];

        // Aggregate metrics by bundesland
        const bundeslandAggregation = data.reduce((acc, item) => {
            const bundesland = item[bundeslandKey] || 'Unknown';
            if (!acc[bundesland]) {
                acc[bundesland] = {
                    bundesland,
                    spend: 0,
                    xrp: 0,
                    reach: 0,
                    airings: 0,
                    count: 0
                };
            }
            acc[bundesland].spend += parseFloat(item.spend || item.Spend || item.cost || 0);
            acc[bundesland].xrp += parseFloat(item.xrp || item.XRP || 0);
            acc[bundesland].reach += parseFloat(item.reach || item.Reach || 0);
            acc[bundesland].airings += parseFloat(item.airings || item.Airings || item.spots || 0);
            acc[bundesland].count += 1;
            return acc;
        }, {});

        const bundeslandData = Object.values(bundeslandAggregation)
            .sort((a, b) => b.spend - a.spend);

        // Aggregate by period (if available)
        const periodKey = Object.keys(data[0] || {}).find(k =>
            ['date', 'period', 'month', 'week', 'day', 'time'].includes(k.toLowerCase())
        );

        let periodData = [];
        if (periodKey) {
            const periodAggregation = data.reduce((acc, item) => {
                const period = item[periodKey] || 'Unknown';
                if (!acc[period]) {
                    acc[period] = {
                        period,
                        spend: 0,
                        xrp: 0,
                        reach: 0,
                        airings: 0
                    };
                }
                acc[period].spend += parseFloat(item.spend || item.Spend || item.cost || 0);
                acc[period].xrp += parseFloat(item.xrp || item.XRP || 0);
                acc[period].reach += parseFloat(item.reach || item.Reach || 0);
                acc[period].airings += parseFloat(item.airings || item.Airings || item.spots || 0);
                return acc;
            }, {});

            periodData = Object.values(periodAggregation).sort((a, b) => {
                if (a.period < b.period) return -1;
                if (a.period > b.period) return 1;
                return 0;
            });
        }

        // Categorize Bundesländer by size/population (approximate)
        const categorizeBundesland = (name) => {
            const large = ['Nordrhein-Westfalen', 'Bayern', 'Baden-Württemberg', 'Niedersachsen'];
            const medium = ['Hessen', 'Sachsen', 'Rheinland-Pfalz', 'Berlin', 'Schleswig-Holstein'];
            // Rest are considered small

            if (large.some(l => name.includes(l))) return 'Large';
            if (medium.some(m => name.includes(m))) return 'Medium';
            return 'Small';
        };

        // Aggregate by category
        const categoryAggregation = bundeslandData.reduce((acc, bl) => {
            const category = categorizeBundesland(bl.bundesland);
            if (!acc[category]) {
                acc[category] = {
                    category,
                    spend: 0,
                    xrp: 0,
                    reach: 0,
                    airings: 0,
                    count: 0
                };
            }
            acc[category].spend += bl.spend;
            acc[category].xrp += bl.xrp;
            acc[category].reach += bl.reach;
            acc[category].airings += bl.airings;
            acc[category].count += 1;
            return acc;
        }, {});

        const categoryData = Object.values(categoryAggregation);

        // Calculate totals
        const totalSpend = bundeslandData.reduce((sum, bl) => sum + bl.spend, 0);
        const totalXRP = bundeslandData.reduce((sum, bl) => sum + bl.xrp, 0);
        const totalReach = bundeslandData.reduce((sum, bl) => sum + bl.reach, 0);
        const totalAirings = bundeslandData.reduce((sum, bl) => sum + bl.airings, 0);

        // Calculate efficiency metrics
        const costPerXRP = totalXRP > 0 ? totalSpend / totalXRP : 0;
        const costPerReach = totalReach > 0 ? totalSpend / totalReach : 0;

        // Calculate market concentration (top 5 vs rest)
        const top5Spend = bundeslandData.slice(0, 5).reduce((sum, bl) => sum + bl.spend, 0);
        const marketConcentration = totalSpend > 0 ? (top5Spend / totalSpend) * 100 : 0;

        return {
            bundeslandData,
            periodData,
            categoryData,
            totalSpend,
            totalXRP,
            totalReach,
            totalAirings,
            costPerXRP,
            costPerReach,
            bundeslandCount: bundeslandData.length,
            marketConcentration
        };
    }, [data]);

    const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-m)', marginBottom: 'var(--space-l)' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Map size={28} style={{ color: '#EF4444' }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, marginBottom: '4px' }}>Bundesland Analysis</h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            State-level advertising performance across {processedData.bundeslandCount} Bundesländer
                        </p>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-4" style={{ gap: '24px' }}>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', marginBottom: 'var(--space-s)' }}>
                        <DollarSign size={20} style={{ color: 'var(--accent-primary)' }} />
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            Total Spend
                        </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        €{processedData.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', marginBottom: 'var(--space-s)' }}>
                        <Activity size={20} style={{ color: 'var(--accent-primary)' }} />
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            Total XRP
                        </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {processedData.totalXRP.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', marginBottom: 'var(--space-s)' }}>
                        <Users size={20} style={{ color: 'var(--accent-primary)' }} />
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            Total Reach
                        </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {processedData.totalReach.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', marginBottom: 'var(--space-s)' }}>
                        <Target size={20} style={{ color: 'var(--accent-primary)' }} />
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            Total Airings
                        </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {processedData.totalAirings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>

            {/* Efficiency & Concentration Metrics */}
            <div className="grid grid-cols-3" style={{ gap: '24px' }}>
                <div className="card">
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Cost per XRP
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        €{processedData.costPerXRP.toFixed(4)}
                    </div>
                </div>
                <div className="card">
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Cost per Reach
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        €{processedData.costPerReach.toFixed(4)}
                    </div>
                </div>
                <div className="card">
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Market Concentration (Top 5)
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {processedData.marketConcentration.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Bundesland Trends Over Time */}
            {processedData.periodData.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>Bundesland Advertising Trends</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={processedData.periodData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis
                                dataKey="period"
                                stroke="#9CA3AF"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#9CA3AF"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                yAxisId="left"
                                label={{ value: 'Spend (€)', angle: -90, position: 'insideLeft' }}
                            />
                            <YAxis
                                stroke="#9CA3AF"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                yAxisId="right"
                                orientation="right"
                                label={{ value: 'XRP', angle: 90, position: 'insideRight' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#FFFFFF',
                                    borderColor: '#E5E7EB',
                                    color: '#1A1A1A',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                formatter={(value, name) => {
                                    if (name === 'spend') {
                                        return [`€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Spend'];
                                    }
                                    return [value.toLocaleString(), name.toUpperCase()];
                                }}
                            />
                            <Legend />
                            <Bar
                                dataKey="airings"
                                fill="#F59E0B"
                                yAxisId="left"
                                radius={[4, 4, 0, 0]}
                                opacity={0.6}
                            />
                            <Line
                                type="monotone"
                                dataKey="spend"
                                stroke="#EF4444"
                                strokeWidth={3}
                                dot={{ fill: '#EF4444', r: 4 }}
                                activeDot={{ r: 6 }}
                                yAxisId="left"
                            />
                            <Line
                                type="monotone"
                                dataKey="xrp"
                                stroke="#10B981"
                                strokeWidth={3}
                                dot={{ fill: '#10B981', r: 4 }}
                                activeDot={{ r: 6 }}
                                yAxisId="right"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Market Share by Bundesland */}
            <div className="card">
                <h3 style={{ marginBottom: '24px' }}>Market Share by Bundesland</h3>
                <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                    <ResponsiveContainer width="50%" height={350}>
                        <PieChart>
                            <Pie
                                data={processedData.bundeslandData.slice(0, 8)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ bundesland, percent }) => {
                                    const shortName = bundesland.length > 12
                                        ? bundesland.substring(0, 10) + '...'
                                        : bundesland;
                                    return `${shortName} (${(percent * 100).toFixed(1)}%)`;
                                }}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="spend"
                            >
                                {processedData.bundeslandData.slice(0, 8).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#FFFFFF',
                                    borderColor: '#E5E7EB',
                                    color: '#1A1A1A',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                formatter={(value) => `€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ marginBottom: '16px', fontSize: 'var(--font-size-base)' }}>Top Bundesländer</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                            {processedData.bundeslandData.slice(0, 8).map((bl, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '4px',
                                        backgroundColor: COLORS[index % COLORS.length],
                                        flexShrink: 0
                                    }} />
                                    <div style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}>{bl.bundesland}</div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                        €{bl.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Analysis */}
            {processedData.categoryData.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>Performance by State Size Category</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={processedData.categoryData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis
                                dataKey="category"
                                stroke="#9CA3AF"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#FFFFFF',
                                    borderColor: '#E5E7EB',
                                    color: '#1A1A1A',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                formatter={(value, name) => {
                                    if (name === 'spend') {
                                        return [`€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Spend'];
                                    }
                                    return [value.toLocaleString(), name.toUpperCase()];
                                }}
                            />
                            <Legend />
                            <Bar dataKey="spend" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="xrp" fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="reach" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Top Bundesländer by Spend */}
            <div className="card">
                <h3 style={{ marginBottom: '24px' }}>Top 10 Bundesländer by Spend</h3>
                <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={processedData.bundeslandData.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                        <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis
                            dataKey="bundesland"
                            type="category"
                            stroke="#9CA3AF"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            width={150}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#FFFFFF',
                                borderColor: '#E5E7EB',
                                color: '#1A1A1A',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            formatter={(value) => [`€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Spend']}
                        />
                        <Bar dataKey="spend" fill="#EF4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Bundesland Performance Comparison */}
            <div className="card">
                <h3 style={{ marginBottom: '24px' }}>Comprehensive Performance Metrics (Top 8)</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={processedData.bundeslandData.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis
                            dataKey="bundesland"
                            stroke="#9CA3AF"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            angle={-45}
                            textAnchor="end"
                            height={120}
                        />
                        <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#FFFFFF',
                                borderColor: '#E5E7EB',
                                color: '#1A1A1A',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            formatter={(value, name) => {
                                if (name === 'spend') {
                                    return [`€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Spend'];
                                }
                                return [value.toLocaleString(), name.toUpperCase()];
                            }}
                        />
                        <Legend />
                        <Bar dataKey="xrp" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="reach" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="airings" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Detailed Bundesland Data Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <h3 style={{ margin: 0 }}>Detailed Bundesland Data</h3>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Bundesland</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Spend</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>XRP</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Reach</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Airings</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Cost/XRP</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Cost/Reach</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Market Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.bundeslandData.map((bl, index) => (
                                <tr
                                    key={index}
                                    style={{
                                        borderBottom: '1px solid var(--border-subtle)',
                                        backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)'
                                    }}
                                >
                                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{bl.bundesland}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        €{bl.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        {bl.xrp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        {bl.reach.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        {bl.airings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        €{bl.xrp > 0 ? (bl.spend / bl.xrp).toFixed(4) : '0.0000'}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        €{bl.reach > 0 ? (bl.spend / bl.reach).toFixed(4) : '0.0000'}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        {((bl.spend / processedData.totalSpend) * 100).toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
