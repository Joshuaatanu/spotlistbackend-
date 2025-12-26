import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Activity, TrendingUp, Target, Users, BarChart3, Download, Award, AlertTriangle, CheckCircle } from 'lucide-react';
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

export default function DeepAnalysisReportView({ data, reportType }) {
    const { toast } = useToast();

    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <Card className="text-center py-16">
                <CardContent>
                    <Activity className="size-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No Deep Analysis data available.</p>
                </CardContent>
            </Card>
        );
    }

    // KPI fields
    const kpiFields = [
        'amr-perc', 'amr_perc', 'amr',
        'reach (%)', 'reach_perc', 'reach',
        'reach-avg', 'reach_avg',
        'share',
        'ats-avg', 'ats_avg',
        'atv-avg', 'atv_avg',
        'airings', 'spend', 'cost'
    ];

    // Get channel/entity identifier
    const entityKey = Object.keys(data[0] || {}).find(k =>
        ['channel', 'event', 'name', 'label', 'caption'].includes(k.toLowerCase())
    ) || 'channel';

    // Find available KPIs
    const availableKPIs = useMemo(() => {
        return kpiFields.filter(kpi =>
            data.some(item => Object.keys(item).some(key =>
                key.toLowerCase().includes(kpi.toLowerCase().replace(/[-\s]/g, ''))
            ))
        );
    }, [data]);

    // === ANALYSIS CALCULATIONS ===
    const analysis = useMemo(() => {
        // Prepare data with normalized KPIs
        const chartData = data.map(item => {
            const result = {
                name: item[entityKey] || item.channel || item.event || 'Unknown',
                ...item
            };

            kpiFields.forEach(kpi => {
                const key = Object.keys(item).find(k =>
                    k.toLowerCase().includes(kpi.toLowerCase().replace(/[-\s]/g, ''))
                );
                if (key && key !== entityKey) {
                    result[kpi] = parseFloat(item[key] || 0);
                }
            });

            return result;
        });

        // Calculate averages for benchmarking
        const averages = {};
        availableKPIs.forEach(kpi => {
            const values = chartData.map(d => d[kpi] || 0).filter(v => v > 0);
            averages[kpi] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        });

        // Calculate efficiency scores
        const withScores = chartData.map(item => {
            // Performance index = (actual / average) * 100 for each KPI
            const scores = {};
            let totalScore = 0;
            let scoreCount = 0;

            availableKPIs.forEach(kpi => {
                if (item[kpi] > 0 && averages[kpi] > 0) {
                    const score = (item[kpi] / averages[kpi]) * 100;
                    scores[`${kpi}_score`] = score;
                    totalScore += score;
                    scoreCount++;
                }
            });

            const overallScore = scoreCount > 0 ? totalScore / scoreCount : 0;

            // Efficiency rating
            let rating = 'Average';
            let ratingColor = 'secondary';
            if (overallScore >= 120) {
                rating = 'Excellent';
                ratingColor = 'default';
            } else if (overallScore >= 100) {
                rating = 'Good';
                ratingColor = 'default';
            } else if (overallScore < 80) {
                rating = 'Below Average';
                ratingColor = 'destructive';
            }

            return {
                ...item,
                ...scores,
                overallScore,
                rating,
                ratingColor
            };
        });

        // Sort by overall score
        const sorted = [...withScores].sort((a, b) => b.overallScore - a.overallScore);

        // Top performers (score > 110)
        const topPerformers = sorted.filter(d => d.overallScore >= 110);
        const underPerformers = sorted.filter(d => d.overallScore < 90);

        // Radar data for top performer vs average
        const radarData = availableKPIs.slice(0, 6).map(kpi => {
            const topValue = sorted[0]?.[kpi] || 0;
            const avgValue = averages[kpi] || 0;
            const maxValue = Math.max(...chartData.map(d => d[kpi] || 0));

            return {
                kpi: kpi.replace(/[-_]/g, ' ').toUpperCase(),
                topPerformer: maxValue > 0 ? (topValue / maxValue) * 100 : 0,
                average: maxValue > 0 ? (avgValue / maxValue) * 100 : 0,
                topActual: topValue,
                avgActual: avgValue
            };
        });

        // Insights
        const insights = [];
        if (topPerformers.length > 0) {
            insights.push({
                type: 'success',
                title: 'Top Performers',
                message: `${topPerformers.map(p => p.name).join(', ')} are performing above average`
            });
        }
        if (underPerformers.length > 0) {
            insights.push({
                type: 'warning',
                title: 'Needs Attention',
                message: `${underPerformers.map(p => p.name).join(', ')} are below average performance`
            });
        }

        return {
            chartData: sorted,
            averages,
            radarData,
            topPerformers,
            underPerformers,
            insights,
            leader: sorted[0]
        };
    }, [data, availableKPIs, entityKey]);

    const barColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    const downloadExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Channel Analysis');

            const headers = ['Rank', entityKey, 'Overall Score', 'Rating', ...availableKPIs.map(k => k.toUpperCase())];
            const headerRow = worksheet.addRow(headers);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };

            analysis.chartData.forEach((item, i) => {
                worksheet.addRow([
                    i + 1,
                    item.name,
                    item.overallScore.toFixed(0),
                    item.rating,
                    ...availableKPIs.map(kpi => item[kpi]?.toFixed(2) ?? '-')
                ]);
            });

            // Benchmarks sheet
            const benchmarkSheet = workbook.addWorksheet('Benchmarks');
            benchmarkSheet.addRow(['KPI', 'Average', 'Best', 'Best Channel']);
            benchmarkSheet.getRow(1).font = { bold: true };
            availableKPIs.forEach(kpi => {
                const best = analysis.chartData.reduce((max, d) => (d[kpi] > (max[kpi] || 0) ? d : max), {});
                benchmarkSheet.addRow([kpi.toUpperCase(), analysis.averages[kpi]?.toFixed(2), best[kpi]?.toFixed(2), best.name]);
            });

            workbook.eachSheet(sheet => { sheet.columns.forEach(col => { col.width = 15; }); });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `deep_analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
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
                            <div className="size-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                <Activity className="size-7 text-emerald-500" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Deep Analysis (KPIs)</CardTitle>
                                <CardDescription>Channel efficiency scoring and performance benchmarking</CardDescription>
                            </div>
                        </div>
                        <Button onClick={downloadExcel} variant="outline">
                            <Download className="size-4" />
                            Export Analysis
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* Insights */}
            {analysis.insights.map((insight, i) => (
                <Alert key={i} variant={insight.type === 'warning' ? 'destructive' : 'default'}>
                    {insight.type === 'warning' ? <AlertTriangle className="size-4" /> : <CheckCircle className="size-4" />}
                    <AlertTitle>{insight.title}</AlertTitle>
                    <AlertDescription>{insight.message}</AlertDescription>
                </Alert>
            ))}

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Award className="size-4 text-amber-500" />
                            <span className="text-sm font-medium text-muted-foreground">Top Performer</span>
                        </div>
                        <p className="text-xl font-bold truncate">{analysis.leader?.name}</p>
                        <Badge className="mt-1">Score: {analysis.leader?.overallScore.toFixed(0)}</Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="size-4 text-green-500" />
                            <span className="text-sm font-medium text-muted-foreground">Above Average</span>
                        </div>
                        <p className="text-3xl font-bold">{analysis.topPerformers.length}</p>
                        <p className="text-xs text-muted-foreground">channels scoring 110+</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="size-4 text-red-500" />
                            <span className="text-sm font-medium text-muted-foreground">Below Average</span>
                        </div>
                        <p className="text-3xl font-bold">{analysis.underPerformers.length}</p>
                        <p className="text-xs text-muted-foreground">channels scoring &lt;90</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="size-4 text-blue-500" />
                            <span className="text-sm font-medium text-muted-foreground">Channels Analyzed</span>
                        </div>
                        <p className="text-3xl font-bold">{analysis.chartData.length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Radar Chart - Top vs Average */}
            {analysis.radarData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Top Performer vs Market Average</CardTitle>
                        <CardDescription>Comparing {analysis.leader?.name} against average performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <RadarChart data={analysis.radarData}>
                                <PolarGrid className="stroke-muted" />
                                <PolarAngleAxis dataKey="kpi" className="text-xs" />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                <Radar name="Top Performer" dataKey="topPerformer" stroke="#10B981" fill="#10B981" fillOpacity={0.5} />
                                <Radar name="Average" dataKey="average" stroke="#6B7280" fill="#6B7280" fillOpacity={0.2} />
                                <Legend />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    formatter={(value, name, props) => [props.payload[name === 'Top Performer' ? 'topActual' : 'avgActual']?.toFixed(2), name]}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Performance Scores Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Channel Performance Scores</CardTitle>
                    <CardDescription>100 = market average. Higher is better.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={analysis.chartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted" />
                            <XAxis type="number" domain={[0, 'auto']} className="text-xs" tickLine={false} axisLine={false} />
                            <YAxis dataKey="name" type="category" className="text-xs" tickLine={false} axisLine={false} width={120} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                formatter={(value) => [`${value.toFixed(0)} (${value >= 100 ? 'Above' : 'Below'} avg)`, 'Score']}
                            />
                            <Bar dataKey="overallScore" radius={[0, 4, 4, 0]}>
                                {analysis.chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.overallScore >= 110 ? '#10B981' : entry.overallScore >= 100 ? '#3B82F6' : entry.overallScore >= 90 ? '#F59E0B' : '#EF4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Detailed Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Performance Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-12">Rank</TableHead>
                                    <TableHead>Channel</TableHead>
                                    <TableHead className="text-right">Score</TableHead>
                                    <TableHead className="text-center">Rating</TableHead>
                                    {availableKPIs.slice(0, 4).map(kpi => (
                                        <TableHead key={kpi} className="text-right">{kpi.replace(/[-_]/g, ' ').toUpperCase()}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analysis.chartData.map((item, index) => (
                                    <TableRow key={index} className={item.overallScore >= 110 ? 'bg-emerald-500/5' : item.overallScore < 90 ? 'bg-red-500/5' : ''}>
                                        <TableCell className="font-bold">
                                            {index === 0 && '🥇'}
                                            {index === 1 && '🥈'}
                                            {index === 2 && '🥉'}
                                            {index >= 3 && `#${index + 1}`}
                                        </TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Progress value={Math.min(item.overallScore, 150) / 1.5} className="w-16" />
                                                <span className="tabular-nums w-10">{item.overallScore.toFixed(0)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={item.ratingColor}>{item.rating}</Badge>
                                        </TableCell>
                                        {availableKPIs.slice(0, 4).map(kpi => (
                                            <TableCell key={kpi} className="text-right tabular-nums">
                                                {item[kpi]?.toFixed(2) ?? '-'}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
