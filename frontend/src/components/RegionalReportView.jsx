import { useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { MapPin, TrendingUp, DollarSign, Activity, Users, Target } from 'lucide-react';

export default function RegionalReportView({ data, reportType }) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <MapPin size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px' }} />
                <p className="text-secondary">No Regional data available.</p>
            </div>
        );
    }

    const processedData = useMemo(() => {
        // Identify region field
        const regionKey = Object.keys(data[0] || {}).find(k =>
            ['region', 'regional', 'area', 'territory', 'zone'].includes(k.toLowerCase())
        ) || 'region';

        // Aggregate metrics by region
        const regionalAggregation = data.reduce((acc, item) => {
            const region = item[regionKey] || 'Unknown';
            if (!acc[region]) {
                acc[region] = {
                    region,
                    spend: 0,
                    xrp: 0,
                    reach: 0,
                    airings: 0,
                    count: 0
                };
            }
            acc[region].spend += parseFloat(item.spend || item.Spend || item.cost || 0);
            acc[region].xrp += parseFloat(item.xrp || item.XRP || 0);
            acc[region].reach += parseFloat(item.reach || item.Reach || 0);
            acc[region].airings += parseFloat(item.airings || item.Airings || item.spots || 0);
            acc[region].count += 1;
            return acc;
        }, {});

        const regionalData = Object.values(regionalAggregation)
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

        // Aggregate by channel within regions (top regions only)
        const topRegions = regionalData.slice(0, 5);
        const channelKey = Object.keys(data[0] || {}).find(k =>
            ['channel', 'station', 'network'].includes(k.toLowerCase())
        );

        let regionalChannelData = [];
        if (channelKey) {
            topRegions.forEach(regionInfo => {
                const regionItems = data.filter(item => (item[regionKey] || 'Unknown') === regionInfo.region);
                const channelAgg = regionItems.reduce((acc, item) => {
                    const channel = item[channelKey] || 'Unknown';
                    if (!acc[channel]) {
                        acc[channel] = 0;
                    }
                    acc[channel] += parseFloat(item.spend || item.Spend || item.cost || 0);
                    return acc;
                }, {});

                Object.entries(channelAgg).forEach(([channel, spend]) => {
                    regionalChannelData.push({
                        region: regionInfo.region,
                        channel,
                        spend
                    });
                });
            });
        }

        // Calculate totals
        const totalSpend = regionalData.reduce((sum, r) => sum + r.spend, 0);
        const totalXRP = regionalData.reduce((sum, r) => sum + r.xrp, 0);
        const totalReach = regionalData.reduce((sum, r) => sum + r.reach, 0);
        const totalAirings = regionalData.reduce((sum, r) => sum + r.airings, 0);

        // Calculate efficiency metrics
        const costPerXRP = totalXRP > 0 ? totalSpend / totalXRP : 0;
        const costPerReach = totalReach > 0 ? totalSpend / totalReach : 0;

        return {
            regionalData,
            periodData,
            regionalChannelData,
            topRegions,
            totalSpend,
            totalXRP,
            totalReach,
            totalAirings,
            costPerXRP,
            costPerReach,
            regionCount: regionalData.length
        };
    }, [data]);

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-m)', marginBottom: 'var(--space-l)' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <MapPin size={28} style={{ color: '#8B5CF6' }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, marginBottom: '4px' }}>Regional Market Analysis</h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Regional advertising performance across {processedData.regionCount} regions
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
                            Total Regional Spend
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

            {/* Efficiency Metrics */}
            <div className="grid grid-cols-2" style={{ gap: '24px' }}>
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
            </div>

            {/* Regional Trends Over Time */}
            {processedData.periodData.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>Regional Advertising Trends</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={processedData.periodData}>
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
                            <Line
                                type="monotone"
                                dataKey="spend"
                                stroke="#8B5CF6"
                                strokeWidth={3}
                                dot={{ fill: '#8B5CF6', r: 4 }}
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
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Regional Market Share */}
            <div className="card">
                <h3 style={{ marginBottom: '24px' }}>Market Share by Region</h3>
                <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                    <ResponsiveContainer width="50%" height={350}>
                        <PieChart>
                            <Pie
                                data={processedData.regionalData.slice(0, 8)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ region, percent }) => `${region} (${(percent * 100).toFixed(1)}%)`}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="spend"
                            >
                                {processedData.regionalData.slice(0, 8).map((entry, index) => (
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
                        <h4 style={{ marginBottom: '16px', fontSize: 'var(--font-size-base)' }}>Regional Distribution</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {processedData.regionalData.slice(0, 8).map((region, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '4px',
                                        backgroundColor: COLORS[index % COLORS.length],
                                        flexShrink: 0
                                    }} />
                                    <div style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}>{region.region}</div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                        €{region.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Regions by Spend */}
            <div className="card">
                <h3 style={{ marginBottom: '24px' }}>Top 10 Regions by Spend</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={processedData.regionalData.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                        <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis
                            dataKey="region"
                            type="category"
                            stroke="#9CA3AF"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={120}
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
                        <Bar dataKey="spend" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Regional Performance Comparison */}
            <div className="card">
                <h3 style={{ marginBottom: '24px' }}>Regional Performance Metrics</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={processedData.topRegions}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis
                            dataKey="region"
                            stroke="#9CA3AF"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            angle={-45}
                            textAnchor="end"
                            height={100}
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

            {/* Detailed Regional Data Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <h3 style={{ margin: 0 }}>Detailed Regional Data</h3>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Region</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Spend</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>XRP</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Reach</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Airings</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Cost/XRP</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Cost/Reach</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.regionalData.map((region, index) => (
                                <tr
                                    key={index}
                                    style={{
                                        borderBottom: '1px solid var(--border-subtle)',
                                        backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)'
                                    }}
                                >
                                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{region.region}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        €{region.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        {region.xrp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        {region.reach.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        {region.airings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        €{region.xrp > 0 ? (region.spend / region.xrp).toFixed(4) : '0.0000'}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        €{region.reach > 0 ? (region.spend / region.reach).toFixed(4) : '0.0000'}
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
