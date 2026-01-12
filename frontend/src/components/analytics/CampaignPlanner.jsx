import { useState, useMemo } from 'react';
import {
    Plus, Trash2, Download, Lightbulb, AlertTriangle,
    CheckCircle2, Calendar, Clock, Tv, Film, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

/**
 * CampaignPlanner - Proactive planning tool to prevent double bookings
 * 
 * Features:
 * - Add planned spots with real-time conflict detection
 * - Visual warnings for problematic spots
 * - Export conflict-free plan to CSV
 * - Suggest alternative times for conflicting spots
 */
const CampaignPlanner = ({ existingSpots = [], channels = [], windowMinutes = 60 }) => {
    const [plannedSpots, setPlannedSpots] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newSpot, setNewSpot] = useState({
        channel: '',
        date: '',
        time: '',
        creative: '',
        duration: 30,
        cost: 0
    });

    // Get unique channels from existing spots or use provided list
    const availableChannels = useMemo(() => {
        if (channels.length > 0) return channels;
        const channelSet = new Set(
            existingSpots.map(s => s.channel_name || s.channel_id || s.Channel).filter(Boolean)
        );
        return [...channelSet].sort();
    }, [existingSpots, channels]);

    // Detect conflicts with existing spots AND other planned spots
    const detectConflicts = (spot, allSpots) => {
        const conflicts = [];

        // Combine existing and planned spots for conflict check
        const spotsToCheck = [...allSpots, ...existingSpots];

        spotsToCheck.forEach(existingSpot => {
            // Skip self comparison
            if (existingSpot.id === spot.id) return;

            // Must be same channel
            const existingChannel = existingSpot.channel || existingSpot.channel_name || existingSpot.channel_id || existingSpot.Channel;
            if (existingChannel !== spot.channel) return;

            // Must be same date
            const existingDate = existingSpot.date || (existingSpot.timestamp?.split(' ')[0]);
            if (existingDate !== spot.date) return;

            // Must be same creative
            const existingCreative = existingSpot.creative || existingSpot.Creative;
            if (existingCreative !== spot.creative && spot.creative) return;

            // Check time proximity
            const existingTime = existingSpot.time || (existingSpot.timestamp?.split(' ')[1]) || '00:00:00';
            const timeDiff = Math.abs(timeToMinutes(spot.time) - timeToMinutes(existingTime));

            if (timeDiff < windowMinutes) {
                conflicts.push({
                    ...existingSpot,
                    timeDiff
                });
            }
        });

        return conflicts;
    };

    // Convert time string to minutes
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    };

    // Calculate conflicts for all planned spots
    const spotsWithConflicts = useMemo(() => {
        return plannedSpots.map(spot => {
            const conflicts = detectConflicts(spot, plannedSpots.filter(s => s.id !== spot.id));
            return {
                ...spot,
                conflicts,
                hasConflict: conflicts.length > 0
            };
        });
    }, [plannedSpots, existingSpots, windowMinutes]);

    // Count total conflicts
    const conflictCount = spotsWithConflicts.filter(s => s.hasConflict).length;

    // Add a new spot
    const addSpot = () => {
        if (!newSpot.channel || !newSpot.date || !newSpot.time) return;

        const spotToAdd = {
            ...newSpot,
            id: `planned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            cost: parseFloat(newSpot.cost) || 0
        };

        setPlannedSpots([...plannedSpots, spotToAdd]);
        setNewSpot({
            channel: '',
            date: '',
            time: '',
            creative: '',
            duration: 30,
            cost: 0
        });
        setIsDialogOpen(false);
    };

    // Remove a spot
    const removeSpot = (id) => {
        setPlannedSpots(plannedSpots.filter(s => s.id !== id));
    };

    // Export plan to CSV
    const exportPlan = (includeConflicts = false) => {
        const spotsToExport = includeConflicts
            ? spotsWithConflicts
            : spotsWithConflicts.filter(s => !s.hasConflict);

        if (spotsToExport.length === 0) {
            alert('No spots to export');
            return;
        }

        const headers = ['Channel', 'Date', 'Time', 'Creative', 'Duration', 'Cost', 'Status'];
        const rows = spotsToExport.map(spot => [
            spot.channel,
            spot.date,
            spot.time,
            spot.creative,
            spot.duration,
            spot.cost,
            spot.hasConflict ? 'CONFLICT' : 'OK'
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `campaign_plan_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Suggest alternative times for a conflicting spot
    const suggestAlternatives = (spot) => {
        const alternatives = [];
        const baseMinutes = timeToMinutes(spot.time);

        // Suggest times before and after with 60+ minute gap
        const offsets = [-90, -60, 60, 90, 120];

        offsets.forEach(offset => {
            const newMinutes = baseMinutes + offset;
            if (newMinutes >= 0 && newMinutes < 24 * 60) {
                const newHour = Math.floor(newMinutes / 60).toString().padStart(2, '0');
                const newMin = (newMinutes % 60).toString().padStart(2, '0');
                const newTime = `${newHour}:${newMin}:00`;

                // Check if this new time would have conflicts
                const testSpot = { ...spot, time: newTime };
                const conflicts = detectConflicts(testSpot, plannedSpots.filter(s => s.id !== spot.id));

                if (conflicts.length === 0) {
                    alternatives.push(newTime);
                }
            }
        });

        return alternatives.slice(0, 3);
    };

    // Clear all planned spots
    const clearAll = () => {
        if (confirm('Are you sure you want to clear all planned spots?')) {
            setPlannedSpots([]);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Campaign Planner - Prevent Double Bookings
                </CardTitle>
                <CardDescription>
                    Plan your spots and get real-time conflict warnings before campaign launch
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Actions Bar */}
                <div className="flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex gap-2">
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Spot
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Planned Spot</DialogTitle>
                                    <DialogDescription>
                                        Enter spot details to check for conflicts
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="channel">Channel</Label>
                                        <Select
                                            value={newSpot.channel}
                                            onValueChange={(v) => setNewSpot({ ...newSpot, channel: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select channel" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableChannels.map(ch => (
                                                    <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="date">Date</Label>
                                            <Input
                                                id="date"
                                                type="date"
                                                value={newSpot.date}
                                                onChange={(e) => setNewSpot({ ...newSpot, date: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="time">Time</Label>
                                            <Input
                                                id="time"
                                                type="time"
                                                value={newSpot.time}
                                                onChange={(e) => setNewSpot({ ...newSpot, time: e.target.value + ':00' })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="creative">Creative Name</Label>
                                        <Input
                                            id="creative"
                                            placeholder="e.g., Brand_Summer_30s"
                                            value={newSpot.creative}
                                            onChange={(e) => setNewSpot({ ...newSpot, creative: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="duration">Duration (sec)</Label>
                                            <Input
                                                id="duration"
                                                type="number"
                                                value={newSpot.duration}
                                                onChange={(e) => setNewSpot({ ...newSpot, duration: parseInt(e.target.value) || 30 })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="cost">Cost (€)</Label>
                                            <Input
                                                id="cost"
                                                type="number"
                                                value={newSpot.cost}
                                                onChange={(e) => setNewSpot({ ...newSpot, cost: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={addSpot} disabled={!newSpot.channel || !newSpot.date || !newSpot.time}>
                                        Add Spot
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {plannedSpots.length > 0 && (
                            <Button variant="outline" onClick={clearAll}>
                                Clear All
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => exportPlan(false)}
                            disabled={spotsWithConflicts.filter(s => !s.hasConflict).length === 0}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export Clean Plan
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => exportPlan(true)}
                            disabled={plannedSpots.length === 0}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export All
                        </Button>
                    </div>
                </div>

                {/* Conflict Warning */}
                {conflictCount > 0 && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>{conflictCount} Potential Conflict{conflictCount > 1 ? 's' : ''} Detected</AlertTitle>
                        <AlertDescription>
                            Review the highlighted spots below. Consider alternative times to avoid double bookings.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Planned Spots Table */}
                {plannedSpots.length > 0 ? (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Channel</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Creative</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {spotsWithConflicts.map((spot) => {
                                    const alternatives = spot.hasConflict ? suggestAlternatives(spot) : [];

                                    return (
                                        <TableRow
                                            key={spot.id}
                                            className={spot.hasConflict ? 'bg-destructive/5' : ''}
                                        >
                                            <TableCell className="font-medium">{spot.channel}</TableCell>
                                            <TableCell>{spot.date}</TableCell>
                                            <TableCell>{spot.time?.substring(0, 5)}</TableCell>
                                            <TableCell className="max-w-[150px] truncate" title={spot.creative}>
                                                {spot.creative || '-'}
                                            </TableCell>
                                            <TableCell>{spot.duration}s</TableCell>
                                            <TableCell>€{spot.cost?.toLocaleString() || 0}</TableCell>
                                            <TableCell>
                                                {spot.hasConflict ? (
                                                    <div className="space-y-1">
                                                        <Badge variant="destructive">
                                                            {spot.conflicts.length} conflict{spot.conflicts.length > 1 ? 's' : ''}
                                                        </Badge>
                                                        {alternatives.length > 0 && (
                                                            <div className="text-xs text-muted-foreground">
                                                                <Lightbulb className="h-3 w-3 inline mr-1" />
                                                                Try: {alternatives.map(t => t.substring(0, 5)).join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Clear
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeSpot(spot.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-12 border rounded-lg bg-muted/20">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">No planned spots yet</p>
                        <Button onClick={() => setIsDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Your First Spot
                        </Button>
                    </div>
                )}

                {/* Summary */}
                {plannedSpots.length > 0 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
                        <div className="flex gap-6">
                            <span>Total spots: <strong>{plannedSpots.length}</strong></span>
                            <span className="text-green-600 dark:text-green-400">
                                Clear: <strong>{plannedSpots.length - conflictCount}</strong>
                            </span>
                            {conflictCount > 0 && (
                                <span className="text-destructive">
                                    Conflicts: <strong>{conflictCount}</strong>
                                </span>
                            )}
                        </div>
                        <span>
                            Total cost: <strong>€{spotsWithConflicts.reduce((sum, s) => sum + (s.cost || 0), 0).toLocaleString()}</strong>
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CampaignPlanner;
