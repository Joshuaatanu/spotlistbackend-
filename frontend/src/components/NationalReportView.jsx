import { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Globe, TrendingUp, DollarSign, Users, BarChart3, Activity, Award, Target } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function NationalReportView({ data, reportType }) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <Globe size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px' }} />
                <p className="text-secondary">No National Report data available.</p>
            </div>
        );
    }

    // Process data for national-level insights
    const processedData = useMemo(() => {
        // Calculate aggregated metrics
        const totalSpend = data.reduce((sum, item) => sum + (parseFloat(item.spend || item.Spend || item.cost || 0)), 0);
        const totalXRP = data.reduce((sum, item) => sum + (parseFloat(item.xrp || item.XRP || 0)), 0);
        const totalReach = data.reduce((sum, item) => sum + (parseFloat(item.reach || item.Reach || 0)), 0);
        const totalAirings = data.reduce((sum, item) => sum + (parseInt(item.airings || item.Airings || 0)), 0);

        // Group by time period if available
        const byPeriod = {};
        const byChannel = {};
        const byIndustry = {};
        const byDaypart = {};

        data.forEach(item => {
            // By period (date/week/month)
            const period = item.date || item.Date || item.period || item.Period || 'Total';
            if (!byPeriod[period]) {
                byPeriod[period] = { period, spend: 0, xrp: 0, reach: 0, airings: 0 };
            }
            byPeriod[period].spend += parseFloat(item.spend || item.Spend || item.cost || 0);
            byPeriod[period].xrp += parseFloat(item.xrp || item.XRP || 0);
            byPeriod[period].reach += parseFloat(item.reach || item.Reach || 0);
            byPeriod[period].airings += parseInt(item.airings || item.Airings || 0);

            // By channel
            const channel = item.channel || item.Channel || item.sender || 'Unknown';
            if (!byChannel[channel]) {
                byChannel[channel] = { name: channel, spend: 0, xrp: 0, share: 0 };
            }
            byChannel[channel].spend += parseFloat(item.spend || item.Spend || item.cost || 0);
            byChannel[channel].xrp += parseFloat(item.xrp || item.XRP || 0);

            // By industry if available
            const industry = item.industry || item.Industry || 'Other';
            if (!byIndustry[industry]) {
                byIndustry[industry] = { name: industry, value: 0, count: 0 };
            }
            byIndustry[industry].value += parseFloat(item.spend || item.Spend || item.cost || 0);
            byIndustry[industry].count += 1;

            // By daypart if available
            const daypart = item.daypart || item.Daypart || item['Airing daypart'];
            if (daypart) {
                if (!byDaypart[daypart]) {
                    byDaypart[daypart] = { name: daypart, spend: 0, airings: 0 };
                }
                byDaypart[daypart].spend += parseFloat(item.spend || item.Spend || item.cost || 0);
                byDaypart[daypart].airings += parseInt(item.airings || item.Airings || 1);
            }
        });

        // Calculate market shares for channels
        Object.values(byChannel).forEach(ch => {
            ch.share = totalSpend > 0 ? (ch.spend / totalSpend) * 100 : 0;
        });

        return {
            totalSpend,
            totalXRP,
            totalReach,
            totalAirings,
            costPerXRP: totalXRP > 0 ? totalSpend / totalXRP : 0,
            costPerReach: totalReach > 0 ? totalSpend / totalReach : 0,
            periodData: Object.values(byPeriod).sort((a, b) => a.period.localeCompare(b.period)),
            channelData: Object.values(byChannel).sort((a, b) => b.spend - a.spend).slice(0, 10),
            industryData: Object.values(byIndustry).sort((a, b) => b.value - a.value).slice(0, 8),
            daypartData: Object.values(byDaypart).sort((a, b) => b.spend - a.spend),
        };
    }, [data]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-m)', marginBottom: 'var(--space-l)' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Globe size={28} style={{ color: '#3B82F6' }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, marginBottom: '4px' }}>National Market Analysis</h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Comprehensive national-level advertising market insights
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
                            Total National Spend
                        </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        €{processedData.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                {processedData.totalXRP > 0 && (
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', marginBottom: 'var(--space-s)' }}>
                            <TrendingUp size={20} style={{ color: 'var(--accent-primary)' }} />
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                Total XRP
                            </div>
                        </div>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {processedData.totalXRP.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </div>
                    </div>
                )}
                {processedData.totalReach > 0 && (
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
                )}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', marginBottom: 'var(--space-s)' }}>
                        <Target size={20} style={{ color: 'var(--accent-primary)' }} />
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            Total Airings
                        </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {processedData.totalAirings.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Efficiency Metrics */}
            {(processedData.costPerXRP > 0 || processedData.costPerReach > 0) && (
                <div className="grid grid-cols-2" style={{ gap: '24px' }}>
                    {processedData.costPerXRP > 0 && (
                        <div className="card">
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                National Cost per XRP
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                €{processedData.costPerXRP.toFixed(4)}
                            </div>
                        </div>
                    )}
                    {processedData.costPerReach > 0 && (
                        <div className="card">
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                National Cost per Reach
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                €{processedData.costPerReach.toFixed(4)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Trend Over Time */}
            {processedData.periodData.length > 1 && (
                <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>National Advertising Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
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
                                    if (name === 'spend') return [`€${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Spend'];
                                    if (name === 'xrp') return [parseFloat(value).toLocaleString(undefined, { maximumFractionDigits: 1 }), 'XRP'];
                                    if (name === 'reach') return [parseFloat(value).toLocaleString(), 'Reach'];
                                    if (name === 'airings') return [parseInt(value).toLocaleString(), 'Airings'];
                                    return [value, name];
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="spend" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 4 }} name="Spend" />
                            {processedData.totalXRP > 0 && (
                                <Line type="monotone" dataKey="xrp" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} name="XRP" />
                            )}
                            {processedData.totalReach > 0 && (
                                <Line type="monotone" dataKey="reach" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} name="Reach" />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Market Share by Channel */}
            <div className="grid grid-cols-2" style={{ gap: '32px' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>National Market Share by Channel</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={processedData.channelData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, share }) => `${name}: ${share.toFixed(1)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="share"
                            >
                                {processedData.channelData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#FFFFFF',
                                    borderColor: '#E5E7EB',
                                    borderRadius: '8px'
                                }}
                                formatter={(value) => `${parseFloat(value).toFixed(2)}%`}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Channels by Spend */}
                <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>Top Channels by Spend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={processedData.channelData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                            <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis
                                dataKey="name"
                                type="category"
                                stroke="#9CA3AF"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                width={100}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#FFFFFF',
                                    borderColor: '#E5E7EB',
                                    borderRadius: '8px'
                                }}
                                formatter={(value) => [`€${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Spend']}
                            />
                            <Bar dataKey="spend" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Industry Breakdown */}
            {processedData.industryData.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>Spend by Industry</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={processedData.industryData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis
                                dataKey="name"
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
                                    borderRadius: '8px'
                                }}
                                formatter={(value) => [`€${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Spend']}
                            />
                            <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Daypart Analysis */}
            {processedData.daypartData.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>National Performance by Daypart</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={processedData.daypartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#FFFFFF',
                                    borderColor: '#E5E7EB',
                                    borderRadius: '8px'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="spend" fill="#F59E0B" name="Spend" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="airings" fill="#8B5CF6" name="Airings" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Detailed Data Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <h3 style={{ margin: 0 }}>Detailed National Data</h3>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10 }}>
                            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                {Object.keys(data[0] || {}).map(key => (
                                    <th key={key} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                        {key}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                    {Object.keys(data[0]).map(key => (
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
        </div>
    );
}
