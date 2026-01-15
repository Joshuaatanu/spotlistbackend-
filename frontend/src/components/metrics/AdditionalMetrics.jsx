import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#FCD34D', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export function DaypartAnalysis({ data, daypartField, costField, xrpField, reachField }) {
    if (!daypartField || !data || data.length === 0) return null;

    const daypartData = data.reduce((acc, spot) => {
        const daypart = spot[daypartField] || 'Unknown';
        if (!acc[daypart]) {
            acc[daypart] = { daypart, spend: 0, spots: 0, xrp: 0, reach: 0, doubleSpend: 0, doubleSpots: 0 };
        }
        const cost = spot.cost_numeric || spot[costField] || 0;
        acc[daypart].spend += cost;
        acc[daypart].spots += 1;
        if (spot.is_double) {
            acc[daypart].doubleSpend += cost;
            acc[daypart].doubleSpots += 1;
        }
        if (xrpField && spot.xrp_numeric !== undefined) {
            acc[daypart].xrp += spot.xrp_numeric || 0;
        }
        if (reachField && spot.reach_numeric !== undefined) {
            acc[daypart].reach += spot.reach_numeric || 0;
        }
        return acc;
    }, {});

    const chartData = Object.values(daypartData)
        .map(d => ({
            ...d,
            doublePercent: d.spots > 0 ? (d.doubleSpots / d.spots * 100) : 0
        }))
        .sort((a, b) => {
            // Sort by daypart order (morning, afternoon, evening, night)
            const order = ['06 - 09', '09 - 13', '13 - 17', '17 - 21', '21 - 24', '00 - 06'];
            const aIdx = order.indexOf(a.daypart);
            const bIdx = order.indexOf(b.daypart);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return a.daypart.localeCompare(b.daypart);
        });

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="daypart" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#1A1A1A', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value, name) => {
                        if (name === 'spend') return [`€${value.toLocaleString()}`, 'Spend'];
                        if (name === 'doubleSpend') return [`€${value.toLocaleString()}`, 'Double Booking Spend'];
                        if (name === 'spots') return [value, 'Spots'];
                        if (name === 'doubleSpots') return [value, 'Double Spots'];
                        return [value, name];
                    }}
                />
                <Bar dataKey="spend" fill="#FCD34D" radius={[4, 4, 0, 0]} />
                <Bar dataKey="doubleSpend" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function ChannelPerformance({ data, programField, costField, xrpField, reachField }) {
    if (!programField || !data || data.length === 0) return null;

    const channelData = data.reduce((acc, spot) => {
        const channel = spot[programField] || spot.program_original || spot.program_norm || 'Unknown';
        if (!acc[channel]) {
            acc[channel] = { channel, spend: 0, spots: 0, xrp: 0, reach: 0, doubleSpend: 0, doubleSpots: 0 };
        }
        const cost = spot.cost_numeric || spot[costField] || 0;
        acc[channel].spend += cost;
        acc[channel].spots += 1;
        if (spot.is_double) {
            acc[channel].doubleSpend += cost;
            acc[channel].doubleSpots += 1;
        }
        if (xrpField && spot.xrp_numeric !== undefined) {
            acc[channel].xrp += spot.xrp_numeric || 0;
        }
        if (reachField && spot.reach_numeric !== undefined) {
            acc[channel].reach += spot.reach_numeric || 0;
        }
        return acc;
    }, {});

    const chartData = Object.values(channelData)
        .map(d => ({
            ...d,
            efficiency: d.xrp > 0 ? (d.spend / d.xrp) : (d.reach > 0 ? (d.spend / d.reach) : 0),
            doublePercent: d.spots > 0 ? (d.doubleSpots / d.spots * 100) : 0
        }))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 10); // Top 10 channels

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="channel" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#1A1A1A', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value, name) => {
                        if (name === 'spend') return [`€${value.toLocaleString()}`, 'Spend'];
                        if (name === 'doubleSpend') return [`€${value.toLocaleString()}`, 'Double Booking Spend'];
                        if (name === 'xrp') return [value.toLocaleString(undefined, { maximumFractionDigits: 1 }), 'XRP'];
                        if (name === 'reach') return [value.toLocaleString(undefined, { maximumFractionDigits: 1 }), 'Reach'];
                        return [value, name];
                    }}
                />
                <Bar dataKey="spend" fill="#FCD34D" radius={[4, 4, 0, 0]} />
                <Bar dataKey="doubleSpend" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function EPGCategoryBreakdown({ data, categoryField, costField }) {
    if (!categoryField || !data || data.length === 0) return null;

    const categoryData = data.reduce((acc, spot) => {
        const category = spot[categoryField] || 'Unknown';
        if (!acc[category]) {
            acc[category] = { category, spend: 0, spots: 0, doubleSpend: 0, doubleSpots: 0 };
        }
        const cost = spot.cost_numeric || spot[costField] || 0;
        acc[category].spend += cost;
        acc[category].spots += 1;
        if (spot.is_double) {
            acc[category].doubleSpend += cost;
            acc[category].doubleSpots += 1;
        }
        return acc;
    }, {});

    const chartData = Object.values(categoryData)
        .map(d => ({
            ...d,
            doublePercent: d.spots > 0 ? (d.doubleSpots / d.spots * 100) : 0
        }))
        .sort((a, b) => b.spend - a.spend);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="spend"
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#1A1A1A', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value) => `€${value.toLocaleString()}`}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
