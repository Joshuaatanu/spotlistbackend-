import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line } from 'recharts';
import { Clock, Download, TrendingUp, DollarSign, Activity, Sun, Moon, Sunrise, Sunset, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import ExcelJS from 'exceljs';
import { useToast } from '@/hooks/useToast';

// Daypart icons and colors
const daypartConfig = {
    'Morning': { icon: Sunrise, color: '#F59E0B', bgColor: 'bg-amber-500/15' },
    'Daytime': { icon: Sun, color: '#FBBF24', bgColor: 'bg-yellow-500/15' },
    'Early Fringe': { icon: Sunset, color: '#F97316', bgColor: 'bg-orange-500/15' },
    'Prime Access': { icon: Clock, color: '#EF4444', bgColor: 'bg-red-500/15' },
    'Prime Time': { icon: Moon, color: '#8B5CF6', bgColor: 'bg-purple-500/15' },
    'Late Fringe': { icon: Moon, color: '#6366F1', bgColor: 'bg-indigo-500/15' },
    'Late Night': { icon: Moon, color: '#3B82F6', bgColor: 'bg-blue-500/15' },
    'Overnight': { icon: Moon, color: '#1E3A5F', bgColor: 'bg-slate-500/15' },
};

const defaultDaypartColor = '#6B7280';

export default function DaypartAnalysisReportView({ data, fieldMap }) {
    const { toast } = useToast();

    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <Card className="text-center py-16">
                <CardContent>
                    <Clock className="size-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No Daypart Analysis data available.</p>
                </CardContent>
            </Card>
        );
    }

    // Identify fields
    const daypartField = fieldMap?.daypart_column ||
        Object.keys(data[0] || {}).find(k =>
            k.toLowerCase().includes('daypart') || k.toLowerCase().includes('day part')
        ) || 'Airing daypart';

    const costField = fieldMap?.cost_column ||
        Object.keys(data[0] || {}).find(k =>
            ['cost', 'spend', 'price'].some(m => k.toLowerCase().includes(m))
        ) || 'cost';

    const xrpField = fieldMap?.xrp_column ||
        Object.keys(data[0] || {}).find(k => k.toLowerCase() === 'xrp');

    const reachField = fieldMap?.reach_column ||
        Object.keys(data[0] || {}).find(k =>
            k.toLowerCase().includes('reach') || k.toLowerCase() === 'rch'
        );

    // === ANALYSIS CALCULATIONS ===
    const analysis = useMemo(() => {
        // Aggregate metrics by daypart
        const metricsMap = {};
        data.forEach(item => {
            const daypart = item[daypartField] || 'Unknown';
            if (!metricsMap[daypart]) {
                metricsMap[daypart] = { daypart, spots: 0, cost: 0, xrp: 0, reach: 0, doubleSpots: 0, doubleCost: 0 };
            }

            metricsMap[daypart].spots += 1;
            metricsMap[daypart].cost += parseFloat(item[costField] || item.cost_numeric || 0);

            if (xrpField) metricsMap[daypart].xrp += parseFloat(item[xrpField] || 0);
            if (reachField) metricsMap[daypart].reach += parseFloat(item[reachField] || 0);

            if (item.is_double) {
                metricsMap[daypart].doubleSpots += 1;
                metricsMap[daypart].doubleCost += parseFloat(item[costField] || item.cost_numeric || 0);
            }
        });

        const metrics = Object.values(metricsMap);

        // Calculate derived metrics
        const totals = {
            spots: metrics.reduce((sum, d) => sum + d.spots, 0),
            cost: metrics.reduce((sum, d) => sum + d.cost, 0),
            xrp: metrics.reduce((sum, d) => sum + d.xrp, 0),
            reach: metrics.reduce((sum, d) => sum + d.reach, 0),
            doubleSpots: metrics.reduce((sum, d) => sum + d.doubleSpots, 0),
            doubleCost: metrics.reduce((sum, d) => sum + d.doubleCost, 0),
        };

        // Calculate efficiency metrics for each daypart
        const chartData = metrics.map(d => {
            const costPerSpot = d.spots > 0 ? d.cost / d.spots : 0;
            const costPerXrp = d.xrp > 0 ? d.cost / d.xrp : 0;
            const xrpPerSpot = d.spots > 0 ? d.xrp / d.spots : 0;
            const doubleRate = d.spots > 0 ? (d.doubleSpots / d.spots) * 100 : 0;
            const shareOfSpend = totals.cost > 0 ? (d.cost / totals.cost) * 100 : 0;
            const shareOfXrp = totals.xrp > 0 ? (d.xrp / totals.xrp) * 100 : 0;

            // Efficiency score: (XRP share / Cost share) * 100
            // Score > 100 means getting more XRP than cost invested
            const efficiencyIndex = shareOfSpend > 0 ? (shareOfXrp / shareOfSpend) * 100 : 0;

            // ROI indicator
            let roiRating = 'Average';
            let roiColor = 'secondary';
            if (efficiencyIndex >= 120) {
                roiRating = 'Excellent';
                roiColor = 'default';
            } else if (efficiencyIndex >= 100) {
                roiRating = 'Good';
                roiColor = 'default';
            } else if (efficiencyIndex < 80) {
                roiRating = 'Below Avg';
                roiColor = 'destructive';
            }

            return {
                ...d,
                color: daypartConfig[d.daypart]?.color || defaultDaypartColor,
                costPerSpot,
                costPerXrp,
                xrpPerSpot,
                doubleRate,
                shareOfSpend,
                shareOfXrp,
                efficiencyIndex,
                roiRating,
                roiColor
            };
        }).sort((a, b) => b.efficiencyIndex - a.efficiencyIndex);

        // Best and worst dayparts
        const bestDaypart = chartData[0];
        const worstDaypart = chartData[chartData.length - 1];

        // High double booking dayparts
        const highDoubleRateDayparts = chartData.filter(d => d.doubleRate > 10);

        // Recommendations
        const recommendations = [];
        if (bestDaypart?.efficiencyIndex > 110 && bestDaypart?.shareOfSpend < 30) {
            recommendations.push({
                type: 'success',
                title: 'Opportunity',
                message: `${bestDaypart.daypart} shows high efficiency (${bestDaypart.efficiencyIndex.toFixed(0)}%) - consider increasing investment`
            });
        }
        if (worstDaypart?.efficiencyIndex < 80 && worstDaypart?.shareOfSpend > 15) {
            recommendations.push({
                type: 'warning',
                title: 'Optimize',
                message: `${worstDaypart.daypart} underperforms (${worstDaypart.efficiencyIndex.toFixed(0)}%) - review allocation`
            });
        }
        if (highDoubleRateDayparts.length > 0) {
            recommendations.push({
                type: 'warning',
                title: 'Double Booking Alert',
                message: `High double rates in: ${highDoubleRateDayparts.map(d => `${d.daypart} (${d.doubleRate.toFixed(0)}%)`).join(', ')}`
            });
        }

        return { chartData, totals, bestDaypart, worstDaypart, recommendations };
    }, [data, daypartField, costField, xrpField, reachField]);

    const downloadExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Daypart Analysis');

            const headers = ['Rank', 'Daypart', 'Efficiency', 'Rating', 'Spots', 'Spend (€)', 'XRP', 'Cost/XRP', 'Double Rate'];
            const headerRow = worksheet.addRow(headers);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };

            analysis.chartData.forEach((item, i) => {
                worksheet.addRow([
                    i + 1,
                    item.daypart,
                    item.efficiencyIndex.toFixed(0) + '%',
                    item.roiRating,
                    item.spots,
                    item.cost.toFixed(2),
                    item.xrp.toFixed(1),
                    item.costPerXrp.toFixed(2),
                    item.doubleRate.toFixed(1) + '%'
                ]);
            });

            worksheet.columns.forEach(col => { col.width = 15; });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `daypart_analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({ title: 'Export successful', variant: 'success' });
        } catch (error) {
            console.error('Export failed:', error);
            toast({ title: 'Export failed', variant: 'destructive' });
        }
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-14 rounded-full bg-purple-500/15 flex items-center justify-center">
                                <Clock className="size-7 text-purple-500" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Daypart Efficiency Analysis</CardTitle>
                                <CardDescription>ROI optimization and performance by time of day</CardDescription>
                            </div>
                        </div>
                        <Button onClick={downloadExcel} variant="outline">
                            <Download className="size-4" />
                            Export Analysis
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* Recommendations */}
            {analysis.recommendations.map((rec, i) => (
                <Alert key={i} variant={rec.type === 'warning' ? 'destructive' : 'default'}>
                    {rec.type === 'warning' ? <AlertTriangle className="size-4" /> : <CheckCircle className="size-4" />}
                    <AlertTitle>{rec.title}</AlertTitle>
                    <AlertDescription>{rec.message}</AlertDescription>
                </Alert>
            ))}

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Target className="size-4 text-green-500" />
                            <span className="text-sm font-medium text-muted-foreground">Best Daypart</span>
                        </div>
                        <p className="text-lg font-bold truncate">{analysis.bestDaypart?.daypart}</p>
                        <Badge className="mt-1">{analysis.bestDaypart?.efficiencyIndex.toFixed(0)}% efficiency</Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="size-4 text-blue-500" />
                            <span className="text-sm font-medium text-muted-foreground">Total Spend</span>
                        </div>
                        <p className="text-2xl font-bold">€{analysis.totals.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="size-4 text-purple-500" />
                            <span className="text-sm font-medium text-muted-foreground">Total XRP</span>
                        </div>
                        <p className="text-2xl font-bold">{analysis.totals.xrp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="size-4 text-amber-500" />
                            <span className="text-sm font-medium text-muted-foreground">Double Spot Rate</span>
                        </div>
                        <p className="text-2xl font-bold">
                            {analysis.totals.spots > 0 ? ((analysis.totals.doubleSpots / analysis.totals.spots) * 100).toFixed(1) : 0}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Efficiency Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Daypart Efficiency Index</CardTitle>
                    <CardDescription>100 = fair share. Higher = more XRP per € invested</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={analysis.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                            <XAxis dataKey="daypart" className="text-xs" tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={80} />
                            <YAxis className="text-xs" tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                formatter={(value, name) => [
                                    typeof value === 'number' ? value.toFixed(1) + (name === 'efficiencyIndex' ? '%' : '') : value,
                                    name === 'efficiencyIndex' ? 'Efficiency' : name
                                ]}
                            />
                            <Bar dataKey="efficiencyIndex" radius={[4, 4, 0, 0]}>
                                {analysis.chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.efficiencyIndex >= 100 ? '#10B981' : entry.efficiencyIndex >= 80 ? '#F59E0B' : '#EF4444'} />
                                ))}
                            </Bar>
                            <Line type="monotone" dataKey={() => 100} stroke="#6B7280" strokeDasharray="5 5" name="Baseline" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Spend vs XRP Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Spend Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={analysis.chartData} dataKey="cost" nameKey="daypart" cx="50%" cy="50%" outerRadius={100}
                                    label={({ daypart, shareOfSpend }) => `${daypart.substring(0, 10)} ${shareOfSpend.toFixed(0)}%`} labelLine={false}>
                                    {analysis.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`€${value.toLocaleString()}`, 'Spend']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>XRP Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={analysis.chartData} dataKey="xrp" nameKey="daypart" cx="50%" cy="50%" outerRadius={100}
                                    label={({ daypart, shareOfXrp }) => `${daypart.substring(0, 10)} ${shareOfXrp.toFixed(0)}%`} labelLine={false}>
                                    {analysis.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [value.toLocaleString(), 'XRP']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Daypart Performance Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12">Rank</TableHead>
                                <TableHead>Daypart</TableHead>
                                <TableHead className="text-right">Efficiency</TableHead>
                                <TableHead className="text-center">Rating</TableHead>
                                <TableHead className="text-right">Spots</TableHead>
                                <TableHead className="text-right">Spend</TableHead>
                                <TableHead className="text-right">XRP</TableHead>
                                <TableHead className="text-right">Cost/XRP</TableHead>
                                <TableHead className="text-right">Double Rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analysis.chartData.map((item, index) => {
                                const IconComponent = daypartConfig[item.daypart]?.icon || Clock;
                                return (
                                    <TableRow key={index} className={item.efficiencyIndex >= 100 ? 'bg-green-500/5' : item.efficiencyIndex < 80 ? 'bg-red-500/5' : ''}>
                                        <TableCell className="font-bold">
                                            {index === 0 && '🏆'}
                                            {index > 0 && `#${index + 1}`}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className={`size-8 rounded-full ${daypartConfig[item.daypart]?.bgColor || 'bg-muted'} flex items-center justify-center`}>
                                                    <IconComponent className="size-4" style={{ color: item.color }} />
                                                </div>
                                                {item.daypart}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Progress value={Math.min(item.efficiencyIndex, 150) / 1.5} className="w-12" />
                                                <span className="tabular-nums w-12">{item.efficiencyIndex.toFixed(0)}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={item.roiColor}>{item.roiRating}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{item.spots.toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums">€{item.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                                        <TableCell className="text-right tabular-nums">{item.xrp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                                        <TableCell className="text-right tabular-nums">€{item.costPerXrp.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={item.doubleRate > 10 ? 'destructive' : item.doubleRate > 5 ? 'secondary' : 'outline'}>
                                                {item.doubleRate.toFixed(1)}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
