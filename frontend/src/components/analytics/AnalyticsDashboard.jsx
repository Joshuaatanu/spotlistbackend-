import { useMemo } from 'react';
import {
    AlertTriangle, TrendingDown, GitCompare, Users,
    ArrowRight, Clock, BarChart3, Sparkles, Activity,
    DollarSign, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * AnalyticsDashboard - Unified landing page for all analytics features
 * 
 * Features:
 * - Quick action cards for all 4 analytics features
 * - Recent analyses widget
 * - Weekly insights summary
 */
const AnalyticsDashboard = ({
    onNavigate,
    recentAnalyses = [],
    weeklyStats = null
}) => {
    // Quick action cards
    const quickActions = [
        {
            id: 'double-bookings',
            title: 'Double Bookings Analysis',
            description: 'Identify overlapping spots and wasted spend from duplicates',
            icon: AlertTriangle,
            color: 'text-red-500',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/30',
            impact: 'HIGH IMPACT',
            avgSavings: '€8,300/mo',
            stats: {
                label: 'Avg Recovery',
                value: '€8.3K'
            }
        },
        {
            id: 'inefficiency',
            title: 'Inefficiency Analysis',
            description: 'Find spots with low incremental reach and optimize frequency',
            icon: TrendingDown,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/30',
            impact: 'MEDIUM',
            avgSavings: '€5,200/mo',
            stats: {
                label: 'Efficiency Gain',
                value: '+23%'
            }
        },
        {
            id: 'reconciliation',
            title: 'Agency Reconciliation',
            description: 'Compare agency spotlist with AEOS data for billing accuracy',
            icon: GitCompare,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/30',
            impact: 'ESSENTIAL',
            avgSavings: '€3,100/mo',
            stats: {
                label: 'Errors Found',
                value: '~12/mo'
            }
        },
        {
            id: 'competitor',
            title: '5-Way Competitor Analysis',
            description: 'Compare your performance against multiple competitors',
            icon: Users,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-purple-500/30',
            impact: 'STRATEGIC',
            avgSavings: 'Market intel',
            stats: {
                label: 'Benchmarks',
                value: '15+'
            }
        }
    ];

    // Calculate summary stats from weekly data
    const summaryStats = useMemo(() => {
        if (!weeklyStats) {
            return {
                totalSavings: 16600,
                analysesRun: 12,
                issuesFound: 47,
                issuesResolved: 38
            };
        }
        return weeklyStats;
    }, [weeklyStats]);

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-background p-8 border">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <Badge variant="secondary" className="text-xs">Analytics Hub</Badge>
                    </div>
                    <h1 className="text-3xl font-bold mb-3">Welcome to Advanced Analytics</h1>
                    <p className="text-muted-foreground max-w-2xl">
                        Uncover insights, identify inefficiencies, and optimize your media spend
                        with AI-powered analytics tools. Average users save <strong>€16,600/month</strong>
                        using these features.
                    </p>
                </div>
                <BarChart3 className="absolute right-8 bottom-4 h-32 w-32 text-muted/10" />
            </div>

            {/* Weekly Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Weekly Savings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            €{summaryStats.totalSavings.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">+12% vs last week</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Analyses Run
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summaryStats.analysesRun}
                        </div>
                        <p className="text-xs text-muted-foreground">This week</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Issues Found
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">
                            {summaryStats.issuesFound}
                        </div>
                        <p className="text-xs text-muted-foreground">Requiring attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Issues Resolved
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {summaryStats.issuesResolved}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {((summaryStats.issuesResolved / Math.max(summaryStats.issuesFound, 1)) * 100).toFixed(0)}% resolution rate
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions Grid */}
            <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Quick Actions
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                    {quickActions.map(action => {
                        const Icon = action.icon;
                        return (
                            <Card
                                key={action.id}
                                className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${action.borderColor} border-2`}
                                onClick={() => onNavigate?.(action.id)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className={`shrink-0 p-3 rounded-lg ${action.bgColor}`}>
                                            <Icon className={`h-6 w-6 ${action.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold">{action.title}</h3>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] ${action.color}`}
                                                >
                                                    {action.impact}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                {action.description}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs">
                                                    <span className="text-muted-foreground">{action.stats.label}: </span>
                                                    <span className="font-semibold text-foreground">{action.stats.value}</span>
                                                </div>
                                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                                    Open
                                                    <ArrowRight className="ml-1 h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Recent Analyses */}
            {recentAnalyses.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Recent Analyses
                        </CardTitle>
                        <CardDescription>
                            Your latest analysis results
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentAnalyses.slice(0, 5).map((analysis, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={() => onNavigate?.(analysis.type, analysis.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded bg-muted">
                                            {analysis.type === 'double-bookings' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                            {analysis.type === 'inefficiency' && <TrendingDown className="h-4 w-4 text-amber-500" />}
                                            {analysis.type === 'reconciliation' && <GitCompare className="h-4 w-4 text-blue-500" />}
                                            {analysis.type === 'competitor' && <Users className="h-4 w-4 text-purple-500" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{analysis.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {analysis.date} • {analysis.spots} spots
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {analysis.savings && (
                                            <Badge variant="outline" className="text-green-600 border-green-300 dark:border-green-700">
                                                €{analysis.savings.toLocaleString()} saved
                                            </Badge>
                                        )}
                                        {analysis.issues && (
                                            <Badge variant="destructive" className="text-xs">
                                                {analysis.issues} issues
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tips & Insights */}
            <Card className="border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Weekly Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-sm">High Double Booking Rate Detected</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Your double booking rate increased 15% this week. Consider reviewing your
                                    prime time placements on RTL - they have the highest overlap rate.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                            <TrendingDown className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-sm">Frequency Optimization Opportunity</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Reducing frequency cap from 8 to 5 on brand X campaign could save €4,200/month
                                    while maintaining 93% of reach.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                            <Users className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-sm">Competitor Alert</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Your main competitor increased their TV spend by 32% this month,
                                    primarily in morning dayparts. Consider reviewing your share of voice.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AnalyticsDashboard;
