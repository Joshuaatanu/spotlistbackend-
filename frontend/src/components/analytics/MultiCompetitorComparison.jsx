import { useState, useMemo } from 'react';
import {
    Users, DollarSign, TrendingUp, Crown, Plus, X, Star, Loader2, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    PieChart,
    Pie,
    Cell,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    LabelList
} from 'recharts';

// Vibrant colors for up to 5 companies
const COLORS = [
    'hsl(262, 83%, 58%)', // Purple
    'hsl(173, 80%, 40%)', // Teal
    'hsl(38, 92%, 50%)',  // Amber
    'hsl(346, 77%, 50%)', // Rose
    'hsl(221, 83%, 53%)', // Blue
];

/**
 * MultiCompetitorComparison - Compare up to 5 companies simultaneously
 * 
 * Features:
 * - Multi-company selector
 * - Market share pie charts (Spend & XRP)
 * - Head-to-head metrics table
 * - Radar chart for multi-dimensional comparison
 * - Competitive positioning scatter plot
 */
const MultiCompetitorComparison = ({ allData = [], availableCompanies = [] }) => {
    const [selectedCompanies, setSelectedCompanies] = useState([]);
    const MAX_COMPETITORS = 5;

    // Extract unique companies from data if not provided
    const companies = useMemo(() => {
        if (availableCompanies.length > 0) return availableCompanies;

        const companySet = new Set();
        allData.forEach(item => {
            const company = item.company_name || item.Company || item.Brand;
            if (company) companySet.add(company);
        });
        return [...companySet].sort();
    }, [allData, availableCompanies]);

    // Toggle company selection
    const toggleCompany = (company) => {
        setSelectedCompanies(prev => {
            if (prev.includes(company)) {
                return prev.filter(c => c !== company);
            }
            if (prev.length >= MAX_COMPETITORS) return prev;
            return [...prev, company];
        });
    };

    // Calculate metrics per company
    const companyMetrics = useMemo(() => {
        if (selectedCompanies.length === 0) return [];

        return selectedCompanies.map((company, idx) => {
            const companyData = allData.filter(d =>
                (d.company_name || d.Company || d.Brand) === company
            );

            const totalCost = companyData.reduce((sum, d) =>
                sum + (d.cost_numeric || d.cost || d.Spend || 0), 0
            );
            const totalSpots = companyData.length;
            const totalXrp = companyData.reduce((sum, d) =>
                sum + (d.xrp || d.XRP || 0), 0
            );
            const doubleSpots = companyData.filter(d => d.is_double).length;
            const channels = new Set(companyData.map(d =>
                d.channel_name || d.channel_id || d.Channel
            ).filter(Boolean));

            return {
                name: company,
                color: COLORS[idx % COLORS.length],
                totalCost,
                totalSpots,
                totalXrp,
                doubleSpots,
                doubleRate: totalSpots > 0 ? (doubleSpots / totalSpots) * 100 : 0,
                avgCostPerSpot: totalSpots > 0 ? totalCost / totalSpots : 0,
                costPerXrp: totalXrp > 0 ? totalCost / totalXrp : 0,
                channelCount: channels.size
            };
        });
    }, [selectedCompanies, allData]);

    // Generate radar chart data
    const radarData = useMemo(() => {
        if (companyMetrics.length < 2) return [];

        const dimensions = [
            { key: 'spend', label: 'Spend', getValue: m => m.totalCost },
            { key: 'spots', label: 'Spots', getValue: m => m.totalSpots },
            { key: 'xrp', label: 'XRP', getValue: m => m.totalXrp },
            { key: 'efficiency', label: 'Efficiency', getValue: m => m.totalXrp / Math.max(m.totalCost, 1) * 10000 },
            { key: 'channels', label: 'Channels', getValue: m => m.channelCount },
            { key: 'quality', label: 'Quality', getValue: m => 100 - m.doubleRate, invert: true }
        ];

        return dimensions.map(dim => {
            const dataPoint = { dimension: dim.label };

            const values = companyMetrics.map(m => dim.getValue(m));
            const maxValue = Math.max(...values, 1);

            companyMetrics.forEach((m, idx) => {
                let normalized = (dim.getValue(m) / maxValue) * 100;
                dataPoint[m.name] = Math.round(normalized);
            });

            return dataPoint;
        });
    }, [companyMetrics]);

    // Generate scatter data for positioning chart
    const scatterData = useMemo(() => {
        return companyMetrics.map(m => ({
            name: m.name,
            spend: m.totalCost,
            efficiency: m.totalXrp > 0 ? (m.totalXrp / m.totalCost) * 1000 : 0,
            spots: m.totalSpots,
            color: m.color
        }));
    }, [companyMetrics]);

    // Calculate averages for reference lines
    const avgSpend = companyMetrics.length > 0
        ? companyMetrics.reduce((sum, m) => sum + m.totalCost, 0) / companyMetrics.length
        : 0;
    const avgEfficiency = companyMetrics.length > 0
        ? companyMetrics.reduce((sum, m) => sum + (m.totalXrp > 0 ? (m.totalXrp / m.totalCost) * 1000 : 0), 0) / companyMetrics.length
        : 0;

    if (companies.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Users className="size-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No company data available for comparison</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Company Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Select Up to 5 Companies to Compare
                    </CardTitle>
                    <CardDescription>
                        Compare your brand against multiple competitors simultaneously
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {selectedCompanies.map((company, idx) => (
                            <Badge
                                key={company}
                                className="text-sm px-3 py-2 cursor-pointer text-white"
                                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                onClick={() => toggleCompany(company)}
                            >
                                {idx === 0 && <Star className="h-3 w-3 mr-1 fill-current" />}
                                {company}
                                <X className="h-3 w-3 ml-2" />
                            </Badge>
                        ))}
                        {selectedCompanies.length < MAX_COMPETITORS && selectedCompanies.length > 0 && (
                            <Badge variant="outline" className="text-sm px-3 py-2">
                                <Plus className="h-3 w-3 mr-1" />
                                Add More ({MAX_COMPETITORS - selectedCompanies.length} remaining)
                            </Badge>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {companies.filter(c => !selectedCompanies.includes(c)).map(company => (
                            <Button
                                key={company}
                                variant="outline"
                                size="sm"
                                onClick={() => toggleCompany(company)}
                                disabled={selectedCompanies.length >= MAX_COMPETITORS}
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                {company}
                            </Button>
                        ))}
                    </div>

                    {selectedCompanies.length < 2 && (
                        <p className="text-sm text-muted-foreground mt-4">
                            Select at least 2 companies to start comparison
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Comparison Results */}
            {companyMetrics.length >= 2 && (
                <>
                    {/* Market Share Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Market Share Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Spend Share */}
                                <div>
                                    <h4 className="text-sm font-semibold mb-4 text-center">Spend Share</h4>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={companyMetrics.map(m => ({
                                                    name: m.name,
                                                    value: m.totalCost
                                                }))}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                                labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                                            >
                                                {companyMetrics.map((m, idx) => (
                                                    <Cell key={m.name} fill={m.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => `€${value.toLocaleString()}`}
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--card))',
                                                    borderColor: 'hsl(var(--border))',
                                                    borderRadius: '8px',
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* XRP Share */}
                                <div>
                                    <h4 className="text-sm font-semibold mb-4 text-center">XRP Share</h4>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={companyMetrics.map(m => ({
                                                    name: m.name,
                                                    value: m.totalXrp
                                                }))}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                                labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                                            >
                                                {companyMetrics.map((m, idx) => (
                                                    <Cell key={m.name} fill={m.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => value.toLocaleString()}
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--card))',
                                                    borderColor: 'hsl(var(--border))',
                                                    borderRadius: '8px',
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Metrics Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Head-to-Head Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Company</TableHead>
                                            <TableHead className="text-right">Total Spots</TableHead>
                                            <TableHead className="text-right">Total Spend</TableHead>
                                            <TableHead className="text-right">Total XRP</TableHead>
                                            <TableHead className="text-right">Avg Cost/Spot</TableHead>
                                            <TableHead className="text-right">Cost/XRP</TableHead>
                                            <TableHead className="text-right">Channels</TableHead>
                                            <TableHead className="text-right">Double Rate</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {companyMetrics
                                            .sort((a, b) => b.totalCost - a.totalCost)
                                            .map((m, idx) => (
                                                <TableRow key={m.name} className={idx === 0 ? 'bg-primary/5' : ''}>
                                                    <TableCell className="font-semibold">
                                                        {idx === 0 && <Crown className="inline h-4 w-4 text-yellow-500 mr-1" />}
                                                        <span
                                                            className="inline-block w-3 h-3 rounded-full mr-2"
                                                            style={{ backgroundColor: m.color }}
                                                        />
                                                        {m.name}
                                                    </TableCell>
                                                    <TableCell className="text-right">{m.totalSpots.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">€{m.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                                                    <TableCell className="text-right">{m.totalXrp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                                                    <TableCell className="text-right">€{m.avgCostPerSpot.toFixed(0)}</TableCell>
                                                    <TableCell className="text-right">€{m.costPerXrp.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">{m.channelCount}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={m.doubleRate > 5 ? 'destructive' : 'outline'}>
                                                            {m.doubleRate.toFixed(1)}%
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Radar Chart */}
                    {radarData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Multi-Dimensional Performance</CardTitle>
                                <CardDescription>Normalized scores (100 = best in category)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={400}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="hsl(var(--muted))" />
                                        <PolarAngleAxis
                                            dataKey="dimension"
                                            tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                                        />
                                        <PolarRadiusAxis
                                            angle={90}
                                            domain={[0, 100]}
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                        />
                                        {companyMetrics.map((m, idx) => (
                                            <Radar
                                                key={m.name}
                                                name={m.name}
                                                dataKey={m.name}
                                                stroke={m.color}
                                                fill={m.color}
                                                fillOpacity={0.2}
                                                strokeWidth={2}
                                            />
                                        ))}
                                        <Legend />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                borderColor: 'hsl(var(--border))',
                                                borderRadius: '8px',
                                            }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Competitive Positioning */}
                    {scatterData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Competitive Positioning</CardTitle>
                                <CardDescription>Spend vs. Efficiency (XRP per €1000)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={400}>
                                    <ScatterChart>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis
                                            type="number"
                                            dataKey="spend"
                                            name="Spend"
                                            tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                                            tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey="efficiency"
                                            name="Efficiency"
                                            tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                                        />
                                        <Tooltip
                                            cursor={{ strokeDasharray: '3 3' }}
                                            formatter={(value, name) => {
                                                if (name === 'Spend') return [`€${value.toLocaleString()}`, name];
                                                return [value.toFixed(2), name];
                                            }}
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                borderColor: 'hsl(var(--border))',
                                                borderRadius: '8px',
                                            }}
                                        />
                                        <Scatter name="Companies" data={scatterData}>
                                            {scatterData.map((entry, idx) => (
                                                <Cell key={entry.name} fill={entry.color} />
                                            ))}
                                            <LabelList
                                                dataKey="name"
                                                position="top"
                                                style={{ fontSize: 11, fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                                            />
                                        </Scatter>
                                        <ReferenceLine
                                            x={avgSpend}
                                            stroke="hsl(var(--muted-foreground))"
                                            strokeDasharray="3 3"
                                        />
                                        <ReferenceLine
                                            y={avgEfficiency}
                                            stroke="hsl(var(--muted-foreground))"
                                            strokeDasharray="3 3"
                                        />
                                    </ScatterChart>
                                </ResponsiveContainer>
                                <div className="flex justify-center gap-8 mt-4 text-xs text-muted-foreground">
                                    <span>Top-Left: High Efficiency, Low Spend</span>
                                    <span>Top-Right: High Efficiency, High Spend (Leaders)</span>
                                    <span>Bottom-Left: Low Efficiency, Low Spend</span>
                                    <span>Bottom-Right: Low Efficiency, High Spend (Wasteful)</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default MultiCompetitorComparison;
