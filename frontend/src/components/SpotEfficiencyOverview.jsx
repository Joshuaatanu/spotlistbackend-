import { useMemo } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function SpotEfficiencyOverview({ metrics, data }) {
    const efficiencyData = useMemo(() => {
        if (!metrics || !data) return null;
        
        const totalSpots = metrics.total_spots || 0;
        const efficientSpots = metrics.efficient_spots || 0;
        const doubleSpots = metrics.double_spots || 0;
        const totalCost = metrics.total_cost || 0;
        const efficientCost = metrics.efficient_cost || 0;
        const doubleCost = metrics.double_cost || 0;
        
        // Calculate low incremental reach spots (spots that are not double but have low reach)
        // For now, we'll estimate: spots that are not double but have <5% incremental value
        // This is a simplified calculation - in reality, you'd need reach overlap data
        const lowIncrementalSpots = Math.max(0, totalSpots - efficientSpots - doubleSpots);
        const lowIncrementalCost = Math.max(0, totalCost - efficientCost - doubleCost);
        
        return {
            totalSpots,
            efficientSpots,
            doubleSpots,
            lowIncrementalSpots,
            totalCost,
            efficientCost,
            doubleCost,
            lowIncrementalCost,
            efficientPercent: (efficientSpots / totalSpots * 100) || 0,
            doublePercent: (doubleSpots / totalSpots * 100) || 0,
            lowIncrementalPercent: (lowIncrementalSpots / totalSpots * 100) || 0,
        };
    }, [metrics, data]);

    if (!efficiencyData) return null;

    const chartData = [
        {
            name: 'Efficient Spots',
            spots: efficiencyData.efficientSpots,
            cost: efficiencyData.efficientCost,
            percent: efficiencyData.efficientPercent,
            color: '#10B981' // green
        },
        {
            name: 'Double Bookings',
            spots: efficiencyData.doubleSpots,
            cost: efficiencyData.doubleCost,
            percent: efficiencyData.doublePercent,
            color: '#EF4444' // red
        },
        {
            name: 'Low Incremental',
            spots: efficiencyData.lowIncrementalSpots,
            cost: efficiencyData.lowIncrementalCost,
            percent: efficiencyData.lowIncrementalPercent,
            color: '#F59E0B' // amber
        }
    ];

    return (
        <div className="card">
            <h3 style={{ marginBottom: '24px' }}>
                Spot Efficiency Overview
            </h3>
            
            {/* Summary Table */}
            <div style={{ marginBottom: '32px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ textAlign: 'left', padding: '12px', fontSize: '14px', fontWeight: 600 }}>Category</th>
                            <th style={{ textAlign: 'right', padding: '12px', fontSize: '14px', fontWeight: 600 }}>Spots</th>
                            <th style={{ textAlign: 'right', padding: '12px', fontSize: '14px', fontWeight: 600 }}>%</th>
                            <th style={{ textAlign: 'right', padding: '12px', fontSize: '14px', fontWeight: 600 }}>Cost</th>
                            <th style={{ textAlign: 'right', padding: '12px', fontSize: '14px', fontWeight: 600 }}>%</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={16} color="#10B981" />
                                <span>Efficient Spots</span>
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px' }}>{efficiencyData.efficientSpots.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#10B981', fontWeight: 600 }}>
                                {efficiencyData.efficientPercent.toFixed(1)}%
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px' }}>
                                €{efficiencyData.efficientCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#10B981', fontWeight: 600 }}>
                                {efficiencyData.totalCost > 0 ? ((efficiencyData.efficientCost / efficiencyData.totalCost) * 100).toFixed(1) : '0.0'}%
                            </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <XCircle size={16} color="#EF4444" />
                                <span>Double Bookings</span>
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px' }}>{efficiencyData.doubleSpots.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#EF4444', fontWeight: 600 }}>
                                {efficiencyData.doublePercent.toFixed(1)}%
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px' }}>
                                €{efficiencyData.doubleCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#EF4444', fontWeight: 600 }}>
                                {efficiencyData.totalCost > 0 ? ((efficiencyData.doubleCost / efficiencyData.totalCost) * 100).toFixed(1) : '0.0'}%
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={16} color="#F59E0B" />
                                <span>Low Incremental Reach</span>
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px' }}>{efficiencyData.lowIncrementalSpots.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#F59E0B', fontWeight: 600 }}>
                                {efficiencyData.lowIncrementalPercent.toFixed(1)}%
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px' }}>
                                €{efficiencyData.lowIncrementalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#F59E0B', fontWeight: 600 }}>
                                {efficiencyData.totalCost > 0 ? ((efficiencyData.lowIncrementalCost / efficiencyData.totalCost) * 100).toFixed(1) : '0.0'}%
                            </td>
                        </tr>
                        <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 700 }}>
                            <td style={{ padding: '12px' }}>Total</td>
                            <td style={{ textAlign: 'right', padding: '12px' }}>{efficiencyData.totalSpots.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', padding: '12px' }}>100%</td>
                            <td style={{ textAlign: 'right', padding: '12px' }}>
                                €{efficiencyData.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px' }}>100%</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Chart */}
            <div style={{ marginTop: '32px' }}>
                <h4 style={{ marginBottom: '16px' }}>Distribution by Cost</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" />
                        <YAxis stroke="var(--text-secondary)" />
                        <Tooltip 
                            formatter={(value) => `€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                        />
                        <Bar dataKey="cost">
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Evaluation Note */}
            <div style={{ 
                marginTop: '24px', 
                padding: '16px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '8px',
                fontSize: '14px',
                color: 'var(--text-secondary)'
            }}>
                <strong>Evaluation:</strong> Industry standard recommends keeping double bookings below 5% of total spots. 
                {efficiencyData.doublePercent > 5 ? (
                    <span style={{ color: '#EF4444', fontWeight: 600 }}>
                        {' '}Your double booking rate of {efficiencyData.doublePercent.toFixed(1)}% exceeds this threshold.
                    </span>
                ) : (
                    <span style={{ color: '#10B981', fontWeight: 600 }}>
                        {' '}Your double booking rate of {efficiencyData.doublePercent.toFixed(1)}% is within acceptable limits.
                    </span>
                )}
            </div>
        </div>
    );
}

