import { useMemo, useCallback } from 'react';
import {
    Activity,
    FileText,
    TrendingUp,
    Clock,
    ChevronRight,
    Plus,
    BarChart3,
    AlertTriangle,
    Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function DashboardHome({
    history,
    onStartNewAnalysis,
    onViewHistory,
    onSelectAnalysis
}) {
    // Calculate aggregate stats from history
    const stats = useMemo(() => {
        if (!history || history.length === 0) {
            return {
                totalAnalyses: 0,
                totalSpots: 0,
                totalDoubleBookings: 0,
                avgDoubleRate: 0
            };
        }

        let totalSpots = 0;
        let totalDoubleBookings = 0;

        history.forEach(analysis => {
            const spots = analysis.metrics?.total_spots || 0;
            const doubles = analysis.metrics?.double_spots || 0;
            totalSpots += spots;
            totalDoubleBookings += doubles;
        });

        const avgDoubleRate = totalSpots > 0
            ? ((totalDoubleBookings / totalSpots) * 100).toFixed(1)
            : 0;

        return {
            totalAnalyses: history.length,
            totalSpots,
            totalDoubleBookings,
            avgDoubleRate
        };
    }, [history]);

    // Get recent 5 analyses
    const recentAnalyses = useMemo(() => {
        return (history || []).slice(0, 5);
    }, [history]);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Unknown';
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Export dashboard stats to CSV
    const handleExport = useCallback(() => {
        // Build CSV content
        const csvLines = [
            'Spot Analysis Dashboard Export',
            `Generated: ${new Date().toLocaleString()}`,
            '',
            'SUMMARY STATISTICS',
            `Total Analyses,${stats.totalAnalyses}`,
            `Total Spots Analyzed,${stats.totalSpots}`,
            `Total Double Bookings,${stats.totalDoubleBookings}`,
            `Average Double Booking Rate,${stats.avgDoubleRate}%`,
            '',
            'ANALYSIS HISTORY',
            'File Name,Date,Total Spots,Double Bookings,Double Rate'
        ];

        history.forEach(analysis => {
            const fileName = analysis.fileName || analysis.file_name || 'Unnamed';
            const date = analysis.timestamp || analysis.created_at || 'Unknown';
            const spots = analysis.metrics?.total_spots || 0;
            const doubles = analysis.metrics?.double_spots || 0;
            const rate = spots > 0 ? ((doubles / spots) * 100).toFixed(1) : 0;
            csvLines.push(`"${fileName}",${date},${spots},${doubles},${rate}%`);
        });

        const csvContent = csvLines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `spot-analysis-export-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [history, stats]);

    return (
        <div className="animate-in space-y-8">
            {/* Welcome Section */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="font-display text-2xl font-bold mb-2">
                        Welcome back 👋
                    </h2>
                    <p className="text-muted-foreground">
                        Here's an overview of your spotlist analysis activity
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport} disabled={history.length === 0}>
                        <Download className="size-4 mr-2" />
                        Export
                    </Button>
                    <Button onClick={onStartNewAnalysis} size="lg">
                        <Plus className="size-5 mr-2" />
                        New Analysis
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="dashboard-stats">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Total Analyses</p>
                                <p className="text-3xl font-bold">{stats.totalAnalyses}</p>
                            </div>
                            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Activity className="size-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Spots Analyzed</p>
                                <p className="text-3xl font-bold">{stats.totalSpots.toLocaleString()}</p>
                            </div>
                            <div className="size-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <BarChart3 className="size-6 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Double Bookings</p>
                                <p className="text-3xl font-bold text-amber-500">
                                    {stats.totalDoubleBookings.toLocaleString()}
                                </p>
                            </div>
                            <div className="size-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                                <AlertTriangle className="size-6 text-amber-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Avg. Double Rate</p>
                                <p className="text-3xl font-bold">
                                    {stats.avgDoubleRate}%
                                </p>
                            </div>
                            <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <TrendingUp className="size-6 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="size-5" />
                            Recent Activity
                        </CardTitle>
                        <CardDescription>
                            Your latest spotlist analyses
                        </CardDescription>
                    </div>
                    {history.length > 5 && (
                        <Button variant="ghost" size="sm" onClick={onViewHistory}>
                            View All
                            <ChevronRight className="size-4 ml-1" />
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {recentAnalyses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="size-12 mx-auto mb-4 opacity-50" />
                            <p className="mb-2">No analyses yet</p>
                            <p className="text-sm">Start your first analysis to see activity here</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentAnalyses.map((analysis, index) => {
                                const doubleRate = analysis.metrics?.total_spots > 0
                                    ? ((analysis.metrics.double_spots / analysis.metrics.total_spots) * 100).toFixed(1)
                                    : 0;

                                return (
                                    <div
                                        key={analysis.id || index}
                                        className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => onSelectAnalysis(analysis)}
                                    >
                                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <FileText className="size-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">
                                                {analysis.fileName || analysis.file_name || 'Unnamed'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(analysis.timestamp || analysis.created_at)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="text-right">
                                                <p className="text-sm font-medium">
                                                    {(analysis.metrics?.total_spots || 0).toLocaleString()} spots
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(analysis.metrics?.double_spots || 0).toLocaleString()} doubles
                                                </p>
                                            </div>
                                            <Badge
                                                variant={Number(doubleRate) > 5 ? "destructive" : Number(doubleRate) > 2 ? "warning" : "success"}
                                            >
                                                {doubleRate}%
                                            </Badge>
                                            <ChevronRight className="size-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onStartNewAnalysis}>
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Plus className="size-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold">Start New Analysis</p>
                            <p className="text-sm text-muted-foreground">Upload or fetch fresh data</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onViewHistory}>
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="size-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Clock className="size-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="font-semibold">View Full History</p>
                            <p className="text-sm text-muted-foreground">Browse all past analyses</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
