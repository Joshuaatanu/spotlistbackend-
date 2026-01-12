import { useState, useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * DoubleBookingsTimeline - Visual 24-hour timeline showing spot overlaps
 * 
 * Features:
 * - 24-hour timeline with hour markers
 * - Visual representation of spots as vertical bars
 * - Overlap group highlighting
 * - Channel and date filtering
 * - Hover tooltips with spot details
 */
const DoubleBookingsTimeline = ({ spots = [], onSpotClick, windowMinutes = 60 }) => {
    const [selectedChannel, setSelectedChannel] = useState('all');
    const [selectedDate, setSelectedDate] = useState(null);

    // Group spots by date and channel
    const timelineData = useMemo(() => {
        const grouped = {};

        spots.forEach(spot => {
            // Extract date from timestamp or use date field
            const dateStr = spot.date || (spot.timestamp ? spot.timestamp.split(' ')[0] : null);
            if (!dateStr) return;

            if (!grouped[dateStr]) grouped[dateStr] = {};

            const channel = spot.channel_name || spot.channel_id || spot.Channel || 'Unknown';
            if (!grouped[dateStr][channel]) grouped[dateStr][channel] = [];

            grouped[dateStr][channel].push(spot);
        });

        return grouped;
    }, [spots]);

    // Get all unique dates
    const dates = useMemo(() =>
        Object.keys(timelineData).sort((a, b) => new Date(b) - new Date(a)),
        [timelineData]
    );

    // Get channels for selected date
    const channels = useMemo(() =>
        selectedDate ? Object.keys(timelineData[selectedDate] || {}).sort() : [],
        [selectedDate, timelineData]
    );

    // Auto-select first date if none selected
    useMemo(() => {
        if (!selectedDate && dates.length > 0) {
            setSelectedDate(dates[0]);
        }
    }, [dates, selectedDate]);

    // Detect overlaps for visualization
    const getOverlapGroups = (channelSpots) => {
        if (!channelSpots || channelSpots.length < 2) return [];

        // Sort by time
        const sorted = [...channelSpots].sort((a, b) => {
            const timeA = a.time || (a.timestamp ? a.timestamp.split(' ')[1] : '00:00:00');
            const timeB = b.time || (b.timestamp ? b.timestamp.split(' ')[1] : '00:00:00');
            return timeA.localeCompare(timeB);
        });

        const groups = [];
        let currentGroup = [];

        sorted.forEach((spot, idx) => {
            if (idx === 0) {
                currentGroup = [spot];
                return;
            }

            const prevSpot = sorted[idx - 1];
            const prevTime = parseTimeToMinutes(prevSpot.time || (prevSpot.timestamp?.split(' ')[1]));
            const spotTime = parseTimeToMinutes(spot.time || (spot.timestamp?.split(' ')[1]));
            const diffMinutes = spotTime - prevTime;

            // Check if within window AND same creative (for double booking)
            const sameCreative = (spot.creative || spot.Creative) === (prevSpot.creative || prevSpot.Creative);

            if (diffMinutes < windowMinutes && diffMinutes >= 0 && sameCreative) {
                // Part of overlap group
                currentGroup.push(spot);
            } else {
                // Start new group
                if (currentGroup.length > 1) {
                    groups.push(currentGroup);
                }
                currentGroup = [spot];
            }
        });

        if (currentGroup.length > 1) {
            groups.push(currentGroup);
        }

        return groups;
    };

    // Parse time string to minutes since midnight
    const parseTimeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        return hours * 60 + minutes;
    };

    // Get position percentage for a time
    const getTimePosition = (timeStr) => {
        const minutes = parseTimeToMinutes(timeStr);
        return (minutes / (24 * 60)) * 100;
    };

    // Format currency
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return `€${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Double Bookings Timeline
                    </CardTitle>
                    <div className="flex gap-2">
                        <Select value={selectedDate || ''} onValueChange={setSelectedDate}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Select Date" />
                            </SelectTrigger>
                            <SelectContent>
                                {dates.map(date => (
                                    <SelectItem key={date} value={date}>{date}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Channels</SelectItem>
                                {channels.map(ch => (
                                    <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {selectedDate ? (
                    <div className="space-y-6">
                        {/* Timeline for each channel */}
                        {(selectedChannel === 'all' ? channels : [selectedChannel]).map(channel => {
                            const channelSpots = timelineData[selectedDate]?.[channel] || [];
                            const overlapGroups = getOverlapGroups(channelSpots);
                            const flatOverlapSpotIds = new Set(
                                overlapGroups.flatMap(group => group.map(s => s.id || s.spot_id))
                            );

                            return (
                                <div key={channel} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-sm">{channel}</h4>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {channelSpots.length} spots
                                            </Badge>
                                            {overlapGroups.length > 0 && (
                                                <Badge variant="destructive" className="text-xs">
                                                    {overlapGroups.length} overlap groups
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* 24-hour timeline */}
                                    <div className="relative h-20 bg-muted/50 rounded-lg border">
                                        {/* Hour markers */}
                                        <div className="absolute inset-0 flex">
                                            {[...Array(24)].map((_, hour) => (
                                                <div
                                                    key={hour}
                                                    className="flex-1 border-l border-muted-foreground/10 relative"
                                                >
                                                    <span className="absolute top-1 left-1 text-[10px] text-muted-foreground">
                                                        {hour.toString().padStart(2, '0')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Overlap group highlights */}
                                        {overlapGroups.map((group, idx) => {
                                            const firstSpot = group[0];
                                            const lastSpot = group[group.length - 1];
                                            const startPos = getTimePosition(firstSpot.time || firstSpot.timestamp?.split(' ')[1]);
                                            const endPos = getTimePosition(lastSpot.time || lastSpot.timestamp?.split(' ')[1]);
                                            const width = Math.max(endPos - startPos, 2);

                                            return (
                                                <div
                                                    key={idx}
                                                    className="absolute top-8 h-10 bg-destructive/15 border-2 border-destructive/40 rounded"
                                                    style={{
                                                        left: `${startPos}%`,
                                                        width: `${width}%`,
                                                        minWidth: '20px'
                                                    }}
                                                />
                                            );
                                        })}

                                        {/* Spots */}
                                        {channelSpots.map((spot, idx) => {
                                            const timeStr = spot.time || (spot.timestamp?.split(' ')[1]) || '00:00:00';
                                            const position = getTimePosition(timeStr);
                                            const isDouble = spot.is_double;
                                            const inOverlapGroup = flatOverlapSpotIds.has(spot.id || spot.spot_id);
                                            const cost = spot.cost_numeric || spot.cost || spot.Spend;

                                            return (
                                                <TooltipProvider key={idx}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className={`absolute top-10 w-1.5 h-8 cursor-pointer transition-all hover:h-10 hover:w-2 hover:z-10 rounded-sm ${isDouble
                                                                        ? 'bg-destructive'
                                                                        : inOverlapGroup
                                                                            ? 'bg-amber-500'
                                                                            : 'bg-primary'
                                                                    } ${inOverlapGroup ? 'ring-2 ring-destructive ring-offset-1 ring-offset-background' : ''}`}
                                                                style={{ left: `${position}%` }}
                                                                onClick={() => onSpotClick?.(spot)}
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-xs">
                                                            <div className="text-xs space-y-1">
                                                                <p className="font-semibold truncate">
                                                                    {spot.creative || spot.Creative || 'Unknown Creative'}
                                                                </p>
                                                                <p className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {timeStr}
                                                                </p>
                                                                <p>Cost: {formatCurrency(cost)}</p>
                                                                {isDouble && (
                                                                    <Badge variant="destructive" className="text-xs mt-1">
                                                                        Double Booking
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Legend */}
                        <div className="flex items-center gap-6 text-xs text-muted-foreground pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-primary rounded-sm" />
                                <span>Normal Spot</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-amber-500 rounded-sm" />
                                <span>In Overlap Group</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-destructive rounded-sm" />
                                <span>Double Booking</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-3 bg-destructive/15 border border-destructive/40 rounded" />
                                <span>Overlap Region</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Select a date to view timeline</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DoubleBookingsTimeline;
