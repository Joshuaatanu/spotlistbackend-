import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

export default function FairShareAnalysis({ metrics, data, programField }) {
    const fairShareData = useMemo(() => {
        if (!metrics?.station_fair_share || !programField) return null;
        
        return Object.entries(metrics.station_fair_share)
            .map(([station, data]) => ({
                station: station.length > 15 ? station.substring(0, 15) + '...' : station,
                stationFull: station,
                actual: data.actual_percent,
                fairShare: data.fair_share_percent,
                difference: data.difference,
                spots: data.spots
            }))
            .sort((a, b) => b.spots - a.spots)
            .slice(0, 15); // Top 15 stations
    }, [metrics, programField]);

    if (!fairShareData || fairShareData.length === 0) return null;

    return (
        <div className="card">
            <h3 style={{ marginBottom: '24px' }}>
                Fair Share Analysis by Station
            </h3>
            <p style={{ 
                marginBottom: '24px', 
                fontSize: '14px', 
                color: 'var(--text-secondary)' 
            }}>
                Compares actual station distribution against fair share (equal distribution). 
                Positive values indicate over-allocation, negative values indicate under-allocation.
            </p>

            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={fairShareData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis type="number" stroke="var(--text-secondary)" />
                    <YAxis 
                        dataKey="station" 
                        type="category" 
                        width={120}
                        stroke="var(--text-secondary)"
                    />
                    <Tooltip 
                        formatter={(value, name) => {
                            if (name === 'difference') {
                                return [`${value > 0 ? '+' : ''}${value.toFixed(1)}%`, 'Difference'];
                            }
                            return [`${value.toFixed(1)}%`, name === 'actual' ? 'Actual' : 'Fair Share'];
                        }}
                        contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                    />
                    <Legend />
                    <Bar dataKey="fairShare" fill="#E5E7EB" name="Fair Share" />
                    <Bar dataKey="actual" fill="#3B82F6" name="Actual" />
                    <Bar dataKey="difference">
                        {fairShareData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.difference > 0 ? '#EF4444' : entry.difference < -5 ? '#F59E0B' : '#10B981'} 
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <div style={{ 
                marginTop: '24px', 
                padding: '16px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '8px',
                fontSize: '14px',
                color: 'var(--text-secondary)'
            }}>
                <strong>Evaluation:</strong> Stations with significant deviations from fair share may indicate 
                over-concentration or missed opportunities. Consider rebalancing if differences exceed ±10%.
            </div>
        </div>
    );
}

