import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area } from 'recharts';
import { Users, TrendingUp, Target, Download, Zap, BarChart3, CheckCircle } from 'lucide-react';
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

export default function ReachFrequencyReportView({ data, reportType }) {
    const { toast } = useToast();

    if (!data || (!Array.isArray(data) && typeof data !== 'object')) {
        return (
            <Card className="text-center py-16">
                <CardContent>
                    <Users className="size-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No Reach & Frequency data available.</p>
                </CardContent>
            </Card>
        );
    }

    // Handle different data structures
    let chartData = [];
    if (Array.isArray(data)) {
        chartData = data;
    } else if (data.reach && data.frequency) {
        chartData = data.reach.map((r, i) => ({
            frequency: i + 1,
            reach: r,
            ...(data.frequency && data.frequency[i] ? { frequencyValue: data.frequency[i] } : {})
        }));
    } else if (data.frequency_distribution) {
        chartData = Object.entries(data.frequency_distribution).map(([freq, reach]) => ({
            frequency: parseInt(freq),
            reach: reach
        })).sort((a, b) => a.frequency - b.frequency);
    }

    // === ANALYSIS CALCULATIONS ===
    const analysis = useMemo(() => {
        // Calculate cumulative reach
        const withCumulative = chartData.map((d, i) => ({
            ...d,
            cumulativeReach: chartData.slice(0, i + 1).reduce((sum, item) => sum + (item.reach || 0), 0)
        }));

        const totalReach = withCumulative.length > 0 ? withCumulative[withCumulative.length - 1].cumulativeReach : 0;

        // Average frequency calculation
        const weightedSum = chartData.reduce((sum, d) => sum + ((d.frequency || 0) * (d.reach || 0)), 0);
        const avgFrequency = totalReach > 0 ? weightedSum / totalReach : 0;

        // Find max frequency
        const maxFrequency = chartData.length > 0 ? Math.max(...chartData.map(d => d.frequency || 0)) : 0;

        // Peak reach frequency (mode)
        const peakReachFreq = chartData.reduce((max, d) => (d.reach > (max?.reach || 0) ? d : max), chartData[0]);

        // === EFFECTIVE REACH ANALYSIS ===
        // Effective reach at different frequency thresholds
        const effectiveReach = {
            '1+': totalReach,
            '2+': chartData.filter(d => d.frequency >= 2).reduce((sum, d) => sum + (d.reach || 0), 0),
            '3+': chartData.filter(d => d.frequency >= 3).reduce((sum, d) => sum + (d.reach || 0), 0),
            '4+': chartData.filter(d => d.frequency >= 4).reduce((sum, d) => sum + (d.reach || 0), 0),
            '5+': chartData.filter(d => d.frequency >= 5).reduce((sum, d) => sum + (d.reach || 0), 0),
        };

        // Effective reach percentages
        const effectiveReachPct = {
            '1+': 100,
            '2+': totalReach > 0 ? (effectiveReach['2+'] / totalReach) * 100 : 0,
            '3+': totalReach > 0 ? (effectiveReach['3+'] / totalReach) * 100 : 0,
            '4+': totalReach > 0 ? (effectiveReach['4+'] / totalReach) * 100 : 0,
            '5+': totalReach > 0 ? (effectiveReach['5+'] / totalReach) * 100 : 0,
        };

        // GRP (Gross Rating Points) estimate = Average Frequency × Reach %
        // Assuming reach is in % or 000s
        const grpEstimate = avgFrequency * (totalReach / 100);

        // Frequency efficiency - what % of reach is at optimal frequency (3-5x)
        const optimalReach = chartData
            .filter(d => d.frequency >= 3 && d.frequency <= 5)
            .reduce((sum, d) => sum + (d.reach || 0), 0);
        const frequencyEfficiency = totalReach > 0 ? (optimalReach / totalReach) * 100 : 0;

        // Wasted frequency (>10x) - diminishing returns
        const wastedReach = chartData
            .filter(d => d.frequency > 10)
            .reduce((sum, d) => sum + (d.reach || 0), 0);
        const wastedPercent = totalReach > 0 ? (wastedReach / totalReach) * 100 : 0;

        // Recommendation
        let recommendation = '';
        if (avgFrequency < 2) {
            recommendation = 'Consider increasing frequency to reach optimal levels (3-5x)';
        } else if (avgFrequency > 7) {
            recommendation = 'High frequency detected - consider expanding reach instead';
        } else if (frequencyEfficiency > 50) {
            recommendation = 'Excellent frequency distribution in optimal range';
        } else {
            recommendation = 'Good balance between reach and frequency';
        }

        return {
            chartData: withCumulative,
            totalReach,
            avgFrequency,
            maxFrequency,
            peakReachFreq,
            effectiveReach,
            effectiveReachPct,
            grpEstimate,
            frequencyEfficiency,
            wastedReach,
            wastedPercent,
            recommendation
        };
    }, [chartData]);

    // Color gradient for bars
    const barColors = analysis.chartData.map((_, i) => {
        const hue = 210;
        const saturation = 80;
        const lightness = 50 + (i * 3);
        return `hsl(${hue}, ${saturation}%, ${Math.min(lightness, 80)}%)`;
    });

    const downloadExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();

            // Main data sheet
            const dataSheet = workbook.addWorksheet('Frequency Distribution');
            dataSheet.addRow(['Frequency', 'Reach', 'Cumulative Reach', '% of Total']);
            dataSheet.getRow(1).font = { bold: true };
            analysis.chartData.forEach(item => {
                dataSheet.addRow([
                    item.frequency,
                    item.reach,
                    item.cumulativeReach,
                    ((item.reach / analysis.totalReach) * 100).toFixed(1) + '%'
                ]);
            });

            // Analysis summary sheet
            const summarySheet = workbook.addWorksheet('Analysis Summary');
            summarySheet.addRow(['Metric', 'Value']);
            summarySheet.getRow(1).font = { bold: true };
            summarySheet.addRow(['Total Reach', analysis.totalReach]);
            summarySheet.addRow(['Average Frequency', analysis.avgFrequency.toFixed(2)]);
            summarySheet.addRow(['Max Frequency', analysis.maxFrequency]);
            summarySheet.addRow(['GRP Estimate', analysis.grpEstimate.toFixed(0)]);
            summarySheet.addRow(['Effective Reach 3+', analysis.effectiveReach['3+']]);
            summarySheet.addRow(['Frequency Efficiency', analysis.frequencyEfficiency.toFixed(1) + '%']);
            summarySheet.addRow(['Recommendation', analysis.recommendation]);

            workbook.eachSheet(sheet => {
                sheet.columns.forEach(column => { column.width = 18; });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `reach_frequency_analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({ title: 'Export successful', description: 'Reach & Frequency analysis exported to Excel.', variant: 'success' });
        } catch (error) {
            console.error('Export failed:', error);
            toast({ title: 'Export failed', description: 'An error occurred while exporting.', variant: 'destructive' });
        }
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-14 rounded-full bg-blue-500/15 flex items-center justify-center">
                                <Users className="size-7 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Reach & Frequency Analysis</CardTitle>
                                <CardDescription>
                                    Effective reach calculations and frequency optimization insights
                                </CardDescription>
                            </div>
                        </div>
                        <Button onClick={downloadExcel} variant="outline">
                            <Download className="size-4" />
                            Export Analysis
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* Recommendation Alert */}
            <Alert>
                <CheckCircle className="size-4" />
                <AlertTitle>Analysis Insight</AlertTitle>
                <AlertDescription>{analysis.recommendation}</AlertDescription>
            </Alert>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="size-4 text-blue-500" />
                            <span className="text-sm font-medium text-muted-foreground">Total Reach</span>
                        </div>
                        <p className="text-3xl font-bold">{analysis.totalReach.toLocaleString()}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="size-4 text-green-500" />
                            <span className="text-sm font-medium text-muted-foreground">Avg Frequency</span>
                        </div>
                        <p className="text-3xl font-bold">{analysis.avgFrequency.toFixed(2)}x</p>
                        <Badge variant={analysis.avgFrequency >= 3 && analysis.avgFrequency <= 5 ? 'default' : 'secondary'} className="mt-1">
                            {analysis.avgFrequency >= 3 && analysis.avgFrequency <= 5 ? 'Optimal' : analysis.avgFrequency < 3 ? 'Low' : 'High'}
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="size-4 text-purple-500" />
                            <span className="text-sm font-medium text-muted-foreground">GRP Estimate</span>
                        </div>
                        <p className="text-3xl font-bold">{analysis.grpEstimate.toFixed(0)}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="size-4 text-amber-500" />
                            <span className="text-sm font-medium text-muted-foreground">Frequency Efficiency</span>
                        </div>
                        <p className="text-3xl font-bold">{analysis.frequencyEfficiency.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">reach at 3-5x frequency</p>
                    </CardContent>
                </Card>
            </div>

            {/* Effective Reach Thresholds */}
            <Card>
                <CardHeader>
                    <CardTitle>Effective Reach Analysis</CardTitle>
                    <CardDescription>Reach at different frequency thresholds</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-5 gap-4">
                        {Object.entries(analysis.effectiveReachPct).map(([threshold, pct]) => (
                            <div key={threshold} className="text-center">
                                <Badge variant="outline" className="mb-2">{threshold}</Badge>
                                <p className="text-2xl font-bold">{pct.toFixed(1)}%</p>
                                <p className="text-xs text-muted-foreground">{analysis.effectiveReach[threshold].toLocaleString()} reach</p>
                                <Progress value={pct} className="mt-2" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Frequency Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Reach by Frequency</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analysis.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                <XAxis dataKey="frequency" className="text-xs" tickLine={false} axisLine={false} />
                                <YAxis className="text-xs" tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    formatter={(value) => [value.toLocaleString(), 'Reach']}
                                    labelFormatter={(value) => `Frequency: ${value}x`}
                                />
                                <Bar dataKey="reach" radius={[4, 4, 0, 0]}>
                                    {analysis.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={barColors[index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Cumulative Reach */}
                <Card>
                    <CardHeader>
                        <CardTitle>Cumulative Reach Curve</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={analysis.chartData}>
                                <defs>
                                    <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                <XAxis dataKey="frequency" className="text-xs" tickLine={false} axisLine={false} />
                                <YAxis className="text-xs" tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    formatter={(value) => [value.toLocaleString(), 'Cumulative Reach']}
                                />
                                <Area type="monotone" dataKey="cumulativeReach" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorReach)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Frequency Distribution Details</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Frequency</TableHead>
                                <TableHead className="text-right">Reach</TableHead>
                                <TableHead className="text-right">Cumulative</TableHead>
                                <TableHead className="text-right">% of Total</TableHead>
                                <TableHead className="text-right">Cumulative %</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analysis.chartData.map((item, index) => {
                                const pctOfTotal = (item.reach / analysis.totalReach) * 100;
                                const cumulativePct = (item.cumulativeReach / analysis.totalReach) * 100;
                                return (
                                    <TableRow key={index} className={item.frequency >= 3 && item.frequency <= 5 ? 'bg-green-500/5' : ''}>
                                        <TableCell>
                                            <Badge variant={item.frequency >= 3 && item.frequency <= 5 ? 'default' : 'outline'}>
                                                {item.frequency}x
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{(item.reach || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums">{(item.cumulativeReach || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right tabular-nums">{pctOfTotal.toFixed(1)}%</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Progress value={cumulativePct} className="w-16" />
                                                <span className="tabular-nums w-12">{cumulativePct.toFixed(0)}%</span>
                                            </div>
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

