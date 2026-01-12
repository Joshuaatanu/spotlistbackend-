import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Grid3X3 } from 'lucide-react';

/**
 * DoubleBookingsHeatmap - Visual heatmap showing double booking rates by channel × daypart
 * 
 * Features:
 * - Color intensity based on double booking rate (green = low, red = high)
 * - Hover tooltips with detailed stats
 * - Click to filter dashboard
 * - Responsive grid layout
 */
const DoubleBookingsHeatmap = ({ spots = [], onCellClick }) => {
    const [hoveredCell, setHoveredCell] = useState(null);

    // Define daypart order for consistent display
    const daypartOrder = [
        'Early Morning',
        'Morning',
        'Daytime',
        'Early Fringe',
        'Prime Access',
        'Prime Time',
        'Late Fringe',
        'Overnight'
    ];

    // Calculate double booking rate by channel × daypart
    const heatmapData = useMemo(() => {
        const matrix = {};
        const channelSet = new Set();
        const daypartSet = new Set();

        spots.forEach(spot => {
            const channel = spot.channel_name || spot.channel_id || spot.Channel || 'Unknown';
            const daypart = spot.daypart_name || spot['Airing daypart'] || spot.daypart || 'Unknown';

            channelSet.add(channel);
            daypartSet.add(daypart);

            if (!matrix[channel]) matrix[channel] = {};
            if (!matrix[channel][daypart]) {
                matrix[channel][daypart] = { total: 0, doubles: 0, cost: 0 };
            }

            matrix[channel][daypart].total++;
            if (spot.is_double) {
                matrix[channel][daypart].doubles++;
            }
            matrix[channel][daypart].cost += (spot.cost_numeric || spot.cost || 0);
        });

        // Sort channels by total spots (descending)
        const channels = [...channelSet].sort((a, b) => {
            const totalA = Object.values(matrix[a] || {}).reduce((sum, v) => sum + v.total, 0);
            const totalB = Object.values(matrix[b] || {}).reduce((sum, v) => sum + v.total, 0);
            return totalB - totalA;
        });

        // Sort dayparts by predefined order, or alphabetically for unknowns
        const dayparts = [...daypartSet].sort((a, b) => {
            const indexA = daypartOrder.indexOf(a);
            const indexB = daypartOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        return { matrix, channels, dayparts };
    }, [spots]);

    // Get color for a cell based on double rate
    const getCellColor = (rate) => {
        if (rate === 0) return 'bg-green-100 dark:bg-green-950';
        if (rate < 5) return 'bg-green-200 dark:bg-green-900';
        if (rate < 10) return 'bg-yellow-100 dark:bg-yellow-950';
        if (rate < 15) return 'bg-orange-200 dark:bg-orange-900';
        if (rate < 20) return 'bg-orange-300 dark:bg-orange-800';
        return 'bg-red-400 dark:bg-red-800';
    };

    // Get text color based on background
    const getTextColor = (rate) => {
        if (rate >= 15) return 'text-white dark:text-white';
        return 'text-foreground';
    };

    // Calculate max rate for legend
    const maxRate = useMemo(() => {
        let max = 0;
        heatmapData.channels.forEach(channel => {
            heatmapData.dayparts.forEach(daypart => {
                const cell = heatmapData.matrix[channel]?.[daypart];
                if (cell && cell.total > 0) {
                    const rate = (cell.doubles / cell.total) * 100;
                    if (rate > max) max = rate;
                }
            });
        });
        return Math.ceil(max);
    }, [heatmapData]);

    if (spots.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Grid3X3 className="size-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No data available for heatmap</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
                    Double Booking Rate by Channel & Daypart
                </CardTitle>
                <CardDescription>
                    Color intensity shows double booking rate. Click a cell to filter.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    {/* Header Row - Dayparts */}
                    <div className="flex min-w-max">
                        <div className="w-32 shrink-0 p-2 font-semibold text-xs sticky left-0 bg-background z-10">
                            Channel
                        </div>
                        {heatmapData.dayparts.map(daypart => (
                            <div
                                key={daypart}
                                className="w-24 shrink-0 p-2 text-center font-semibold text-xs border-l border-border"
                            >
                                <span className="block truncate" title={daypart}>
                                    {daypart}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Data Rows - Channels */}
                    {heatmapData.channels.slice(0, 15).map(channel => (
                        <div key={channel} className="flex min-w-max border-t border-border">
                            <div className="w-32 shrink-0 p-2 text-xs font-medium sticky left-0 bg-background z-10 flex items-center">
                                <span className="truncate" title={channel}>{channel}</span>
                            </div>
                            {heatmapData.dayparts.map(daypart => {
                                const cell = heatmapData.matrix[channel]?.[daypart];
                                const total = cell?.total || 0;
                                const doubles = cell?.doubles || 0;
                                const rate = total > 0 ? (doubles / total) * 100 : 0;
                                const cost = cell?.cost || 0;

                                return (
                                    <TooltipProvider key={daypart}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={`w-24 shrink-0 p-2 text-center border-l border-border cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:z-10 ${total > 0 ? getCellColor(rate) : 'bg-muted/30'
                                                        } ${getTextColor(rate)}`}
                                                    onClick={() => onCellClick?.({ channel, daypart, cell })}
                                                    onMouseEnter={() => setHoveredCell({ channel, daypart })}
                                                    onMouseLeave={() => setHoveredCell(null)}
                                                >
                                                    {total > 0 ? (
                                                        <span className="text-xs font-medium">
                                                            {rate.toFixed(1)}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs">
                                                <div className="text-xs space-y-1">
                                                    <p className="font-semibold">{channel} - {daypart}</p>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                                                        <span className="text-muted-foreground">Total Spots:</span>
                                                        <span className="font-medium">{total}</span>
                                                        <span className="text-muted-foreground">Double Bookings:</span>
                                                        <span className="font-medium text-destructive">{doubles}</span>
                                                        <span className="text-muted-foreground">Double Rate:</span>
                                                        <span className="font-medium">{rate.toFixed(1)}%</span>
                                                        <span className="text-muted-foreground">Total Cost:</span>
                                                        <span className="font-medium">€{cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })}
                        </div>
                    ))}

                    {heatmapData.channels.length > 15 && (
                        <div className="text-xs text-muted-foreground text-center py-2 border-t">
                            Showing top 15 channels of {heatmapData.channels.length} total
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Double Rate:</span>
                        <div className="flex items-center gap-1">
                            <div className="w-6 h-4 bg-green-200 dark:bg-green-900 rounded" />
                            <span>0%</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-6 h-4 bg-yellow-100 dark:bg-yellow-950 rounded" />
                            <span>5%</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-6 h-4 bg-orange-200 dark:bg-orange-900 rounded" />
                            <span>10%</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-6 h-4 bg-red-400 dark:bg-red-800 rounded" />
                            <span>20%+</span>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                        Max rate: {maxRate.toFixed(1)}%
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
};

export default DoubleBookingsHeatmap;
