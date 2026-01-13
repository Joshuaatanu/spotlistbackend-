import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Trophy, Download, TrendingUp, TrendingDown, BarChart3, PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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

export default function TopTenReportView({ data, reportType }) {
    const { toast } = useToast();

    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <Card className="text-center py-16">
                <CardContent>
                    <Trophy className="size-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No Top Ten data available.</p>
                </CardContent>
            </Card>
        );
    }

    // Determine metric from data structure
    const topData = data.slice(0, 10);
    const metricKeys = Object.keys(topData[0] || {}).filter(key =>
        !['name', 'entity', 'company', 'brand', 'product', 'caption', 'label'].includes(key.toLowerCase())
    );

    // Find the primary metric (spend, xrp, airings, reach)
    const primaryMetric = metricKeys.find(k =>
        ['spend', 'cost', 'xrp', 'airings', 'reach'].some(m => k.toLowerCase().includes(m))
    ) || metricKeys[0];

    const entityKey = Object.keys(topData[0] || {}).find(k =>
        ['name', 'entity', 'company', 'brand', 'product', 'caption', 'label'].includes(k.toLowerCase())
    ) || 'name';

    // === ANALYSIS CALCULATIONS ===
    const analysis = useMemo(() => {
        const totalValue = topData.reduce((sum, item) => sum + parseFloat(item[primaryMetric] || 0), 0);
        const avgValue = totalValue / topData.length;

        // Calculate market share and performance metrics
        const chartData = topData.map((item, index) => {
            const value = parseFloat(item[primaryMetric] || 0);
            const marketShare = totalValue > 0 ? (value / totalValue) * 100 : 0;
            const vsAverage = avgValue > 0 ? ((value - avgValue) / avgValue) * 100 : 0;

            // Efficiency score (if we have multiple metrics)
            let efficiency = null;
            const spendKey = metricKeys.find(k => k.toLowerCase().includes('spend') || k.toLowerCase().includes('cost'));
            const xrpKey = metricKeys.find(k => k.toLowerCase().includes('xrp'));

            if (spendKey && xrpKey && item[spendKey] > 0 && item[xrpKey] > 0) {
                efficiency = parseFloat(item[xrpKey]) / parseFloat(item[spendKey]) * 1000; // XRP per 1000€
            }

            return {
                rank: index + 1,
                name: item[entityKey] || item.name || item.entity || 'Unknown',
                value,
                marketShare,
                vsAverage,
                efficiency,
                trend: vsAverage > 10 ? 'up' : vsAverage < -10 ? 'down' : 'stable',
                ...item
            };
        });

        // Market concentration (Herfindahl-Hirschman Index)
        const hhi = chartData.reduce((sum, item) => sum + Math.pow(item.marketShare, 2), 0);
        const marketConcentration = hhi > 2500 ? 'High' : hhi > 1500 ? 'Moderate' : 'Low';

        // Top 3 share
        const top3Share = chartData.slice(0, 3).reduce((sum, item) => sum + item.marketShare, 0);

        // Leader dominance
        const leader = chartData[0];
        const secondPlace = chartData[1];
        const leaderGap = leader && secondPlace ? leader.value - secondPlace.value : 0;
        const leaderGapPercent = secondPlace?.value > 0 ? (leaderGap / secondPlace.value) * 100 : 0;

        return {
            chartData,
            totalValue,
            avgValue,
            hhi,
            marketConcentration,
            top3Share,
            leader,
            leaderGap,
            leaderGapPercent
        };
    }, [topData, primaryMetric, metricKeys, entityKey]);

    // Colors for bar chart - gradient from gold to bronze
    const barColors = [
        '#FFD700', '#FFC125', '#FFB90F', '#FFA500', '#FF8C00',
        '#6B7280', '#6B7280', '#6B7280', '#6B7280', '#6B7280'
    ];

    const formatValue = (value) => {
        if (primaryMetric?.toLowerCase().includes('spend') || primaryMetric?.toLowerCase().includes('cost')) {
            return `€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return value.toLocaleString();
    };

    const downloadExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Top Ten Analysis');

            const headers = ['Rank', 'Entity', 'Market Share %', 'vs Average', ...metricKeys];
            const headerRow = worksheet.addRow(headers);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBBF24' } };

            analysis.chartData.forEach((item) => {
                worksheet.addRow([
                    item.rank,
                    item.name,
                    item.marketShare.toFixed(1) + '%',
                    (item.vsAverage > 0 ? '+' : '') + item.vsAverage.toFixed(1) + '%',
                    ...metricKeys.map(key => item[key] ?? '')
                ]);
            });

            worksheet.columns.forEach(column => { column.width = 15; });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `top_ten_analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({ title: 'Export successful', description: 'Top Ten analysis exported to Excel.', variant: 'success' });
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
                            <div className="size-14 rounded-full bg-amber-500/15 flex items-center justify-center">
                                <Trophy className="size-7 text-amber-500" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Top Ten Analysis</CardTitle>
                                <CardDescription>
                                    Market share and competitive analysis by <Badge variant="secondary">{primaryMetric}</Badge>
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

            {/* Analysis Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="size-4 text-amber-500" />
                            <span className="text-sm font-medium text-muted-foreground">Total {primaryMetric}</span>
                        </div>
                        <p className="text-2xl font-bold">{formatValue(analysis.totalValue)}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <PieChartIcon className="size-4 text-blue-500" />
                            <span className="text-sm font-medium text-muted-foreground">Top 3 Share</span>
                        </div>
                        <p className="text-2xl font-bold">{analysis.top3Share.toFixed(1)}%</p>
                        <Progress value={analysis.top3Share} className="mt-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Trophy className="size-4 text-amber-500" />
                            <span className="text-sm font-medium text-muted-foreground">Leader Gap</span>
                        </div>
                        <p className="text-2xl font-bold">+{analysis.leaderGapPercent.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">vs #2 position</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="size-4 text-green-500" />
                            <span className="text-sm font-medium text-muted-foreground">Market Concentration</span>
                        </div>
                        <p className="text-2xl font-bold">{analysis.marketConcentration}</p>
                        <p className="text-xs text-muted-foreground mt-1">HHI: {analysis.hhi.toFixed(0)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Winner Podium */}
            <div className="grid grid-cols-3 gap-4">
                {analysis.chartData.slice(0, 3).map((item, index) => (
                    <Card
                        key={index}
                        className={`text-center ${index === 0 ? 'ring-2 ring-amber-500 bg-amber-500/5' : ''}`}
                    >
                        <CardContent className="pt-6">
                            <div className="text-4xl mb-2">
                                {index === 0 && '🥇'}
                                {index === 1 && '🥈'}
                                {index === 2 && '🥉'}
                            </div>
                            <h3 className="font-bold text-lg mb-1 truncate" title={item.name}>
                                {item.name}
                            </h3>
                            <p className="text-2xl font-bold text-primary">
                                {formatValue(item.value)}
                            </p>
                            <Badge variant={item.vsAverage > 0 ? 'default' : 'secondary'} className="mt-2">
                                {item.marketShare.toFixed(1)}% share
                            </Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Market Share Pie + Bar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bar Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Rankings by {primaryMetric}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={analysis.chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted" />
                                <XAxis type="number" className="text-xs" tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" className="text-xs" tickLine={false} axisLine={false} width={120} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    formatter={(value) => [formatValue(value), primaryMetric]}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {analysis.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={barColors[index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Market Share Pie */}
                <Card>
                    <CardHeader>
                        <CardTitle>Market Share Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={analysis.chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={120}
                                    label={({ name, marketShare }) => `${name.substring(0, 15)} ${marketShare.toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {analysis.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={barColors[index]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    formatter={(value, name, props) => [
                                        `${formatValue(value)} (${props.payload.marketShare.toFixed(1)}%)`,
                                        name
                                    ]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table with Analysis */}
            <Card>
                <CardHeader>
                    <CardTitle>Competitive Analysis</CardTitle>
                    <CardDescription>Detailed performance metrics and market positioning</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-16">Rank</TableHead>
                                <TableHead>Entity</TableHead>
                                <TableHead className="text-right">{primaryMetric}</TableHead>
                                <TableHead className="text-right">Market Share</TableHead>
                                <TableHead className="text-right">vs Average</TableHead>
                                {analysis.chartData[0]?.efficiency !== null && (
                                    <TableHead className="text-right">Efficiency</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analysis.chartData.map((item, index) => (
                                <TableRow key={index} className={index < 3 ? 'bg-amber-500/5' : ''}>
                                    <TableCell className="font-bold">
                                        {index === 0 && '🥇'}
                                        {index === 1 && '🥈'}
                                        {index === 2 && '🥉'}
                                        {index >= 3 && `#${item.rank}`}
                                    </TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatValue(item.value)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Progress value={item.marketShare} className="w-16" />
                                            <span className="tabular-nums w-12">{item.marketShare.toFixed(1)}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={item.vsAverage > 0 ? 'default' : item.vsAverage < 0 ? 'destructive' : 'secondary'}>
                                            {item.vsAverage > 0 ? '+' : ''}{item.vsAverage.toFixed(1)}%
                                        </Badge>
                                    </TableCell>
                                    {item.efficiency !== null && (
                                        <TableCell className="text-right tabular-nums">
                                            {item.efficiency.toFixed(2)} XRP/k€
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

