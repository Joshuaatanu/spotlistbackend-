/**
 * CreativeAgeAnalyzer - Analyzes creative performance and age group targeting
 *
 * Features:
 * - Performance by creative version
 * - Age group breakdown and targeting efficiency
 * - Creative × Age cross-analysis
 * - Double booking patterns by creative/age
 */
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import { Film, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const CreativeAgeAnalyzer = ({ data, fieldMap = {} }) => {
    const analysis = useMemo(() => {
        if (!data || data.length === 0) return null;

        // Detect column names (flexible mapping)
        // Allow explicit mapping via fieldMap
        let creativeCol = fieldMap.creative_column;
        let ageCol = fieldMap.age_column;

        // If not explicitly mapped, try to auto-detect
        if (!creativeCol) {
            // Exclude common non-creative columns
            const excludeFromCreative = ['sendung', 'programme', 'program', 'show', 'channel', 'sender', 'epg_category', 'company', 'brand', 'product', 'date', 'time'];

            creativeCol = Object.keys(data[0]).find(k => {
                const lower = k.toLowerCase();
                // Check if it's excluded
                if (excludeFromCreative.some(exc => lower.includes(exc))) return false;
                // Match creative-related names
                return lower.includes('creative') ||
                       lower.includes('version') ||
                       lower.includes('motiv') ||
                       lower === 'c';
            });
        }

        if (!ageCol) {
            ageCol = Object.keys(data[0]).find(k => {
                const lower = k.toLowerCase();
                return lower.includes('age') ||
                       lower.includes('demo') ||
                       lower.includes('target') ||
                       lower.includes('profil') ||
                       lower === 'a';
            });
        }

        const costCol = fieldMap.cost_column || 'cost_numeric' || 'Spend';
        const reachCol = fieldMap.reach_column || 'RCH' || 'reach';
        const isDoubleCol = 'is_double';

        // Extract data
        const spots = data.map(spot => ({
            creative: creativeCol ? spot[creativeCol] : 'N/A',
            age: ageCol ? spot[ageCol] : 'N/A',
            cost: parseFloat(spot[costCol] || 0),
            reach: parseFloat(spot[reachCol] || 0),
            isDouble: spot[isDoubleCol] === true || spot[isDoubleCol] === 'true' || spot[isDoubleCol] === 1,
        }));

        // Creative analysis
        const creativeStats = {};
        spots.forEach(s => {
            if (!creativeStats[s.creative]) {
                creativeStats[s.creative] = { count: 0, cost: 0, reach: 0, doubles: 0 };
            }
            creativeStats[s.creative].count++;
            creativeStats[s.creative].cost += s.cost;
            creativeStats[s.creative].reach += s.reach;
            if (s.isDouble) creativeStats[s.creative].doubles++;
        });

        const creativePerformance = Object.entries(creativeStats).map(([creative, stats]) => ({
            creative,
            spots: stats.count,
            totalCost: stats.cost,
            avgCost: stats.cost / stats.count,
            avgReach: stats.reach / stats.count,
            doubleRate: ((stats.doubles / stats.count) * 100).toFixed(1),
            efficiency: stats.reach / Math.max(stats.cost, 1) * 1000, // Reach per €1000
        })).sort((a, b) => b.efficiency - a.efficiency);

        // Age analysis
        const ageStats = {};
        spots.forEach(s => {
            if (!ageStats[s.age]) {
                ageStats[s.age] = { count: 0, cost: 0, reach: 0, doubles: 0 };
            }
            ageStats[s.age].count++;
            ageStats[s.age].cost += s.cost;
            ageStats[s.age].reach += s.reach;
            if (s.isDouble) ageStats[s.age].doubles++;
        });

        const agePerformance = Object.entries(ageStats).map(([age, stats]) => ({
            age,
            spots: stats.count,
            totalCost: stats.cost,
            avgReach: stats.reach / stats.count,
            doubleRate: ((stats.doubles / stats.count) * 100).toFixed(1),
            percentage: ((stats.count / spots.length) * 100).toFixed(1),
        })).sort((a, b) => b.spots - a.spots);

        // Creative × Age cross-analysis
        const crossAnalysis = {};
        spots.forEach(s => {
            const key = `${s.creative}|||${s.age}`;
            if (!crossAnalysis[key]) {
                crossAnalysis[key] = { creative: s.creative, age: s.age, count: 0, reach: 0, cost: 0 };
            }
            crossAnalysis[key].count++;
            crossAnalysis[key].reach += s.reach;
            crossAnalysis[key].cost += s.cost;
        });

        const topCombinations = Object.values(crossAnalysis)
            .map(c => ({
                ...c,
                avgReach: c.reach / c.count,
                efficiency: c.reach / Math.max(c.cost, 1) * 1000,
            }))
            .sort((a, b) => b.efficiency - a.efficiency)
            .slice(0, 10);

        return {
            creativePerformance,
            agePerformance,
            topCombinations,
            totalSpots: spots.length,
            hasCreativeData: creativeCol !== undefined,
            hasAgeData: ageCol !== undefined,
            creativeCol,
            ageCol,
        };
    }, [data, fieldMap]);

    if (!analysis) {
        return (
            <Card className="border border-border bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Film className="w-5 h-5 text-muted-foreground" />
                        Creative & Age Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No data available for creative/age analysis.</p>
                </CardContent>
            </Card>
        );
    }

    if (!analysis.hasCreativeData && !analysis.hasAgeData) {
        return (
            <Card className="border border-border bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Film className="w-5 h-5 text-muted-foreground" />
                        Creative & Age Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="font-medium text-foreground">No Creative or Age data found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                To use this analysis, your data needs columns for creative information and/or age demographics.
                            </p>
                            <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                <div><strong>Creative columns:</strong> "Creative", "Version", "Motiv", or "C"</div>
                                <div><strong>Age columns:</strong> "Age", "Age_Group", "Target", "Demo", "Profil", or "A"</div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 italic">
                                Note: Programme/show names are automatically excluded from creative detection.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-muted-foreground">Total Spots Analyzed</div>
                            <Film className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-semibold text-foreground tabular-nums">{analysis.totalSpots}</div>
                    </CardContent>
                </Card>

                {analysis.hasCreativeData && (
                    <Card className="border border-border bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-muted-foreground">Unique Creatives</div>
                                <Film className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="text-2xl font-semibold text-foreground tabular-nums">
                                {analysis.creativePerformance.length}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Best: {analysis.creativePerformance[0]?.creative}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {analysis.hasAgeData && (
                    <Card className="border border-border bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-muted-foreground">Age Segments</div>
                                <Users className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="text-2xl font-semibold text-foreground tabular-nums">
                                {analysis.agePerformance.length}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Largest: {analysis.agePerformance[0]?.age}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Creative Performance */}
            {analysis.hasCreativeData && (
                <Card className="border border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                            <span>Creative Performance</span>
                            <Badge variant="secondary">{analysis.creativePerformance.length} versions</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analysis.creativePerformance}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="creative" stroke="hsl(var(--muted-foreground))" />
                                <YAxis stroke="hsl(var(--muted-foreground))" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '0.5rem'
                                    }}
                                    formatter={(value, name) => {
                                        if (name === 'efficiency') return [value.toFixed(2), 'Reach per €1000'];
                                        if (name === 'avgReach') return [value.toFixed(2) + '%', 'Avg Reach'];
                                        if (name === 'doubleRate') return [value + '%', 'Double Rate'];
                                        return [value, name];
                                    }}
                                />
                                <Bar dataKey="efficiency" name="Efficiency" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>

                        {/* Creative Stats Table */}
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-border">
                                    <tr className="text-left">
                                        <th className="pb-2 font-medium text-muted-foreground">Creative</th>
                                        <th className="pb-2 font-medium text-muted-foreground text-right">Spots</th>
                                        <th className="pb-2 font-medium text-muted-foreground text-right">Avg Reach</th>
                                        <th className="pb-2 font-medium text-muted-foreground text-right">Double Rate</th>
                                        <th className="pb-2 font-medium text-muted-foreground text-right">Efficiency</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {analysis.creativePerformance.map((c, idx) => (
                                        <tr key={idx} className="hover:bg-muted/50">
                                            <td className="py-2 font-medium">{c.creative}</td>
                                            <td className="py-2 text-right tabular-nums">{c.spots}</td>
                                            <td className="py-2 text-right tabular-nums">{c.avgReach.toFixed(2)}%</td>
                                            <td className="py-2 text-right tabular-nums">
                                                <span className={parseFloat(c.doubleRate) > 10 ? 'text-destructive' : 'text-muted-foreground'}>
                                                    {c.doubleRate}%
                                                </span>
                                            </td>
                                            <td className="py-2 text-right tabular-nums">{c.efficiency.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Age Performance */}
            {analysis.hasAgeData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-base">Age Group Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={analysis.agePerformance}
                                        dataKey="spots"
                                        nameKey="age"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ age, percentage }) => `${age}: ${percentage}%`}
                                    >
                                        {analysis.agePerformance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--popover))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '0.5rem'
                                        }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-base">Age Group Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {analysis.agePerformance.map((age, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <div>
                                            <div className="font-medium">{age.age}</div>
                                            <div className="text-xs text-muted-foreground">{age.spots} spots ({age.percentage}%)</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold tabular-nums">{age.avgReach.toFixed(2)}%</div>
                                            <div className="text-xs text-muted-foreground">Avg reach</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Cross Analysis */}
            {analysis.hasCreativeData && analysis.hasAgeData && analysis.topCombinations.length > 0 && (
                <Card className="border border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-muted-foreground" />
                            Top Creative × Age Combinations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-border">
                                    <tr className="text-left">
                                        <th className="pb-2 font-medium text-muted-foreground">Creative</th>
                                        <th className="pb-2 font-medium text-muted-foreground">Age Group</th>
                                        <th className="pb-2 font-medium text-muted-foreground text-right">Spots</th>
                                        <th className="pb-2 font-medium text-muted-foreground text-right">Avg Reach</th>
                                        <th className="pb-2 font-medium text-muted-foreground text-right">Efficiency</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {analysis.topCombinations.map((combo, idx) => (
                                        <tr key={idx} className="hover:bg-muted/50">
                                            <td className="py-2 font-medium">{combo.creative}</td>
                                            <td className="py-2">{combo.age}</td>
                                            <td className="py-2 text-right tabular-nums">{combo.count}</td>
                                            <td className="py-2 text-right tabular-nums">{combo.avgReach.toFixed(2)}%</td>
                                            <td className="py-2 text-right tabular-nums">
                                                <Badge variant={idx < 3 ? "default" : "secondary"}>
                                                    {combo.efficiency.toFixed(2)}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default CreativeAgeAnalyzer;
