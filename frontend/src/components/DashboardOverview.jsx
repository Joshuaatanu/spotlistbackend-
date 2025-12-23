import { useMemo } from 'react';
import { TrendingUp, AlertTriangle, Activity, BarChart3, DollarSign, Users, Target, Clock } from 'lucide-react';

/**
 * Dashboard Overview Component
 * 
 * Displays quick stats and overview cards at the top of the dashboard.
 * Adapts to different report types and provides at-a-glance insights.
 */
export default function DashboardOverview({ data, reportType, metadata }) {
    const { metrics, window_summaries, data: rawData } = data || {};

    // Calculate quick stats based on report type
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

    // Render stats cards based on report type
    const renderSpotlistStats = () => (
        <>
            <StatCard
                icon={Activity}
                label="Total Spots"
                value={quickStats.totalSpots.toLocaleString()}
                trend={null}
                color="#3B82F6"
            />
            <StatCard
                icon={AlertTriangle}
                label="Double Bookings"
                value={quickStats.doubleBookings.toLocaleString()}
                subtitle={`${((quickStats.doubleBookings / quickStats.totalSpots) * 100).toFixed(1)}% of spots`}
                trend={null}
                color={quickStats.doubleBookings > 0 ? "#EF4444" : "#10B981"}
            />
            <StatCard
                icon={DollarSign}
                label="Total Budget"
                value={`€${quickStats.totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle={`€${quickStats.avgCostPerSpot} avg per spot`}
                trend={null}
                color="#10B981"
            />
            <StatCard
                icon={Target}
                label="Risk Score"
                value={quickStats.riskScore}
                subtitle={getRiskLabel(quickStats.riskScore)}
                trend={null}
                color={getRiskColor(quickStats.riskScore)}
            />
        </>
    );

    const renderTopTenStats = () => (
        <>
            <StatCard
                icon={BarChart3}
                label="Top Entity"
                value={quickStats.topEntity}
                subtitle={`#1 in ${metadata?.subtype || 'ranking'}`}
                trend={null}
                color="#3B82F6"
            />
            <StatCard
                icon={TrendingUp}
                label="Top Value"
                value={quickStats.topValue}
                subtitle="Leading metric"
                trend={null}
                color="#10B981"
            />
            <StatCard
                icon={Clock}
                label="Period"
                value={quickStats.period}
                subtitle="Analysis timeframe"
                trend={null}
                color="#6366F1"
            />
            <StatCard
                icon={Activity}
                label="Total Results"
                value={quickStats.totalSpots}
                subtitle="Top 10 items"
                trend={null}
                color="#8B5CF6"
            />
        </>
    );

    const renderReachFrequencyStats = () => (
        <>
            <StatCard
                icon={Users}
                label="Total Reach"
                value={quickStats.totalReach ? `${(quickStats.totalReach * 100).toFixed(1)}%` : 'N/A'}
                subtitle="Cumulative reach"
                trend={null}
                color="#3B82F6"
            />
            <StatCard
                icon={Activity}
                label="Avg Frequency"
                value={quickStats.avgFrequency ? quickStats.avgFrequency.toFixed(2) : 'N/A'}
                subtitle="Average frequency"
                trend={null}
                color="#10B981"
            />
            <StatCard
                icon={Target}
                label="Total Contacts"
                value={quickStats.totalContacts ? quickStats.totalContacts.toLocaleString() : 'N/A'}
                subtitle="Total ad contacts"
                trend={null}
                color="#F59E0B"
            />
            <StatCard
                icon={Users}
                label="Unique Reach"
                value={quickStats.uniqueReach ? `${(quickStats.uniqueReach * 100).toFixed(1)}%` : 'N/A'}
                subtitle="Net reach"
                trend={null}
                color="#8B5CF6"
            />
        </>
    );

    const renderDaypartStats = () => (
        <>
            <StatCard
                icon={Clock}
                label="Dayparts Analyzed"
                value={quickStats.daypartsAnalyzed}
                subtitle="Time segments"
                trend={null}
                color="#3B82F6"
            />
            <StatCard
                icon={TrendingUp}
                label="Top Daypart"
                value={quickStats.topDaypart || 'N/A'}
                subtitle="Best performing"
                trend={null}
                color="#10B981"
            />
            <StatCard
                icon={BarChart3}
                label="Avg Performance"
                value={quickStats.avgPerformance || 'N/A'}
                subtitle="Average metric"
                trend={null}
                color="#F59E0B"
            />
            <StatCard
                icon={Activity}
                label="Channels"
                value={quickStats.channelsAnalyzed}
                subtitle="Channels analyzed"
                trend={null}
                color="#8B5CF6"
            />
        </>
    );

    const renderDeepAnalysisStats = () => (
        <>
            <StatCard
                icon={Activity}
                label="Data Points"
                value={quickStats.dataPoints.toLocaleString()}
                subtitle="Total records"
                trend={null}
                color="#3B82F6"
            />
            <StatCard
                icon={BarChart3}
                label="Variables"
                value={quickStats.variables}
                subtitle="Metrics analyzed"
                trend={null}
                color="#10B981"
            />
            <StatCard
                icon={Target}
                label="Channels"
                value={quickStats.channelsAnalyzed}
                subtitle="Channels analyzed"
                trend={null}
                color="#F59E0B"
            />
            <StatCard
                icon={Clock}
                label="Date Range"
                value={quickStats.dateRange}
                subtitle="Analysis period"
                trend={null}
                color="#8B5CF6"
            />
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
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-m)',
            marginBottom: 'var(--space-xl)'
        }}>
            {renderStats()}
        </div>
    );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, subtitle, trend, color }) {
    return (
        <div className="card" style={{
            padding: 'var(--space-m)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-xs)',
            borderLeft: `4px solid ${color}`,
            transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
        }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon size={20} style={{ color }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-secondary)',
                        fontWeight: 'var(--font-weight-medium)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {label}
                    </div>
                    <div style={{
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--text-primary)',
                        marginTop: '2px'
                    }}>
                        {value}
                    </div>
                    {subtitle && (
                        <div style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-tertiary)',
                            marginTop: '4px'
                        }}>
                            {subtitle}
                        </div>
                    )}
                </div>
            </div>
        </div>
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
    const labels = {
        'Very High': 'Critical attention needed',
        'High': 'Review recommended',
        'Medium': 'Monitor closely',
        'Low': 'Within acceptable range'
    };
    return labels[score] || 'Unknown';
}

function getRiskColor(score) {
    const colors = {
        'Very High': '#EF4444',
        'High': '#F59E0B',
        'Medium': '#3B82F6',
        'Low': '#10B981'
    };
    return colors[score] || '#6B7280';
}

function getTopChannel(data) {
    if (!data || !Array.isArray(data)) return 'N/A';
    const channelCounts = {};
    data.forEach(item => {
        const channel = item.channel || item.channel_name || item.channel_id;
        if (channel) {
            channelCounts[channel] = (channelCounts[channel] || 0) + 1;
        }
    });
    const sorted = Object.entries(channelCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'N/A';
}

function getTopValue(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return 'N/A';
    const first = data[0];
    // Try to find a numeric value field
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
    // Sum reach values if available
    const reachValues = data
        .map(item => item['reach (%)'] || item.reach || item['reach'] || 0)
        .filter(v => typeof v === 'number');
    return reachValues.length > 0 ? reachValues.reduce((a, b) => a + b, 0) / reachValues.length : null;
}

function calculateAvgFrequency(data) {
    if (!data || !Array.isArray(data)) return null;
    const freqValues = data
        .map(item => item.frequency || item.freq || 0)
        .filter(v => typeof v === 'number');
    return freqValues.length > 0 ? freqValues.reduce((a, b) => a + b, 0) / freqValues.length : null;
}

function calculateTotalContacts(data) {
    if (!data || !Array.isArray(data)) return null;
    const contacts = data
        .map(item => item.contacts || item.contact || 0)
        .filter(v => typeof v === 'number');
    return contacts.length > 0 ? contacts.reduce((a, b) => a + b, 0) : null;
}

function calculateUniqueReach(data) {
    // Similar to total reach but for unique reach
    return calculateTotalReach(data);
}

function countUniqueDayparts(data) {
    if (!data || !Array.isArray(data)) return 0;
    const dayparts = new Set();
    data.forEach(item => {
        const daypart = item.daypart || item.daypart_name || item['daypart'];
        if (daypart) dayparts.add(daypart);
    });
    return dayparts.size;
}

function getTopDaypart(data) {
    if (!data || !Array.isArray(data)) return null;
    const daypartPerformance = {};
    data.forEach(item => {
        const daypart = item.daypart || item.daypart_name || item['daypart'];
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
    const values = data
        .map(item => item['reach (%)'] || item.share || item['amr-perc'] || 0)
        .filter(v => typeof v === 'number');
    return values.length > 0 
        ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) + '%'
        : null;
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



