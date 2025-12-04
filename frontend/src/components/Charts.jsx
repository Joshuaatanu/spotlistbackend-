import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const toNumberSafe = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value === null || value === undefined) return 0;

    const normalized = String(value)
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^0-9.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

export function DoubleSpendChart({ data, costField, programField }) {
    // Aggregate data by channel using backend-provided field hints
    const channelData = data.reduce((acc, spot) => {
        const channel = spot?.[programField] || spot?.program_norm || spot?.program_original || 'Unknown';
        const rawCost = spot?.cost_numeric ?? (costField ? spot?.[costField] : undefined);
        const cost = toNumberSafe(rawCost);

        acc[channel] = (acc[channel] || 0) + cost;
        return acc;
    }, {});

    const chartData = Object.entries(channelData)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FCD34D" stopOpacity={1}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={1}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis 
                    dataKey="name" 
                    stroke="#9CA3AF" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#6B7280' }}
                />
                <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `€${value / 1000}k`} 
                    tick={{ fill: '#6B7280' }}
                />
                <Tooltip
                    cursor={{ fill: '#F9FAFB' }}
                    contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        borderColor: '#E5E7EB', 
                        color: '#1A1A1A', 
                        borderRadius: '8px', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        padding: '12px'
                    }}
                    itemStyle={{ color: '#1A1A1A', fontWeight: 600 }}
                    formatter={(value) => [`€${value.toLocaleString()}`, 'Spend']}
                />
                <Bar 
                    dataKey="value" 
                    fill="url(#barGradient)" 
                    radius={[6, 6, 0, 0]} 
                    barSize={40}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function DoubleCountChart({ data, programField }) {
    // Group by date and channel
    const dateChannelData = data.reduce((acc, spot) => {
        if (!spot.timestamp) return acc;
        const date = spot.timestamp.split('T')[0];
        const channel = spot?.[programField] || spot?.program_norm || spot?.program_original || 'Unknown';
        
        if (!acc[date]) acc[date] = {};
        if (!acc[date][channel]) acc[date][channel] = 0;
        acc[date][channel]++;
        return acc;
    }, {});

    // Get all unique channels
    const channels = [...new Set(data.map(spot => 
        spot?.[programField] || spot?.program_norm || spot?.program_original || 'Unknown'
    ))].sort();

    // Get all unique dates
    const dates = Object.keys(dateChannelData).sort();

    // Prepare data for chart - show top 5 channels by total count
    const channelTotals = channels.reduce((acc, channel) => {
        acc[channel] = data.filter(spot => 
            (spot?.[programField] || spot?.program_norm || spot?.program_original || 'Unknown') === channel
        ).length;
        return acc;
    }, {});

    const topChannels = Object.entries(channelTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5) // Top 5 channels
        .map(([ch]) => ch);

    const chartData = dates.map(date => {
        const entry = { date };
        topChannels.forEach(channel => {
            entry[channel] = dateChannelData[date][channel] || 0;
        });
        return entry;
    });

    // Ricofy-inspired palette + distinct colors for lines
    const colors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444'];

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(str) => {
                        const d = new Date(str);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                    tick={{ fill: '#6B7280' }}
                    dy={10}
                />
                <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#6B7280' }}
                />
                <Tooltip
                    contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        borderColor: '#E5E7EB', 
                        borderRadius: '8px', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        color: '#1A1A1A',
                        padding: '12px'
                    }}
                    labelStyle={{ color: '#6B7280', marginBottom: '8px' }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                />
                {topChannels.map((channel, index) => (
                    <Line 
                        key={channel}
                        type="monotone" 
                        dataKey={channel} 
                        stroke={colors[index % colors.length]} 
                        strokeWidth={3} 
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name={channel}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
