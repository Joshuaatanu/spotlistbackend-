import { useMemo } from 'react';
import { TrendingUp, AlertTriangle, Activity, BarChart3, DollarSign, Users, Target, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function DashboardOverview({ data, reportType, metadata }) {
    const { metrics, window_summaries, data: rawData } = data || {};

    const quickStats = useMemo(() => {
        if (!data) return null;

        switch (reportType) {
            case 'spotlist':
                return {
                    totalSpots: metrics?.total_spots || rawData?.length || 0,
                    doubleBookings: metrics?.double_spots || 0,
                    totalBudget: metrics?.total_cost || 0,
                    riskScore: calculateRiskScore(metrics, window_summaries),
                    topChannel: getTopChannel(rawData),
                    avgCostPerSpot: metrics?.total_cost && metrics?.total_spots
                        ? (metrics.total_cost / metrics.total_spots).toFixed(2)
                        : 0
                };
            case 'topTen':
                return {
                    totalSpots: rawData?.length || 0,
                    topEntity: rawData?.[0]?.name || rawData?.[0]?.caption || 'N/A',
                    topValue: getTopValue(rawData),
                    period: metadata?.period || 'N/A'
                };
            case 'reachFrequency':
                return {
                    totalReach: calculateTotalReach(rawData),
                    avgFrequency: calculateAvgFrequency(rawData),
                    totalContacts: calculateTotalContacts(rawData),
                    uniqueReach: calculateUniqueReach(rawData)
                };
            case 'daypartAnalysis':
                return {
                    daypartsAnalyzed: countUniqueDayparts(rawData),
                    topDaypart: getTopDaypart(rawData),
                    avgPerformance: calculateAvgDaypartPerformance(rawData),
                    channelsAnalyzed: countUniqueChannels(rawData)
                };
            case 'deepAnalysis':
                return {
                    dataPoints: rawData?.length || 0,
                    variables: metadata?.variables?.length || 0,
                    channelsAnalyzed: countUniqueChannels(rawData),
                    dateRange: metadata?.date_from && metadata?.date_to
                        ? `${metadata.date_from} to ${metadata.date_to}`
                        : 'N/A'
                };
            default:
                return null;
        }
    }, [data, reportType, metadata, metrics, window_summaries, rawData]);

    if (!quickStats) return null;

    const renderSpotlistStats = () => (
        <>
            <StatCard icon={Activity} label="Total Spots" value={quickStats.totalSpots.toLocaleString()} color="blue" />
            <StatCard
                icon={AlertTriangle}
                label="Double Bookings"
                value={quickStats.doubleBookings.toLocaleString()}
                subtitle={`${((quickStats.doubleBookings / quickStats.totalSpots) * 100).toFixed(1)}% of spots`}
                color={quickStats.doubleBookings > 0 ? "red" : "green"}
            />
            <StatCard
                icon={DollarSign}
                label="Total Budget"
                value={`€${quickStats.totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle={`€${quickStats.avgCostPerSpot} avg per spot`}
                color="green"
            />
            <StatCard
                icon={Target}
                label="Risk Score"
                value={quickStats.riskScore}
                subtitle={getRiskLabel(quickStats.riskScore)}
                color={getRiskColorName(quickStats.riskScore)}
            />
        </>
    );

    const renderTopTenStats = () => (
        <>
            <StatCard icon={BarChart3} label="Top Entity" value={quickStats.topEntity} subtitle={`#1 in ${metadata?.subtype || 'ranking'}`} color="blue" />
            <StatCard icon={TrendingUp} label="Top Value" value={quickStats.topValue} subtitle="Leading metric" color="green" />
            <StatCard icon={Clock} label="Period" value={quickStats.period} subtitle="Analysis timeframe" color="purple" />
            <StatCard icon={Activity} label="Total Results" value={quickStats.totalSpots} subtitle="Top 10 items" color="violet" />
        </>
    );

    const renderReachFrequencyStats = () => (
        <>
            <StatCard icon={Users} label="Total Reach" value={quickStats.totalReach ? `${(quickStats.totalReach * 100).toFixed(1)}%` : 'N/A'} subtitle="Cumulative reach" color="blue" />
            <StatCard icon={Activity} label="Avg Frequency" value={quickStats.avgFrequency ? quickStats.avgFrequency.toFixed(2) : 'N/A'} subtitle="Average frequency" color="green" />
            <StatCard icon={Target} label="Total Contacts" value={quickStats.totalContacts ? quickStats.totalContacts.toLocaleString() : 'N/A'} subtitle="Total ad contacts" color="amber" />
            <StatCard icon={Users} label="Unique Reach" value={quickStats.uniqueReach ? `${(quickStats.uniqueReach * 100).toFixed(1)}%` : 'N/A'} subtitle="Net reach" color="violet" />
        </>
    );

    const renderDaypartStats = () => (
        <>
            <StatCard icon={Clock} label="Dayparts Analyzed" value={quickStats.daypartsAnalyzed} subtitle="Time segments" color="blue" />
            <StatCard icon={TrendingUp} label="Top Daypart" value={quickStats.topDaypart || 'N/A'} subtitle="Best performing" color="green" />
            <StatCard icon={BarChart3} label="Avg Performance" value={quickStats.avgPerformance || 'N/A'} subtitle="Average metric" color="amber" />
            <StatCard icon={Activity} label="Channels" value={quickStats.channelsAnalyzed} subtitle="Channels analyzed" color="violet" />
        </>
    );

    const renderDeepAnalysisStats = () => (
        <>
            <StatCard icon={Activity} label="Data Points" value={quickStats.dataPoints.toLocaleString()} subtitle="Total records" color="blue" />
            <StatCard icon={BarChart3} label="Variables" value={quickStats.variables} subtitle="Metrics analyzed" color="green" />
            <StatCard icon={Target} label="Channels" value={quickStats.channelsAnalyzed} subtitle="Channels analyzed" color="amber" />
            <StatCard icon={Clock} label="Date Range" value={quickStats.dateRange} subtitle="Analysis period" color="violet" />
        </>
    );

    const renderStats = () => {
        switch (reportType) {
            case 'spotlist': return renderSpotlistStats();
            case 'topTen': return renderTopTenStats();
            case 'reachFrequency': return renderReachFrequencyStats();
            case 'daypartAnalysis': return renderDaypartStats();
            case 'deepAnalysis': return renderDeepAnalysisStats();
            default: return null;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {renderStats()}
        </div>
    );
}

// Color mappings for Tailwind
const colorClasses = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-950/50', text: 'text-blue-500', border: 'border-l-blue-500' },
    green: { bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-500', border: 'border-l-emerald-500' },
    red: { bg: 'bg-red-100 dark:bg-red-950/50', text: 'text-red-500', border: 'border-l-red-500' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-950/50', text: 'text-amber-500', border: 'border-l-amber-500' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-950/50', text: 'text-purple-500', border: 'border-l-purple-500' },
    violet: { bg: 'bg-violet-100 dark:bg-violet-950/50', text: 'text-violet-500', border: 'border-l-violet-500' },
};

function StatCard({ icon: Icon, label, value, subtitle, color = 'blue' }) {
    const colors = colorClasses[color] || colorClasses.blue;

    return (
        <Card className={cn(
            "p-4 flex flex-col gap-1 border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
            colors.border
        )}>
            <div className="flex items-center gap-3">
                <div className={cn("size-10 rounded-lg flex items-center justify-center", colors.bg)}>
                    <Icon className={cn("size-5", colors.text)} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {label}
                    </p>
                    <p className="text-xl font-bold text-foreground mt-0.5 truncate">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
        </Card>
    );
}

// Helper functions
function calculateRiskScore(metrics, window_summaries) {
    if (!metrics || !window_summaries) return 'Low';
    const doubleBookingRate = metrics.double_spots / metrics.total_spots;
    const budgetRisk = metrics.double_cost / metrics.total_cost;
    if (doubleBookingRate > 0.5 || budgetRisk > 0.5) return 'Very High';
    if (doubleBookingRate > 0.3 || budgetRisk > 0.3) return 'High';
    if (doubleBookingRate > 0.1 || budgetRisk > 0.1) return 'Medium';
    return 'Low';
}

function getRiskLabel(score) {
    const labels = { 'Very High': 'Critical attention needed', 'High': 'Review recommended', 'Medium': 'Monitor closely', 'Low': 'Within acceptable range' };
    return labels[score] || 'Unknown';
}

function getRiskColorName(score) {
    const colors = { 'Very High': 'red', 'High': 'amber', 'Medium': 'blue', 'Low': 'green' };
    return colors[score] || 'blue';
}

function getTopChannel(data) {
    if (!data || !Array.isArray(data)) return 'N/A';
    const channelCounts = {};
    data.forEach(item => {
        const channel = item.channel || item.channel_name || item.channel_id;
        if (channel) channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    });
    const sorted = Object.entries(channelCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'N/A';
}

function getTopValue(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return 'N/A';
    const first = data[0];
    const valueFields = ['xrp', 'share', 'value', 'score', 'reach', 'amr-perc'];
    for (const field of valueFields) {
        if (first[field] !== undefined) {
            return typeof first[field] === 'number'
                ? first[field].toLocaleString(undefined, { maximumFractionDigits: 2 })
                : first[field];
        }
    }
    return 'N/A';
}

function calculateTotalReach(data) {
    if (!data || !Array.isArray(data)) return null;
    const reachValues = data.map(item => item['reach (%)'] || item.reach || 0).filter(v => typeof v === 'number');
    return reachValues.length > 0 ? reachValues.reduce((a, b) => a + b, 0) / reachValues.length : null;
}

function calculateAvgFrequency(data) {
    if (!data || !Array.isArray(data)) return null;
    const freqValues = data.map(item => item.frequency || item.freq || 0).filter(v => typeof v === 'number');
    return freqValues.length > 0 ? freqValues.reduce((a, b) => a + b, 0) / freqValues.length : null;
}

function calculateTotalContacts(data) {
    if (!data || !Array.isArray(data)) return null;
    const contacts = data.map(item => item.contacts || item.contact || 0).filter(v => typeof v === 'number');
    return contacts.length > 0 ? contacts.reduce((a, b) => a + b, 0) : null;
}

function calculateUniqueReach(data) { return calculateTotalReach(data); }

function countUniqueDayparts(data) {
    if (!data || !Array.isArray(data)) return 0;
    const dayparts = new Set();
    data.forEach(item => {
        const daypart = item.daypart || item.daypart_name;
        if (daypart) dayparts.add(daypart);
    });
    return dayparts.size;
}

function getTopDaypart(data) {
    if (!data || !Array.isArray(data)) return null;
    const daypartPerformance = {};
    data.forEach(item => {
        const daypart = item.daypart || item.daypart_name;
        if (daypart) {
            const value = item['reach (%)'] || item.share || item['amr-perc'] || 0;
            if (!daypartPerformance[daypart]) daypartPerformance[daypart] = 0;
            daypartPerformance[daypart] += value;
        }
    });
    const sorted = Object.entries(daypartPerformance).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
}

function calculateAvgDaypartPerformance(data) {
    if (!data || !Array.isArray(data)) return null;
    const values = data.map(item => item['reach (%)'] || item.share || item['amr-perc'] || 0).filter(v => typeof v === 'number');
    return values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) + '%' : null;
}

function countUniqueChannels(data) {
    if (!data || !Array.isArray(data)) return 0;
    const channels = new Set();
    data.forEach(item => {
        const channel = item.channel || item.channel_name || item.channel_id;
        if (channel) channels.add(channel);
    });
    return channels.size;
}

