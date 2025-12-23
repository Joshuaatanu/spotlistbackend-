import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Trophy, TrendingUp, DollarSign, Activity } from 'lucide-react';

export default function TopTenReportView({ data, reportType }) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <Trophy size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px' }} />
                <p className="text-secondary">No Top Ten data available.</p>
            </div>
        );
    }

    // Determine metric from data structure
    const topData = data.slice(0, 10); // Top 10
    const metricKeys = Object.keys(topData[0] || {}).filter(key => 
        !['name', 'entity', 'company', 'brand', 'product', 'caption', 'label'].includes(key.toLowerCase())
    );

    // Find the primary metric (spend, xrp, airings, reach)
    const primaryMetric = metricKeys.find(k => 
        ['spend', 'cost', 'xrp', 'airings', 'reach'].some(m => k.toLowerCase().includes(m))
    ) || metricKeys[0];

    const entityKey = Object.keys(topData[0] || {}).find(k => 
        ['name', 'entity', 'company', 'brand', 'product', 'caption', 'label'].includes(k.toLowerCase())
    ) || 'name';

    const chartData = topData.map((item, index) => ({
        rank: index + 1,
        name: item[entityKey] || item.name || item.entity || 'Unknown',
        value: parseFloat(item[primaryMetric] || 0),
        ...item
    }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-m)', marginBottom: 'var(--space-l)' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(251, 191, 36, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Trophy size={28} style={{ color: '#FBBF24' }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, marginBottom: '4px' }}>Top Ten Report</h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Top 10 entities ranked by {primaryMetric}
                        </p>
                    </div>
                </div>
            </div>

            {/* Top 10 Chart */}
            <div className="card">
                <h3 style={{ marginBottom: '24px' }}>Top 10 Rankings</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                        <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            stroke="#9CA3AF" 
                            fontSize={12} 
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
                            formatter={(value, name) => {
                                if (primaryMetric.includes('spend') || primaryMetric.includes('cost')) {
                                    return [`€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, primaryMetric];
                                }
                                return [value.toLocaleString(), primaryMetric];
                            }}
                        />
                        <Bar 
                            dataKey="value" 
                            fill="#FBBF24" 
                            radius={[0, 4, 4, 0]}
                            label={{ position: 'right', formatter: (v) => {
                                if (primaryMetric.includes('spend') || primaryMetric.includes('cost')) {
                                    return `€${v.toLocaleString()}`;
                                }
                                return v.toLocaleString();
                            }}}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Top 10 Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <h3 style={{ margin: 0 }}>Detailed Rankings</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Rank</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Entity</th>
                                {metricKeys.map(key => (
                                    <th key={key} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                        {key.charAt(0).toUpperCase() + key.slice(1)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {chartData.map((item, index) => (
                                <tr 
                                    key={index}
                                    style={{ 
                                        borderBottom: '1px solid var(--border-subtle)',
                                        backgroundColor: index < 3 ? 'rgba(251, 191, 36, 0.05)' : 'transparent'
                                    }}
                                >
                                    <td style={{ padding: '12px 16px', fontWeight: index < 3 ? 700 : 500, color: index < 3 ? '#FBBF24' : 'var(--text-primary)' }}>
                                        {index === 0 && '🥇'}
                                        {index === 1 && '🥈'}
                                        {index === 2 && '🥉'}
                                        {index >= 3 && `#${item.rank}`}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.name}</td>
                                    {metricKeys.map(key => (
                                        <td key={key} style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {key.toLowerCase().includes('spend') || key.toLowerCase().includes('cost')
                                                ? `€${parseFloat(item[key] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                : parseFloat(item[key] || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })
                                            }
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




