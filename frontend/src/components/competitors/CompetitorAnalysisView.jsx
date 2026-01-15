import { useState } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Trophy, DollarSign, Activity, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

// Colors for competitors
const COLORS = ['#3B82F6', '#F97316', '#22C55E', '#A855F7', '#EC4899', '#06B6D4'];

const formatCurrency = (val) =>
    new Intl.NumberFormat('en-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

const formatNumber = (val) =>
    new Intl.NumberFormat('en-DE', { maximumFractionDigits: 0 }).format(val);

export default function CompetitorAnalysisView({ data = {} }) {
    const { my_company, competitors = [], market_totals = {} } = data;

    // Combine for easier mapping
    const allCompanies = [my_company, ...competitors].filter(c => c && c.id);

    // Sort by spend for rank if not already
    allCompanies.sort((a, b) => b.total_spend - a.total_spend);

    const myRank = allCompanies.findIndex(c => String(c.id) === String(my_company.id)) + 1;

    // --- Metric Cards ---
    const SummaryCard = ({ title, value, subtext, icon: Icon, trend }) => (
        <Card>
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
                    <h2 className="text-3xl font-bold">{value}</h2>
                    {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
                </div>
                <div className={cn("p-3 rounded-full bg-primary/10", trend === 'up' && "bg-green-100 text-green-600", trend === 'down' && "bg-red-100 text-red-600")}>
                    <Icon className="size-6 text-primary" />
                </div>
            </CardContent>
        </Card>
    );

    // --- Charts ---

    // 1. Share of Voice (Pie)
    const sovData = allCompanies.map(c => ({
        name: c.name || `Company ${c.id}`,
        value: c.total_spend,
        id: c.id
    }));

    // 2. Spend Comparison (Bar)
    // Already sorted in allCompanies

    // 3. Daypart Mix (Stacked Bar)
    // Need to normalize data: [{ name: 'Prime Time', Comp1: 50, Comp2: 30 ... }]
    // Collect all daypart keys
    const allDayparts = new Set();
    allCompanies.forEach(c => c.daypart_breakdown?.forEach(d => allDayparts.add(d.name)));

    const daypartChartData = Array.from(allDayparts).map(dp => {
        const row = { name: dp };
        allCompanies.forEach(c => {
            const found = c.daypart_breakdown?.find(d => d.name === dp);
            row[c.name || c.id] = found ? found.value : 0;
        });
        return row;
    });

    // 4. Weekly Trend (Line)
    // Need to normalize: [{ date: '2023-01-01', Comp1: 100, Comp2: 120 }]
    const allDates = new Set();
    allCompanies.forEach(c => c.weekly_trend?.forEach(w => allDates.add(w.date)));
    const sortedDates = Array.from(allDates).sort();

    const trendChartData = sortedDates.map(date => {
        const row = { date };
        allCompanies.forEach(c => {
            const found = c.weekly_trend?.find(w => w.date === date);
            row[c.name || c.id] = found ? found.value : 0;
        });
        return row;
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Your SOV (Spend)"
                    value={`${(my_company.sov_percent || 0).toFixed(1)}%`}
                    subtext={`Rank #${myRank} of ${allCompanies.length}`}
                    icon={Target}
                    trend="up"
                />
                <SummaryCard
                    title="Your Total Spend"
                    value={formatCurrency(my_company.total_spend || 0)}
                    subtext={`Avg: ${formatCurrency(market_totals.average_spend)}`}
                    icon={DollarSign}
                />
                <SummaryCard
                    title="Total Airings"
                    value={formatNumber(my_company.total_airings || 0)}
                    subtext={`Market Total: ${formatNumber(market_totals.total_airings)}`}
                    icon={Activity}
                />
                <SummaryCard
                    title="Market Leader"
                    value={allCompanies[0]?.name || "N/A"}
                    subtext={`${formatCurrency(allCompanies[0]?.total_spend || 0)} Spend`}
                    icon={Trophy}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SOV Chart */}
                <Card className="min-h-[400px]">
                    <CardHeader>
                        <CardTitle>Share of Voice (Spend)</CardTitle>
                        <CardDescription>Market share distribution among selected competitors</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sovData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sovData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Spend Comparison Bar */}
                <Card className="min-h-[400px]">
                    <CardHeader>
                        <CardTitle>Total Spend Comparison</CardTitle>
                        <CardDescription>Direct spend comparison per competitor</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={allCompanies}
                                margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tickFormatter={(val) => `€${val / 1000}k`} />
                                <YAxis dataKey="name" type="category" width={100} />
                                <RechartsTooltip
                                    cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                                    formatter={(val) => formatCurrency(val)}
                                />
                                <Bar dataKey="total_spend" radius={[0, 4, 4, 0]}>
                                    {allCompanies.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Weekly Spend Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            />
                            <YAxis tickFormatter={(val) => `€${val / 1000}k`} />
                            <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                            <Legend />
                            {allCompanies.map((c, i) => (
                                <Line
                                    key={c.id}
                                    type="monotone"
                                    dataKey={c.name || c.id}
                                    stroke={COLORS[i % COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Tabs defaultValue="dayparts">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Strategic Insights</h3>
                    <TabsList>
                        <TabsTrigger value="dayparts">Daypart Strategy</TabsTrigger>
                        <TabsTrigger value="table">Detailed Data</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="dayparts">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daypart Mix</CardTitle>
                            <CardDescription>When are competitors spending their budget?</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={daypartChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(val) => `€${val / 1000}k`} />
                                    <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                                    <Legend />
                                    {allCompanies.map((c, i) => (
                                        <Bar
                                            key={c.id}
                                            dataKey={c.name || c.id}
                                            fill={COLORS[i % COLORS.length]}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="table">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company</TableHead>
                                    <TableHead className="text-right">Total Spend</TableHead>
                                    <TableHead className="text-right">Airings</TableHead>
                                    <TableHead className="text-right">SOV %</TableHead>
                                    <TableHead className="text-right">Top Channel</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allCompanies.map((company, i) => (
                                    <TableRow key={company.id}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            {company.name}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(company.total_spend)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(company.total_airings)}</TableCell>
                                        <TableCell className="text-right">{(company.sov_percent || 0).toFixed(1)}%</TableCell>
                                        <TableCell className="text-right">
                                            {company.channel_breakdown?.[0]?.name || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
