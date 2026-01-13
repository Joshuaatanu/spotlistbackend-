/**
 * InefficiencyDashboard - Combined analysis of inefficient spots
 *
 * Features:
 * - Double booking detection (uses is_double flag)
 * - Low incremental reach detection (frequency-based saturation)
 * - High cost/low reach detection
 * - Combined inefficiency score
 * - Recommendations and potential savings
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    AlertTriangle, TrendingDown, DollarSign, Target, Download,
    Lightbulb, Filter, CheckCircle2, XCircle
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const INEFFICIENCY_COLORS = {
    doubleBookings: '#ef4444',     // Red
    lowIncremental: '#f59e0b',     // Amber
    highCostLowReach: '#8b5cf6',   // Purple
    efficient: '#10b981'           // Green
};

const InefficiencyDashboard = ({ data, fieldMap = {} }) => {
    const [activeFilter, setActiveFilter] = useState('all');

    const analysis = useMemo(() => {
        if (!data || data.length === 0) return null;

        const reachCol = fieldMap.reach_column || Object.keys(data[0] || {}).find(k =>
            k.toLowerCase() === 'rch' || k.toLowerCase() === 'reach'
        ) || 'reach_numeric';
        const costCol = fieldMap.cost_column || 'cost_numeric';
        const channelCol = fieldMap.program_column || 'Channel' || 'program_original';

        // Sort by timestamp for incremental reach calculation
        const sorted = [...data].sort((a, b) => {
            const dateA = a.timestamp || `${a.date} ${a.time}`;
            const dateB = b.timestamp || `${b.date} ${b.time}`;
            return new Date(dateA) - new Date(dateB);
        });

        // 1. Double bookings (already flagged)
        const doubleBookings = sorted.filter(s =>
            s.is_double === true || s.is_double === 'true' || s.is_double === 1
        );
        const doubleCost = doubleBookings.reduce((sum, s) =>
            sum + parseFloat(s[costCol] || s.cost_numeric || 0), 0
        );

        // 2. Low incremental reach calculation
        // Using frequency-based saturation model
        const spotsWithIncremental = [];
        const lowIncrementalSpots = [];

        sorted.forEach((spot, idx) => {
            const spotReach = parseFloat(spot[reachCol] || spot.reach_numeric || 0);
            const cost = parseFloat(spot[costCol] || spot.cost_numeric || 0);
            const frequency = idx + 1;

            // Logarithmic saturation factor
            const saturationFactor = Math.max(0.05, 1 / Math.log2(frequency + 1));
            const incrementalReach = spotReach * saturationFactor;

            const enrichedSpot = {
                ...spot,
                frequency,
                incrementalReach,
                baseReach: spotReach,
                saturationFactor,
                efficiency: cost > 0 ? (incrementalReach / cost) * 1000 : 0,
                inefficiencyType: null
            };

            spotsWithIncremental.push(enrichedSpot);

            // Mark as low incremental if <30% of base reach (more aggressive threshold)
            if (incrementalReach < spotReach * 0.3 && !spot.is_double) {
                enrichedSpot.inefficiencyType = 'lowIncremental';
                lowIncrementalSpots.push(enrichedSpot);
            }
        });

        const lowIncrementalCost = lowIncrementalSpots.reduce((sum, s) =>
            sum + parseFloat(s[costCol] || s.cost_numeric || 0), 0
        );

        // 3. High cost / low reach spots
        // Calculate average cost per reach
        const totalCost = sorted.reduce((sum, s) => sum + parseFloat(s[costCol] || s.cost_numeric || 0), 0);
        const totalReach = sorted.reduce((sum, s) => sum + parseFloat(s[reachCol] || s.reach_numeric || 0), 0);
        const avgCostPerReach = totalReach > 0 ? totalCost / totalReach : 0;

        const highCostLowReach = spotsWithIncremental.filter(s => {
            const cost = parseFloat(s[costCol] || s.cost_numeric || 0);
            const reach = parseFloat(s[reachCol] || s.reach_numeric || 0);

            // Skip if already counted as double booking or low incremental
            if (s.is_double || s.inefficiencyType === 'lowIncremental') return false;

            // No reach but has cost = inefficient
            if (reach === 0 && cost > 0) {
                s.inefficiencyType = 'highCostLowReach';
                return true;
            }

            // Cost per reach > 2x average = inefficient
            if (reach > 0 && (cost / reach) > avgCostPerReach * 2) {
                s.inefficiencyType = 'highCostLowReach';
                return true;
            }

            return false;
        });

        const highCostLowReachCost = highCostLowReach.reduce((sum, s) =>
            sum + parseFloat(s[costCol] || s.cost_numeric || 0), 0
        );

        // Mark double bookings
        doubleBookings.forEach(s => {
            const found = spotsWithIncremental.find(sp =>
                sp.timestamp === s.timestamp && sp[channelCol] === s[channelCol]
            );
            if (found) found.inefficiencyType = 'doubleBooking';
        });

        // Combined inefficiency
        const totalInefficiencyCost = doubleCost + lowIncrementalCost + highCostLowReachCost;
        const inefficiencyScore = totalCost > 0 ? (totalInefficiencyCost / totalCost) * 100 : 0;
        const efficientCost = totalCost - totalInefficiencyCost;

        // Breakdown data for pie chart
        const breakdownData = [
            { name: 'Double Bookings', value: doubleCost, count: doubleBookings.length, color: INEFFICIENCY_COLORS.doubleBookings },
            { name: 'Low Incremental', value: lowIncrementalCost, count: lowIncrementalSpots.length, color: INEFFICIENCY_COLORS.lowIncremental },
            { name: 'High Cost/Low Reach', value: highCostLowReachCost, count: highCostLowReach.length, color: INEFFICIENCY_COLORS.highCostLowReach },
            { name: 'Efficient', value: efficientCost, count: sorted.length - doubleBookings.length - lowIncrementalSpots.length - highCostLowReach.length, color: INEFFICIENCY_COLORS.efficient },
        ].filter(d => d.value > 0 || d.count > 0);

        // All inefficient spots combined
        const allInefficient = [
            ...doubleBookings.map(s => ({ ...s, inefficiencyType: 'doubleBooking' })),
            ...lowIncrementalSpots,
            ...highCostLowReach
        ];

        // Calculate potential savings (estimate 70% recoverable from inefficient spend)
        const potentialSavings = totalInefficiencyCost * 0.7;

        return {
            totalSpots: sorted.length,
            totalCost,
            totalReach,
            inefficiencyScore,
            totalInefficiencyCost,
            efficientCost,
            potentialSavings,

            doubleBookings: {
                count: doubleBookings.length,
                cost: doubleCost,
                percentage: totalCost > 0 ? (doubleCost / totalCost) * 100 : 0,
                spots: doubleBookings
            },
            lowIncremental: {
                count: lowIncrementalSpots.length,
                cost: lowIncrementalCost,
                percentage: totalCost > 0 ? (lowIncrementalCost / totalCost) * 100 : 0,
                spots: lowIncrementalSpots
            },
            highCostLowReach: {
                count: highCostLowReach.length,
                cost: highCostLowReachCost,
                percentage: totalCost > 0 ? (highCostLowReachCost / totalCost) * 100 : 0,
                spots: highCostLowReach
            },

            breakdownData,
            allInefficient,
            spotsWithIncremental
        };
    }, [data, fieldMap]);

    if (!analysis) {
        return (
            <Card className="border border-border bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                        Inefficiency Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No data available for analysis</p>
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

    // Get score color
    const getScoreColor = (score) => {
        if (score < 10) return 'text-green-500';
        if (score < 20) return 'text-yellow-500';
        return 'text-red-500';
    };

    // Filter spots for table
    const filteredSpots = activeFilter === 'all'
        ? analysis.allInefficient
        : analysis.allInefficient.filter(s => {
            if (activeFilter === 'double') return s.inefficiencyType === 'doubleBooking' || s.is_double;
            if (activeFilter === 'lowIncremental') return s.inefficiencyType === 'lowIncremental';
            if (activeFilter === 'highCost') return s.inefficiencyType === 'highCostLowReach';
            return true;
        });

    // Export function
    const exportInefficient = () => {
        if (!filteredSpots.length) return;

        const channelCol = fieldMap.program_column || 'Channel';
        const costCol = fieldMap.cost_column || 'cost_numeric';

        const headers = ['Type', 'Date', 'Time', 'Channel', 'Creative', 'Cost', 'Reach', 'Efficiency'];
        const rows = filteredSpots.map(spot => [
            spot.inefficiencyType || 'unknown',
            spot.date || spot.timestamp?.split('T')[0] || '',
            spot.time || spot.timestamp?.split('T')[1]?.substring(0, 5) || '',
            spot[channelCol] || spot.Channel || '',
            spot.creative || spot.Creative || spot.Claim || '',
            spot[costCol] || spot.cost_numeric || 0,
            spot.reach_numeric || spot.RCH || 0,
            (spot.efficiency || 0).toFixed(2)
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inefficient_spots_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Inefficiency Score Header */}
            <Card className="border border-border bg-card">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-muted-foreground mb-2">Overall Inefficiency Score</h2>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-5xl font-bold ${getScoreColor(analysis.inefficiencyScore)}`}>
                                    {analysis.inefficiencyScore.toFixed(1)}%
                                </span>
                                <span className="text-muted-foreground">of budget</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                {formatCurrency(analysis.totalInefficiencyCost)} of {formatCurrency(analysis.totalCost)} total spend
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Potential Savings</div>
                            <div className="text-3xl font-bold text-green-500">
                                {formatCurrency(analysis.potentialSavings)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                ~70% of inefficient spend recoverable
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-border bg-card border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-muted-foreground">Double Bookings</div>
                            <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="text-2xl font-semibold text-foreground tabular-nums">
                            {analysis.doubleBookings.count} spots
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {formatCurrency(analysis.doubleBookings.cost)} ({analysis.doubleBookings.percentage.toFixed(1)}%)
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-muted-foreground">Low Incremental Reach</div>
                            <TrendingDown className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="text-2xl font-semibold text-foreground tabular-nums">
                            {analysis.lowIncremental.count} spots
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {formatCurrency(analysis.lowIncremental.cost)} ({analysis.lowIncremental.percentage.toFixed(1)}%)
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-muted-foreground">High Cost / Low Reach</div>
                            <DollarSign className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="text-2xl font-semibold text-foreground tabular-nums">
                            {analysis.highCostLowReach.count} spots
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {formatCurrency(analysis.highCostLowReach.cost)} ({analysis.highCostLowReach.percentage.toFixed(1)}%)
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cost Breakdown Pie */}
                <Card className="border border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-base">Cost Breakdown by Inefficiency Type</CardTitle>
                        <CardDescription>How your budget is distributed</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={analysis.breakdownData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                    labelLine={false}
                                >
                                    {analysis.breakdownData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '0.5rem'
                                    }}
                                    formatter={(value, name) => [formatCurrency(value), name]}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Spot Count Bar */}
                <Card className="border border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-base">Spot Count by Category</CardTitle>
                        <CardDescription>Number of spots in each category</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart
                                data={analysis.breakdownData}
                                layout="vertical"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={120}
                                    stroke="hsl(var(--muted-foreground))"
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '0.5rem'
                                    }}
                                    formatter={(value) => [value, 'Spots']}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {analysis.breakdownData.map((entry, index) => (
                                        <Cell key={`bar-cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Recommendations */}
            <Card className="border border-primary/30 bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        Optimization Recommendations
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {analysis.doubleBookings.count > 0 && (
                        <Alert>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <AlertTitle>Eliminate Double Bookings</AlertTitle>
                            <AlertDescription>
                                Found <strong>{analysis.doubleBookings.count}</strong> double bookings costing{' '}
                                <strong>{formatCurrency(analysis.doubleBookings.cost)}</strong>.
                                Coordinate with your media agency to avoid booking spots within the same time window on the same channel.
                            </AlertDescription>
                        </Alert>
                    )}

                    {analysis.lowIncremental.count > 0 && (
                        <Alert>
                            <TrendingDown className="h-4 w-4 text-amber-500" />
                            <AlertTitle>Reduce Frequency Cap</AlertTitle>
                            <AlertDescription>
                                <strong>{analysis.lowIncremental.count}</strong> spots have low incremental reach due to audience saturation.
                                Consider spreading these spots over a longer period or targeting new audience segments.
                                Potential savings: <strong>{formatCurrency(analysis.lowIncremental.cost * 0.5)}</strong>
                            </AlertDescription>
                        </Alert>
                    )}

                    {analysis.highCostLowReach.count > 0 && (
                        <Alert>
                            <DollarSign className="h-4 w-4 text-purple-500" />
                            <AlertTitle>Review High-Cost Placements</AlertTitle>
                            <AlertDescription>
                                <strong>{analysis.highCostLowReach.count}</strong> spots have cost-per-reach more than 2x the average.
                                Consider negotiating better rates or reallocating budget to more efficient channels.
                            </AlertDescription>
                        </Alert>
                    )}

                    {analysis.inefficiencyScore < 10 && (
                        <Alert className="border-green-500/30 bg-green-50 dark:bg-green-950/20">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <AlertTitle>Good Efficiency</AlertTitle>
                            <AlertDescription>
                                Your campaign has a low inefficiency score ({analysis.inefficiencyScore.toFixed(1)}%).
                                This is better than industry average. Keep monitoring for optimization opportunities.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Inefficient Spots Table */}
            {analysis.allInefficient.length > 0 && (
                <Card className="border border-border bg-card">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Inefficient Spots Detail</CardTitle>
                                <CardDescription>
                                    {filteredSpots.length} spots · Click to filter by type
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={exportInefficient}>
                                <Download className="mr-2 h-4 w-4" />
                                Export List
                            </Button>
                        </div>

                        {/* Filter Buttons */}
                        <div className="flex gap-2 mt-4 flex-wrap">
                            <Button
                                variant={activeFilter === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveFilter('all')}
                            >
                                <Filter className="mr-2 h-3 w-3" />
                                All ({analysis.allInefficient.length})
                            </Button>
                            <Button
                                variant={activeFilter === 'double' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveFilter('double')}
                                className="border-red-500/50"
                            >
                                Double ({analysis.doubleBookings.count})
                            </Button>
                            <Button
                                variant={activeFilter === 'lowIncremental' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveFilter('lowIncremental')}
                                className="border-amber-500/50"
                            >
                                Low Reach ({analysis.lowIncremental.count})
                            </Button>
                            <Button
                                variant={activeFilter === 'highCost' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveFilter('highCost')}
                                className="border-purple-500/50"
                            >
                                High Cost ({analysis.highCostLowReach.count})
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto max-h-[400px]">
                            <table className="w-full text-sm">
                                <thead className="border-b border-border sticky top-0 bg-card">
                                    <tr className="text-left">
                                        <th className="pb-2 font-medium text-muted-foreground">Type</th>
                                        <th className="pb-2 font-medium text-muted-foreground">Date</th>
                                        <th className="pb-2 font-medium text-muted-foreground">Time</th>
                                        <th className="pb-2 font-medium text-muted-foreground">Channel</th>
                                        <th className="pb-2 font-medium text-muted-foreground text-right">Cost</th>
                                        <th className="pb-2 font-medium text-muted-foreground text-right">Reach</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredSpots.slice(0, 50).map((spot, idx) => {
                                        const channelCol = fieldMap.program_column || 'Channel';
                                        const costCol = fieldMap.cost_column || 'cost_numeric';
                                        const reachCol = fieldMap.reach_column || 'reach_numeric';

                                        const typeColor = spot.inefficiencyType === 'doubleBooking' || spot.is_double
                                            ? 'bg-red-500'
                                            : spot.inefficiencyType === 'lowIncremental'
                                                ? 'bg-amber-500'
                                                : 'bg-purple-500';

                                        const typeLabel = spot.inefficiencyType === 'doubleBooking' || spot.is_double
                                            ? 'Double'
                                            : spot.inefficiencyType === 'lowIncremental'
                                                ? 'Low Reach'
                                                : 'High Cost';

                                        return (
                                            <tr key={idx} className="hover:bg-muted/50">
                                                <td className="py-2">
                                                    <Badge className={`${typeColor} text-white`}>
                                                        {typeLabel}
                                                    </Badge>
                                                </td>
                                                <td className="py-2 tabular-nums">
                                                    {spot.date || spot.timestamp?.split('T')[0] || '-'}
                                                </td>
                                                <td className="py-2 tabular-nums">
                                                    {(spot.time || spot.timestamp?.split('T')[1] || '-').substring(0, 5)}
                                                </td>
                                                <td className="py-2 max-w-[150px] truncate" title={spot[channelCol] || spot.Channel}>
                                                    {spot[channelCol] || spot.Channel || '-'}
                                                </td>
                                                <td className="py-2 text-right tabular-nums">
                                                    {formatCurrency(parseFloat(spot[costCol] || spot.cost_numeric || 0))}
                                                </td>
                                                <td className="py-2 text-right tabular-nums">
                                                    {parseFloat(spot[reachCol] || spot.reach_numeric || 0).toFixed(2)}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredSpots.length > 50 && (
                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                    Showing first 50 of {filteredSpots.length} spots. Export for full list.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default InefficiencyDashboard;
