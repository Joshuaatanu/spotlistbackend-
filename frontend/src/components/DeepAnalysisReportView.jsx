import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Activity, TrendingUp, Target, Users, BarChart3 } from 'lucide-react';

export default function DeepAnalysisReportView({ data, reportType }) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <Activity size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px' }} />
                <p className="text-secondary">No Deep Analysis data available.</p>
            </div>
        );
    }

    // KPI fields that might be in the data
    const kpiFields = [
        'amr-perc', 'amr_perc', 'amr',
        'reach (%)', 'reach_perc', 'reach',
        'reach-avg', 'reach_avg',
        'share',
        'ats-avg', 'ats_avg',
        'atv-avg', 'atv_avg',
        'airings'
    ];

    // Find which KPIs are present in the data
    const availableKPIs = kpiFields.filter(kpi => 
        data.some(item => Object.keys(item).some(key => 
            key.toLowerCase().includes(kpi.toLowerCase().replace(/[-\s]/g, ''))
        ))
    );

    // Get channel/entity identifier
    const entityKey = Object.keys(data[0] || {}).find(k => 
        ['channel', 'event', 'name', 'label', 'caption'].includes(k.toLowerCase())
    ) || 'channel';

    // Prepare data for charts
    const chartData = data.map(item => {
        const result = {
            name: item[entityKey] || item.channel || item.event || 'Unknown',
            ...item
        };
        
        // Normalize KPI field names
        kpiFields.forEach(kpi => {
            const key = Object.keys(item).find(k => 
                k.toLowerCase().includes(kpi.toLowerCase().replace(/[-\s]/g, ''))
            );
            if (key && key !== entityKey) {
                result[kpi] = parseFloat(item[key] || 0);
            }
        });
        
        return result;
    });

    // Prepare radar chart data (for first channel/entity)
    const firstEntity = chartData[0];
    const radarData = availableKPIs.slice(0, 6).map(kpi => {
        const value = firstEntity[kpi] || 0;
        const maxValue = Math.max(...chartData.map(d => d[kpi] || 0));
        return {
            kpi: kpi.replace(/[-_]/g, ' ').toUpperCase(),
            value: maxValue > 0 ? (value / maxValue) * 100 : 0,
            actual: value
        };
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-m)', marginBottom: 'var(--space-l)' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Activity size={28} style={{ color: '#10B981' }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, marginBottom: '4px' }}>Deep Analysis (KPIs)</h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Channel/Event analysis with key performance indicators
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards */}
            {firstEntity && (
                <div className="grid grid-cols-4" style={{ gap: '24px' }}>
                    {firstEntity['amr-perc'] !== undefined && (
                        <div className="card">
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                AMR %
                            </div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {firstEntity['amr-perc'].toFixed(2)}%
                            </div>
                        </div>
                    )}
                    {firstEntity['reach (%)'] !== undefined && (
                        <div className="card">
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Reach %
                            </div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {firstEntity['reach (%)'].toFixed(2)}%
                            </div>
                        </div>
                    )}
                    {firstEntity.share !== undefined && (
                        <div className="card">
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Share
                            </div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {firstEntity.share.toFixed(2)}%
                            </div>
                        </div>
                    )}
                    {firstEntity.airings !== undefined && (
                        <div className="card">
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Airings
                            </div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {firstEntity.airings.toLocaleString()}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Radar Chart for KPI Overview */}
            {radarData.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>KPI Overview - {firstEntity?.name}</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="kpi" style={{ fontSize: '12px' }} />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} />
                            <Radar 
                                name="KPI Value" 
                                dataKey="value" 
                                stroke="#10B981" 
                                fill="#10B981" 
                                fillOpacity={0.6} 
                            />
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: '#FFFFFF', 
                                    borderColor: '#E5E7EB', 
                                    color: '#1A1A1A', 
                                    borderRadius: '8px', 
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                                }}
                                formatter={(value, name, props) => [
                                    `${props.payload.actual.toFixed(2)} (${value.toFixed(1)}% of max)`,
                                    props.payload.kpi
                                ]}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Channel Comparison Chart */}
            {chartData.length > 1 && (
                <div className="card">
                    <h3 style={{ marginBottom: '24px' }}>Channel Comparison</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData}>
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
                                    color: '#1A1A1A', 
                                    borderRadius: '8px', 
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                                }}
                            />
                            <Legend />
                            {availableKPIs.slice(0, 4).map((kpi, index) => (
                                <Bar 
                                    key={kpi}
                                    dataKey={kpi} 
                                    fill={['#10B981', '#3B82F6', '#F59E0B', '#EF4444'][index % 4]}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Detailed KPI Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <h3 style={{ margin: 0 }}>Detailed KPI Data</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                    {entityKey.charAt(0).toUpperCase() + entityKey.slice(1)}
                                </th>
                                {availableKPIs.map(kpi => (
                                    <th key={kpi} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                        {kpi.replace(/[-_]/g, ' ').toUpperCase()}
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
                                        backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)'
                                    }}
                                >
                                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.name}</td>
                                    {availableKPIs.map(kpi => (
                                        <td key={kpi} style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {item[kpi] !== undefined 
                                                ? (kpi.includes('%') || kpi.includes('perc') || kpi === 'share'
                                                    ? `${parseFloat(item[kpi] || 0).toFixed(2)}%`
                                                    : parseFloat(item[kpi] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                )
                                                : '-'
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




