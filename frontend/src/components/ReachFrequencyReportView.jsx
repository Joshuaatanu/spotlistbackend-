import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { Users, TrendingUp, Target } from 'lucide-react';

export default function ReachFrequencyReportView({ data, reportType }) {
    if (!data || (!Array.isArray(data) && typeof data !== 'object')) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <Users size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px' }} />
                <p className="text-secondary">No Reach & Frequency data available.</p>
            </div>
        );
    }

    // Handle different data structures
    let chartData = [];
    if (Array.isArray(data)) {
        chartData = data;
    } else if (data.reach && data.frequency) {
        // If data is structured as { reach: [...], frequency: [...] }
        chartData = data.reach.map((r, i) => ({
            frequency: i + 1,
            reach: r,
            ...(data.frequency && data.frequency[i] ? { frequencyValue: data.frequency[i] } : {})
        }));
    } else if (data.frequency_distribution) {
        // If data has frequency distribution
        chartData = Object.entries(data.frequency_distribution).map(([freq, reach]) => ({
            frequency: parseInt(freq),
            reach: reach
        })).sort((a, b) => a.frequency - b.frequency);
    }

    // Calculate cumulative reach
    const cumulativeData = chartData.map((d, i) => ({
        ...d,
        cumulativeReach: chartData.slice(0, i + 1).reduce((sum, item) => sum + (item.reach || 0), 0)
    }));

    // Find key metrics
    const totalReach = cumulativeData.length > 0 ? cumulativeData[cumulativeData.length - 1].cumulativeReach : 0;
    const avgFrequency = chartData.length > 0 
        ? chartData.reduce((sum, d) => sum + ((d.frequency || 0) * (d.reach || 0)), 0) / totalReach 
        : 0;

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
                        <Users size={28} style={{ color: '#3B82F6' }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, marginBottom: '4px' }}>Reach & Frequency Analysis</h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Audience reach and frequency distribution
                        </p>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3" style={{ gap: '24px' }}>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', marginBottom: 'var(--space-s)' }}>
                        <Users size={20} style={{ color: 'var(--accent-primary)' }} />
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            Total Reach
                        </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {totalReach.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', marginBottom: 'var(--space-s)' }}>
                        <TrendingUp size={20} style={{ color: 'var(--accent-primary)' }} />
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            Average Frequency
                        </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {avgFrequency.toFixed(2)}x
                    </div>
                </div>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', marginBottom: 'var(--space-s)' }}>
                        <Target size={20} style={{ color: 'var(--accent-primary)' }} />
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            Max Frequency
                        </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {chartData.length > 0 ? Math.max(...chartData.map(d => d.frequency || 0)) : 0}x
                    </div>
                </div>
            </div>

            {/* Frequency Distribution Chart */}
            <div className="card">
                <h3 style={{ marginBottom: '24px' }}>Reach by Frequency</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis 
                            dataKey="frequency" 
                            stroke="#9CA3AF" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            label={{ value: 'Frequency', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                            stroke="#9CA3AF" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            label={{ value: 'Reach', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                            contentStyle={{ 
                                backgroundColor: '#FFFFFF', 
                                borderColor: '#E5E7EB', 
                                color: '#1A1A1A', 
                                borderRadius: '8px', 
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                            }}
                            formatter={(value) => [value.toLocaleString(), 'Reach']}
                        />
                        <Bar dataKey="reach" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Cumulative Reach Chart */}
            <div className="card">
                <h3 style={{ marginBottom: '24px' }}>Cumulative Reach</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={cumulativeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis 
                            dataKey="frequency" 
                            stroke="#9CA3AF" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            label={{ value: 'Frequency', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                            stroke="#9CA3AF" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            label={{ value: 'Cumulative Reach', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                            contentStyle={{ 
                                backgroundColor: '#FFFFFF', 
                                borderColor: '#E5E7EB', 
                                color: '#1A1A1A', 
                                borderRadius: '8px', 
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                            }}
                            formatter={(value) => [value.toLocaleString(), 'Cumulative Reach']}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="cumulativeReach" 
                            stroke="#3B82F6" 
                            strokeWidth={3}
                            dot={{ fill: '#3B82F6', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}


