import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export function DurationAnalysis({ data, durationField, costField, isDoubleOnly = false }) {
    if (!durationField || !data || data.length === 0) return null;

    const filteredData = isDoubleOnly ? data.filter(d => d.is_double) : data;

    // Duration distribution
    const durationBins = {
        '0-5': { min: 0, max: 5, count: 0, spend: 0, xrp: 0 },
        '6-10': { min: 6, max: 10, count: 0, spend: 0, xrp: 0 },
        '11-15': { min: 11, max: 15, count: 0, spend: 0, xrp: 0 },
        '16-20': { min: 16, max: 20, count: 0, spend: 0, xrp: 0 },
        '21-30': { min: 21, max: 30, count: 0, spend: 0, xrp: 0 },
        '31+': { min: 31, max: Infinity, count: 0, spend: 0, xrp: 0 }
    };

    filteredData.forEach(spot => {
        const duration = parseFloat(spot[durationField] || spot.Duration || 0);
        const cost = spot.cost_numeric || spot[costField] || spot.Spend || 0;
        const xrp = spot.xrp_numeric || spot.XRP || 0;

        for (const [bin, range] of Object.entries(durationBins)) {
            if (duration >= range.min && duration <= range.max) {
                range.count++;
                range.spend += cost;
                range.xrp += xrp;
                break;
            }
        }
    });

    const chartData = Object.entries(durationBins).map(([bin, data]) => ({
        duration: bin,
        spots: data.count,
        spend: data.spend,
        avgSpend: data.count > 0 ? data.spend / data.count : 0,
        xrp: data.xrp,
        costPerSecond: data.spend > 0 && data.count > 0 
            ? data.spend / (data.count * ((durationBins[bin].min + durationBins[bin].max) / 2))
            : 0
    }));

    // Calculate averages
    const totalDuration = filteredData.reduce((sum, s) => sum + parseFloat(s[durationField] || s.Duration || 0), 0);
    const avgDuration = filteredData.length > 0 ? totalDuration / filteredData.length : 0;
    const totalSpend = filteredData.reduce((sum, s) => sum + (s.cost_numeric || s[costField] || s.Spend || 0), 0);
    const avgCostPerSecond = totalDuration > 0 ? totalSpend / totalDuration : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Summary Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <div style={{ 
                    padding: '24px', 
                    backgroundColor: '#FFF', 
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                        Average Duration
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {avgDuration.toFixed(1)}s
                    </div>
                </div>
                <div style={{ 
                    padding: '24px', 
                    backgroundColor: '#FFF', 
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                        Total Duration
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {(totalDuration / 60).toFixed(1)} min
                    </div>
                </div>
                <div style={{ 
                    padding: '24px', 
                    backgroundColor: '#FFF', 
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                        Cost per Second
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        €{avgCostPerSecond.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Duration Distribution Chart */}
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="duration" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#1A1A1A', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value, name) => {
                            if (name === 'spots') return [value, 'Spots'];
                            if (name === 'spend') return [`€${value.toLocaleString()}`, 'Spend'];
                            if (name === 'avgSpend') return [`€${value.toLocaleString()}`, 'Avg Spend'];
                            return [value, name];
                        }}
                    />
                    <Bar dataKey="spots" fill="#FCD34D" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spend" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>

            {/* Cost Efficiency by Duration */}
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="duration" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#1A1A1A', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value) => `€${value.toFixed(2)}`}
                    />
                    <Line type="monotone" dataKey="costPerSecond" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B' }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
