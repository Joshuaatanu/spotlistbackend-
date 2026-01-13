/**
 * PositionAnalyzer - Analyzes ad positions within breaks
 *
 * Features:
 * - First/Last/Middle position breakdown
 * - Performance metrics by position
 * - Double booking patterns by position
 * - Cost distribution charts
 * - Position premium calculation
 * - Breakdown by channel
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts';
import { Award, TrendingDown, TrendingUp, AlertCircle, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../ui/badge';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const POSITION_COLORS = {
    first: '#3b82f6',
    middle: '#6b7280',
    last: '#10b981'
};

const PositionAnalyzer = ({ data, fieldMap = {} }) => {
    const [showChannelBreakdown, setShowChannelBreakdown] = useState(false);

    const analysis = useMemo(() => {
        if (!data || data.length === 0) return null;

        // Detect position column
        const positionCol = Object.keys(data[0]).find(k =>
            k.toLowerCase().includes('position') ||
            k.toLowerCase().includes('pos') ||
            k.toLowerCase() === 'p'
        );

        if (!positionCol) return null;

        const reachCol = fieldMap.reach_column || Object.keys(data[0]).find(k =>
            k.toLowerCase() === 'rch' || k.toLowerCase() === 'reach'
        ) || 'RCH';
        const costCol = fieldMap.cost_column || 'cost_numeric' || 'Spend';
        const channelCol = fieldMap.program_column || 'Channel' || 'program_original';
        const isDoubleCol = 'is_double';

        // Categorize positions
        const positionStats = {
            first: { count: 0, reach: 0, cost: 0, doubles: 0 },
            middle: { count: 0, reach: 0, cost: 0, doubles: 0 },
            last: { count: 0, reach: 0, cost: 0, doubles: 0 },
        };

        // Channel breakdown
        const channelBreakdown = {};

        // Helper to categorize position
        const categorizePosition = (pos) => {
            if (pos === 1 || pos === '1' || String(pos).toLowerCase().includes('first')) {
                return 'first';
            } else if (String(pos).toLowerCase().includes('last')) {
                return 'last';
            }
            return 'middle';
        };

        data.forEach(spot => {
            const pos = spot[positionCol];
            const reach = parseFloat(spot[reachCol] || 0);
            const cost = parseFloat(spot[costCol] || spot.cost_numeric || 0);
            const isDouble = spot[isDoubleCol] === true || spot[isDoubleCol] === 'true' || spot[isDoubleCol] === 1;
            const channel = spot[channelCol] || spot.Channel || spot.program_original || 'Unknown';

            const category = categorizePosition(pos);

            positionStats[category].count++;
            positionStats[category].reach += reach;
            positionStats[category].cost += cost;
            if (isDouble) positionStats[category].doubles++;

            // Channel breakdown
            if (!channelBreakdown[channel]) {
                channelBreakdown[channel] = { first: 0, middle: 0, last: 0, total: 0, firstCost: 0, middleCost: 0, lastCost: 0 };
            }
            channelBreakdown[channel][category]++;
            channelBreakdown[channel].total++;
            channelBreakdown[channel][`${category}Cost`] += cost;
        });

        // Calculate averages and rates
        const positionData = Object.entries(positionStats).map(([position, stats]) => ({
            position: position.charAt(0).toUpperCase() + position.slice(1),
            positionKey: position,
            count: stats.count,
            totalCost: stats.cost,
            avgCost: stats.count > 0 ? stats.cost / stats.count : 0,
            avgReach: stats.count > 0 ? stats.reach / stats.count : 0,
            doubleRate: stats.count > 0 ? (stats.doubles / stats.count) * 100 : 0,
            efficiency: stats.reach / Math.max(stats.cost, 1) * 1000,
        })).filter(p => p.count > 0);

        // Calculate premiums (relative to middle)
        const middleStats = positionStats.middle;
        const middleAvgCost = middleStats.count > 0 ? middleStats.cost / middleStats.count : 0;

        const firstAvgCost = positionStats.first.count > 0 ? positionStats.first.cost / positionStats.first.count : 0;
        const lastAvgCost = positionStats.last.count > 0 ? positionStats.last.cost / positionStats.last.count : 0;

        const firstPremium = middleAvgCost > 0 ? ((firstAvgCost - middleAvgCost) / middleAvgCost) * 100 : 0;
        const lastPremium = middleAvgCost > 0 ? ((lastAvgCost - middleAvgCost) / middleAvgCost) * 100 : 0;

        // Cost distribution data for stacked bar
        const totalCost = positionStats.first.cost + positionStats.middle.cost + positionStats.last.cost;
        const costDistribution = [
            {
                name: 'First',
                value: positionStats.first.cost,
                percent: totalCost > 0 ? (positionStats.first.cost / totalCost) * 100 : 0,
                color: POSITION_COLORS.first
            },
            {
                name: 'Middle',
                value: positionStats.middle.cost,
                percent: totalCost > 0 ? (positionStats.middle.cost / totalCost) * 100 : 0,
                color: POSITION_COLORS.middle
            },
            {
                name: 'Last',
                value: positionStats.last.cost,
                percent: totalCost > 0 ? (positionStats.last.cost / totalCost) * 100 : 0,
                color: POSITION_COLORS.last
            },
        ].filter(d => d.value > 0);

        // Channel breakdown sorted by total
        const channelBreakdownArray = Object.entries(channelBreakdown)
            .map(([channel, stats]) => ({
                channel,
                ...stats,
                firstPct: stats.total > 0 ? (stats.first / stats.total) * 100 : 0,
                lastPct: stats.total > 0 ? (stats.last / stats.total) * 100 : 0,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 15); // Top 15 channels

        return {
            positionData,
            positionStats,
            firstCount: positionStats.first.count,
            middleCount: positionStats.middle.count,
            lastCount: positionStats.last.count,
            firstAvgReach: positionStats.first.count > 0 ? positionStats.first.reach / positionStats.first.count : 0,
            middleAvgReach: positionStats.middle.count > 0 ? positionStats.middle.reach / positionStats.middle.count : 0,
            lastAvgReach: positionStats.last.count > 0 ? positionStats.last.reach / positionStats.last.count : 0,
            firstAvgCost,
            middleAvgCost,
            lastAvgCost,
            firstPremium,
            lastPremium,
            totalCost,
            costDistribution,
            channelBreakdown: channelBreakdownArray,
            totalSpots: data.length,
            hasPositionData: true,
        };
    }, [data, fieldMap]);

    if (!analysis || !analysis.hasPositionData) {
        return (
            <Card className="border border-border bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-muted-foreground" />
                        Position Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="font-medium text-foreground">No position data found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                To use this analysis, add a column named "Position", "Pos", or "P" to your upload file.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards - Position Counts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-muted-foreground">First Position</div>
                            <Award className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-2xl font-semibold text-foreground tabular-nums">{analysis.firstCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Avg Reach: {analysis.firstAvgReach.toFixed(2)}% | Avg Cost: {formatCurrency(analysis.firstAvgCost)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-muted-foreground">Middle Position</div>
                            <TrendingDown className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-semibold text-foreground tabular-nums">{analysis.middleCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Avg Reach: {analysis.middleAvgReach.toFixed(2)}% | Avg Cost: {formatCurrency(analysis.middleAvgCost)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-muted-foreground">Last Position</div>
                            <Award className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="text-2xl font-semibold text-foreground tabular-nums">{analysis.lastCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Avg Reach: {analysis.lastAvgReach.toFixed(2)}% | Avg Cost: {formatCurrency(analysis.lastAvgCost)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Position Premium Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground mb-1">First Position Premium</div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-bold ${analysis.firstPremium >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {analysis.firstPremium >= 0 ? '+' : ''}{analysis.firstPremium.toFixed(1)}%
                                    </span>
                                    {analysis.firstPremium >= 0 ? (
                                        <TrendingUp className="w-5 h-5 text-red-500" />
                                    ) : (
                                        <TrendingDown className="w-5 h-5 text-green-500" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    vs. middle position avg cost
                                </p>
                            </div>
                            <DollarSign className="w-10 h-10 text-blue-500/20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground mb-1">Last Position Premium</div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-bold ${analysis.lastPremium >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {analysis.lastPremium >= 0 ? '+' : ''}{analysis.lastPremium.toFixed(1)}%
                                    </span>
                                    {analysis.lastPremium >= 0 ? (
                                        <TrendingUp className="w-5 h-5 text-red-500" />
                                    ) : (
                                        <TrendingDown className="w-5 h-5 text-green-500" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    vs. middle position avg cost
                                </p>
                            </div>
                            <DollarSign className="w-10 h-10 text-green-500/20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Position Distribution Pie */}
                <Card className="border border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-base">Position Distribution</CardTitle>
                        <CardDescription>Spot count by position</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={analysis.positionData}
                                    dataKey="count"
                                    nameKey="position"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ position, count }) => `${position}: ${count}`}
                                >
                                    {analysis.positionData.map((entry) => (
                                        <Cell key={`cell-${entry.positionKey}`} fill={POSITION_COLORS[entry.positionKey] || '#6b7280'} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '0.5rem'
                                    }}
                                    formatter={(value, name) => [value, name === 'count' ? 'Spots' : name]}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Cost Distribution Pie */}
                <Card className="border border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-base">Cost Distribution</CardTitle>
                        <CardDescription>Total spend by position ({formatCurrency(analysis.totalCost)})</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={analysis.costDistribution}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ name, percent }) => `${name}: ${percent.toFixed(1)}%`}
                                >
                                    {analysis.costDistribution.map((entry, index) => (
                                        <Cell key={`cost-cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '0.5rem'
                                    }}
                                    formatter={(value) => [formatCurrency(value), 'Cost']}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Comparison Bar Chart */}
            <Card className="border border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-base">Performance by Position</CardTitle>
                    <CardDescription>Average cost and reach comparison</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={analysis.positionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="position" stroke="hsl(var(--muted-foreground))" />
                            <YAxis
                                yAxisId="left"
                                stroke="hsl(var(--muted-foreground))"
                                tickFormatter={(v) => `${v.toFixed(0)}`}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="hsl(var(--muted-foreground))"
                                tickFormatter={(v) => `${v.toFixed(1)}%`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--popover))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '0.5rem'
                                }}
                                formatter={(value, name) => {
                                    if (name === 'avgCost') return [formatCurrency(value), 'Avg Cost'];
                                    if (name === 'avgReach') return [value.toFixed(2) + '%', 'Avg Reach'];
                                    if (name === 'doubleRate') return [value.toFixed(1) + '%', 'Double Rate'];
                                    return [value, name];
                                }}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="avgCost" name="Avg Cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="avgReach" name="Avg Reach" stroke="#10b981" strokeWidth={2} dot />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Detailed Stats Table */}
            <Card className="border border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-base">Position Performance Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-border">
                                <tr className="text-left">
                                    <th className="pb-2 font-medium text-muted-foreground">Position</th>
                                    <th className="pb-2 font-medium text-muted-foreground text-right">Spots</th>
                                    <th className="pb-2 font-medium text-muted-foreground text-right">Total Cost</th>
                                    <th className="pb-2 font-medium text-muted-foreground text-right">Avg Cost</th>
                                    <th className="pb-2 font-medium text-muted-foreground text-right">Avg Reach</th>
                                    <th className="pb-2 font-medium text-muted-foreground text-right">Double Rate</th>
                                    <th className="pb-2 font-medium text-muted-foreground text-right">Efficiency</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {analysis.positionData.map((pos, idx) => (
                                    <tr key={idx} className="hover:bg-muted/50">
                                        <td className="py-2 font-medium">
                                            <span className="flex items-center gap-2">
                                                <span
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: POSITION_COLORS[pos.positionKey] || '#6b7280' }}
                                                />
                                                {pos.position}
                                            </span>
                                        </td>
                                        <td className="py-2 text-right tabular-nums">{pos.count}</td>
                                        <td className="py-2 text-right tabular-nums">{formatCurrency(pos.totalCost)}</td>
                                        <td className="py-2 text-right tabular-nums">{formatCurrency(pos.avgCost)}</td>
                                        <td className="py-2 text-right tabular-nums">{pos.avgReach.toFixed(2)}%</td>
                                        <td className="py-2 text-right tabular-nums">
                                            <span className={pos.doubleRate > 10 ? 'text-destructive' : 'text-muted-foreground'}>
                                                {pos.doubleRate.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="py-2 text-right tabular-nums">
                                            <Badge variant={pos.positionKey === 'first' ? "default" : "secondary"}>
                                                {pos.efficiency.toFixed(2)}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Channel Breakdown (Collapsible) */}
            {analysis.channelBreakdown.length > 0 && (
                <Card className="border border-border bg-card">
                    <CardHeader
                        className="cursor-pointer"
                        onClick={() => setShowChannelBreakdown(!showChannelBreakdown)}
                    >
                        <CardTitle className="text-base flex items-center justify-between">
                            <span>Position Breakdown by Channel</span>
                            {showChannelBreakdown ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                        </CardTitle>
                        <CardDescription>
                            Click to {showChannelBreakdown ? 'hide' : 'show'} position distribution across {analysis.channelBreakdown.length} channels
                        </CardDescription>
                    </CardHeader>
                    {showChannelBreakdown && (
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-border">
                                        <tr className="text-left">
                                            <th className="pb-2 font-medium text-muted-foreground">Channel</th>
                                            <th className="pb-2 font-medium text-muted-foreground text-right">Total</th>
                                            <th className="pb-2 font-medium text-muted-foreground text-right">First</th>
                                            <th className="pb-2 font-medium text-muted-foreground text-right">Middle</th>
                                            <th className="pb-2 font-medium text-muted-foreground text-right">Last</th>
                                            <th className="pb-2 font-medium text-muted-foreground text-right">First %</th>
                                            <th className="pb-2 font-medium text-muted-foreground text-right">Last %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {analysis.channelBreakdown.map((ch, idx) => (
                                            <tr key={idx} className="hover:bg-muted/50">
                                                <td className="py-2 font-medium max-w-[200px] truncate" title={ch.channel}>
                                                    {ch.channel}
                                                </td>
                                                <td className="py-2 text-right tabular-nums">{ch.total}</td>
                                                <td className="py-2 text-right tabular-nums text-blue-500">{ch.first}</td>
                                                <td className="py-2 text-right tabular-nums text-muted-foreground">{ch.middle}</td>
                                                <td className="py-2 text-right tabular-nums text-green-500">{ch.last}</td>
                                                <td className="py-2 text-right tabular-nums">
                                                    <Badge variant={ch.firstPct > 30 ? "default" : "secondary"}>
                                                        {ch.firstPct.toFixed(1)}%
                                                    </Badge>
                                                </td>
                                                <td className="py-2 text-right tabular-nums">
                                                    <Badge variant={ch.lastPct > 30 ? "default" : "secondary"}>
                                                        {ch.lastPct.toFixed(1)}%
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}
        </div>
    );
};

export default PositionAnalyzer;
