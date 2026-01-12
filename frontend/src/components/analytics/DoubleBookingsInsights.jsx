import { useState, useMemo, useEffect } from 'react';
import {
    AlertTriangle, Clock, Tv, Copy, Sparkles, CheckCircle2,
    DollarSign, TrendingDown, Lightbulb, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * DoubleBookingsInsights - Root cause analysis panel with AI-powered insights
 * 
 * Features:
 * - Automatic pattern detection (time concentration, channel saturation, creative repetition)
 * - Rule-based root cause analysis
 * - Actionable recommendations
 * - Savings estimate
 */
const DoubleBookingsInsights = ({ spots = [], doubleBookings = [] }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(true);

    // Simulate analysis delay for UX
    useEffect(() => {
        setIsAnalyzing(true);
        const timer = setTimeout(() => setIsAnalyzing(false), 800);
        return () => clearTimeout(timer);
    }, [spots, doubleBookings]);

    // Analyze time concentration
    const timeConcentration = useMemo(() => {
        if (!doubleBookings || doubleBookings.length === 0) return null;

        const hourCounts = {};
        doubleBookings.forEach(spot => {
            const timeStr = spot.time || (spot.timestamp?.split(' ')[1]) || '00:00:00';
            const hour = parseInt(timeStr.split(':')[0], 10);
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const entries = Object.entries(hourCounts);
        if (entries.length === 0) return null;

        const maxEntry = entries.reduce((max, [hour, count]) =>
            count > max.count ? { hour: parseInt(hour), count } : max
            , { hour: 0, count: 0 });

        const percentage = (maxEntry.count / doubleBookings.length) * 100;

        return {
            isSignificant: percentage > 30,
            peakHour: maxEntry.hour,
            count: maxEntry.count,
            percentage
        };
    }, [doubleBookings]);

    // Analyze channel concentration
    const channelConcentration = useMemo(() => {
        if (!doubleBookings || doubleBookings.length === 0) return null;

        const channelCounts = {};
        doubleBookings.forEach(spot => {
            const channel = spot.channel_name || spot.channel_id || spot.Channel || 'Unknown';
            channelCounts[channel] = (channelCounts[channel] || 0) + 1;
        });

        const entries = Object.entries(channelCounts);
        if (entries.length === 0) return null;

        const topChannel = entries.reduce((max, [ch, count]) =>
            count > max.count ? { channel: ch, count } : max
            , { channel: '', count: 0 });

        const percentage = (topChannel.count / doubleBookings.length) * 100;

        // Get other channels not heavily used
        const allChannels = Object.keys(channelCounts);
        const alternatives = allChannels
            .filter(ch => ch !== topChannel.channel && channelCounts[ch] < topChannel.count * 0.3)
            .slice(0, 3);

        return {
            isSignificant: percentage > 40,
            topChannel: topChannel.channel,
            count: topChannel.count,
            percentage,
            alternatives: alternatives.length > 0 ? alternatives : ['Consider new channels']
        };
    }, [doubleBookings]);

    // Analyze creative repetition
    const creativeRepetition = useMemo(() => {
        if (!doubleBookings || doubleBookings.length === 0) return null;

        const creativeCounts = {};
        doubleBookings.forEach(spot => {
            const creative = spot.creative || spot.Creative || 'Unknown';
            creativeCounts[creative] = (creativeCounts[creative] || 0) + 1;
        });

        const entries = Object.entries(creativeCounts);
        if (entries.length === 0) return null;

        const topCreative = entries.reduce((max, [cr, count]) =>
            count > max.count ? { creative: cr, count } : max
            , { creative: '', count: 0 });

        const percentage = (topCreative.count / doubleBookings.length) * 100;

        return {
            isSignificant: topCreative.count >= 3 && percentage > 25,
            topCreative: topCreative.creative,
            count: topCreative.count,
            percentage
        };
    }, [doubleBookings]);

    // Analyze daypart concentration
    const daypartConcentration = useMemo(() => {
        if (!doubleBookings || doubleBookings.length === 0) return null;

        const daypartCounts = {};
        doubleBookings.forEach(spot => {
            const daypart = spot.daypart_name || spot['Airing daypart'] || spot.daypart || 'Unknown';
            daypartCounts[daypart] = (daypartCounts[daypart] || 0) + 1;
        });

        const entries = Object.entries(daypartCounts);
        if (entries.length === 0) return null;

        const topDaypart = entries.reduce((max, [dp, count]) =>
            count > max.count ? { daypart: dp, count } : max
            , { daypart: '', count: 0 });

        const percentage = (topDaypart.count / doubleBookings.length) * 100;

        return {
            isSignificant: percentage > 50,
            topDaypart: topDaypart.daypart,
            count: topDaypart.count,
            percentage
        };
    }, [doubleBookings]);

    // Calculate potential savings
    const potentialSavings = useMemo(() => {
        if (!doubleBookings || doubleBookings.length === 0) return { amount: 0, eliminatable: 0 };

        const totalDoubleCost = doubleBookings.reduce((sum, spot) =>
            sum + (spot.cost_numeric || spot.cost || 0), 0
        );

        // Estimate 50-70% of double booking cost could be eliminated
        const eliminatableRate = 0.6;
        const eliminatableCost = totalDoubleCost * eliminatableRate;
        const eliminatableCount = Math.round(doubleBookings.length * eliminatableRate);

        return {
            amount: eliminatableCost,
            eliminatable: eliminatableCount,
            totalDoubleCost
        };
    }, [doubleBookings]);

    // Check if any significant patterns found
    const hasSignificantPatterns =
        timeConcentration?.isSignificant ||
        channelConcentration?.isSignificant ||
        creativeRepetition?.isSignificant ||
        daypartConcentration?.isSignificant;

    if (!spots || spots.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <AlertTriangle className="size-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No data available for analysis</p>
                </CardContent>
            </Card>
        );
    }

    if (!doubleBookings || doubleBookings.length === 0) {
        return (
            <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                        No Double Bookings Detected
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Great news! No double bookings were found in the analyzed data.
                        Your spot placement appears to be well-distributed.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-destructive/30">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Why Are Double Bookings Happening?
                </CardTitle>
                <CardDescription>
                    Analysis of {doubleBookings.length} double bookings to identify root causes
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isAnalyzing ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Analyzing patterns...</span>
                        </div>
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Contributing Factors */}
                        <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <TrendingDown className="h-4 w-4" />
                                Top Contributing Factors
                            </h4>

                            <div className="space-y-3">
                                {timeConcentration?.isSignificant && (
                                    <Alert variant="destructive">
                                        <Clock className="h-4 w-4" />
                                        <AlertTitle>Time Concentration</AlertTitle>
                                        <AlertDescription>
                                            <strong>{timeConcentration.percentage.toFixed(0)}%</strong> of double bookings
                                            occur between <strong>{timeConcentration.peakHour}:00-{timeConcentration.peakHour + 1}:00</strong>.
                                            <br />
                                            <span className="text-xs mt-1 block">
                                                <Lightbulb className="h-3 w-3 inline mr-1" />
                                                Recommendation: Spread spots across more hours to reduce overlap.
                                            </span>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {channelConcentration?.isSignificant && (
                                    <Alert variant="destructive">
                                        <Tv className="h-4 w-4" />
                                        <AlertTitle>Channel Over-Saturation</AlertTitle>
                                        <AlertDescription>
                                            <strong>{channelConcentration.topChannel}</strong> has {' '}
                                            <strong>{channelConcentration.percentage.toFixed(0)}%</strong> of all double bookings.
                                            <br />
                                            <span className="text-xs mt-1 block">
                                                <Lightbulb className="h-3 w-3 inline mr-1" />
                                                Recommendation: Diversify to other channels like {channelConcentration.alternatives.join(', ')}.
                                            </span>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {creativeRepetition?.isSignificant && (
                                    <Alert variant="destructive">
                                        <Copy className="h-4 w-4" />
                                        <AlertTitle>Creative Repetition</AlertTitle>
                                        <AlertDescription>
                                            The creative "<strong>{creativeRepetition.topCreative.length > 30
                                                ? creativeRepetition.topCreative.substring(0, 30) + '...'
                                                : creativeRepetition.topCreative}</strong>"
                                            appears <strong>{creativeRepetition.count} times</strong> in double bookings.
                                            <br />
                                            <span className="text-xs mt-1 block">
                                                <Lightbulb className="h-3 w-3 inline mr-1" />
                                                Recommendation: Increase minimum gap between same creative to 90+ minutes.
                                            </span>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {daypartConcentration?.isSignificant && (
                                    <Alert>
                                        <Clock className="h-4 w-4" />
                                        <AlertTitle>Daypart Concentration</AlertTitle>
                                        <AlertDescription>
                                            <strong>{daypartConcentration.percentage.toFixed(0)}%</strong> of double bookings
                                            occur during <strong>{daypartConcentration.topDaypart}</strong>.
                                            <br />
                                            <span className="text-xs mt-1 block">
                                                <Lightbulb className="h-3 w-3 inline mr-1" />
                                                Recommendation: Consider balancing spots across multiple dayparts.
                                            </span>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {!hasSignificantPatterns && (
                                    <Alert>
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>No Strong Patterns Detected</AlertTitle>
                                        <AlertDescription>
                                            Double bookings appear to be distributed across channels, times, and creatives.
                                            Consider reviewing individual cases for specific issues.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </div>

                        {/* Recommendations */}
                        <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                Recommended Actions
                            </h4>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Set minimum 90-minute gap between same creative spots</span>
                                </li>
                                {timeConcentration?.isSignificant && (
                                    <li className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                        <span>Reduce concentration in {timeConcentration.peakHour}:00 hour by 50%</span>
                                    </li>
                                )}
                                {channelConcentration?.isSignificant && (
                                    <li className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                        <span>Test 2-3 additional channels to diversify reach</span>
                                    </li>
                                )}
                                <li className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Implement pre-flight conflict checking before campaign launch</span>
                                </li>
                            </ul>
                        </div>

                        {/* Savings Estimate */}
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <AlertTitle>Potential Savings</AlertTitle>
                            <AlertDescription>
                                Implementing these recommendations could save approximately{' '}
                                <strong className="text-green-600 dark:text-green-400">
                                    €{potentialSavings.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </strong>{' '}
                                by eliminating ~{potentialSavings.eliminatable} of {doubleBookings.length} double bookings ({' '}
                                {((potentialSavings.eliminatable / doubleBookings.length) * 100).toFixed(0)}%).
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DoubleBookingsInsights;
