import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Filter, X, Settings2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { getDisplayName } from '../utils/metadataEnricher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const DEFAULT_COLUMNS = {
    channel: true,
    date: true,
    time: true,
    spend: true,
    creative: true,
};

const PAGE_SIZES = [25, 50, 100, 250];

export default function DoubleBookingsTable({ data, fieldMap }) {
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [filterChannel, setFilterChannel] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const saved = localStorage.getItem('tableColumns');
        return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Debounced filter values for performance
    const [debouncedFilterChannel] = useDebounce(filterChannel, 300);
    const [debouncedFilterDate] = useDebounce(filterDate, 300);

    useEffect(() => {
        localStorage.setItem('tableColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedFilterChannel, debouncedFilterDate, sortColumn, sortDirection]);

    const toggleColumn = (column) => {
        setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
    };

    if (!data || data.length === 0) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                No double bookings found.
            </div>
        );
    }

    const channels = [...new Set(data.map(item => {
        return getDisplayName(item, 'channel') ||
            item[fieldMap?.program_column] ||
            item.program_original ||
            item.program_norm ||
            item.channel_display ||
            'Unknown';
    }))].sort();

    // Memoize filtered and sorted data for performance
    const filteredData = useMemo(() => {
        let result = data.filter(item => {
            const channel = getDisplayName(item, 'channel') ||
                item[fieldMap?.program_column] ||
                item.program_original ||
                item.program_norm ||
                item.channel_display ||
                'Unknown';
            const date = item.timestamp ? item.timestamp.split('T')[0] : '';

            if (debouncedFilterChannel && channel !== debouncedFilterChannel) return false;
            if (debouncedFilterDate && date !== debouncedFilterDate) return false;
            return true;
        });

        // Apply sorting
        if (sortColumn) {
            result = [...result].sort((a, b) => {
                let aVal = a[sortColumn];
                let bVal = b[sortColumn];

                if (sortColumn === 'timestamp') {
                    aVal = aVal ? new Date(aVal).getTime() : 0;
                    bVal = bVal ? new Date(bVal).getTime() : 0;
                }

                if (sortColumn.includes('cost') || sortColumn.includes('Spend')) {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                }

                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [data, debouncedFilterChannel, debouncedFilterDate, sortColumn, sortDirection, fieldMap]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const toggleRow = (index) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedRows(newExpanded);
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatDate = (timestamp) => timestamp ? timestamp.split('T')[0] : 'N/A';

    const formatTime = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getCost = (item) => item.cost_numeric || item[fieldMap?.cost_column] || item.Spend || 0;

    const getChannel = (item) => {
        return getDisplayName(item, 'channel') ||
            item[fieldMap?.program_column] ||
            item.program_original ||
            item.program_norm ||
            item.Channel ||
            item.channel_display ||
            'Unknown';
    };

    const getCreative = (item) => item[fieldMap?.creative_column] || item.Claim || item.creative_norm || 'N/A';

    return (
        <div>
            {/* Filters */}
            <div className="px-4 py-3 border-b flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Filter className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filter:</span>
                </div>

                <select
                    value={filterChannel}
                    onChange={(e) => setFilterChannel(e.target.value)}
                    className="px-3 py-2 text-sm bg-muted border rounded-md"
                >
                    <option value="">All Channels</option>
                    {channels.map(ch => (
                        <option key={ch} value={ch}>{ch}</option>
                    ))}
                </select>

                <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-auto"
                />

                {(filterChannel || filterDate) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setFilterChannel(''); setFilterDate(''); }}
                    >
                        <X className="size-4" />
                        Clear Filters
                    </Button>
                )}

                <div className="ml-auto flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Settings2 className="size-4" />
                                Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem checked={visibleColumns.channel} onCheckedChange={() => toggleColumn('channel')}>
                                Channel
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={visibleColumns.date} onCheckedChange={() => toggleColumn('date')}>
                                Date
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={visibleColumns.time} onCheckedChange={() => toggleColumn('time')}>
                                Time
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={visibleColumns.spend} onCheckedChange={() => toggleColumn('spend')}>
                                Spend
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={visibleColumns.creative} onCheckedChange={() => toggleColumn('creative')}>
                                Creative
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <span className="text-sm text-muted-foreground">
                        Showing {filteredData.length} of {data.length}
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b-2 border-border">
                            <th className="w-10 px-4 py-3"></th>
                            {visibleColumns.channel && (
                                <th
                                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer select-none hover:bg-muted"
                                    onClick={() => handleSort('program_original')}
                                >
                                    Channel {sortColumn === 'program_original' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {visibleColumns.date && (
                                <th
                                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer select-none hover:bg-muted"
                                    onClick={() => handleSort('timestamp')}
                                >
                                    Date {sortColumn === 'timestamp' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {visibleColumns.time && (
                                <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
                            )}
                            {visibleColumns.spend && (
                                <th
                                    className="px-4 py-3 text-right text-sm font-semibold cursor-pointer select-none hover:bg-muted"
                                    onClick={() => handleSort('cost_numeric')}
                                >
                                    Spend {sortColumn === 'cost_numeric' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {visibleColumns.creative && (
                                <th className="px-4 py-3 text-left text-sm font-semibold">Creative</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((item, localIndex) => {
                            const globalIndex = startIndex + localIndex;
                            const isExpanded = expandedRows.has(globalIndex);

                            const matchedSpots = filteredData.filter(other => {
                                if (other === item) return false;
                                if (getChannel(item) !== getChannel(other)) return false;
                                if (formatDate(item.timestamp) !== formatDate(other.timestamp)) return false;
                                const timeDiff = Math.abs(
                                    new Date(item.timestamp).getTime() - new Date(other.timestamp).getTime()
                                ) / (1000 * 60);
                                return timeDiff <= 120;
                            });

                            return (
                                <>
                                    <tr
                                        key={globalIndex}
                                        className={cn(
                                            "cursor-pointer border-b hover:bg-muted/50 transition-colors",
                                            localIndex % 2 === 1 && "bg-muted/30"
                                        )}
                                        onClick={() => toggleRow(globalIndex)}
                                    >
                                        <td className="px-4 py-3">
                                            {isExpanded ? (
                                                <ChevronUp className="size-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="size-4 text-muted-foreground" />
                                            )}
                                        </td>
                                        {visibleColumns.channel && (
                                            <td className="px-4 py-3 font-semibold">{getChannel(item)}</td>
                                        )}
                                        {visibleColumns.date && (
                                            <td className="px-4 py-3">{formatDate(item.timestamp)}</td>
                                        )}
                                        {visibleColumns.time && (
                                            <td className="px-4 py-3">{formatTime(item.timestamp)}</td>
                                        )}
                                        {visibleColumns.spend && (
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                €{getCost(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        )}
                                        {visibleColumns.creative && (
                                            <td className="px-4 py-3 max-w-[200px] truncate">{getCreative(item)}</td>
                                        )}
                                    </tr>
                                    {isExpanded && (
                                        <tr key={`${globalIndex}-details`}>
                                            <td colSpan={1 + Object.values(visibleColumns).filter(Boolean).length} className="p-4 bg-muted/50 border-t">
                                                <div className="flex flex-col gap-4">
                                                    <div>
                                                        <strong className="text-sm">Spot Details:</strong>
                                                        <div className="mt-2 text-sm grid grid-cols-1 md:grid-cols-3 gap-2">
                                                            <div>
                                                                <span className="text-muted-foreground">EPG Name: </span>
                                                                {item['EPG name'] || item[fieldMap?.sendung_long] || 'N/A'}
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Full Timestamp: </span>
                                                                {formatTimestamp(item.timestamp)}
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Creative: </span>
                                                                {getCreative(item)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {matchedSpots.length > 0 && (
                                                        <div>
                                                            <strong className="text-sm">
                                                                Potential Matched Spots ({matchedSpots.length}):
                                                            </strong>
                                                            <div className="mt-2 flex flex-col gap-2">
                                                                {matchedSpots.slice(0, 5).map((match, matchIndex) => {
                                                                    const timeDiff = Math.abs(
                                                                        new Date(item.timestamp).getTime() -
                                                                        new Date(match.timestamp).getTime()
                                                                    ) / (1000 * 60);
                                                                    return (
                                                                        <div key={matchIndex} className="p-3 bg-background rounded-md border text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                            <div>
                                                                                <span className="text-muted-foreground">Time: </span>
                                                                                {formatTime(match.timestamp)}
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-muted-foreground">Time Diff: </span>
                                                                                {Math.round(timeDiff)} min
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-muted-foreground">Spend: </span>
                                                                                €{getCost(match).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-muted-foreground">Creative: </span>
                                                                                {getCreative(match)}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {matchedSpots.length > 5 && (
                                                                    <p className="text-xs text-muted-foreground italic">
                                                                        ... and {matchedSpots.length - 5} more
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filteredData.length === 0 && (
                <div className="p-6 text-center text-muted-foreground">
                    No double bookings match the selected filters.
                </div>
            )}

            {/* Pagination Controls */}
            {filteredData.length > 0 && (
                <div className="px-4 py-3 border-t flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                            <SelectTrigger className="w-[80px] h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZES.map(size => (
                                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <span className="text-sm px-2">
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage >= totalPages}
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
