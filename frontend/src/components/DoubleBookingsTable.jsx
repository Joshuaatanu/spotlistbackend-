import { useState } from 'react';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { getDisplayName } from '../utils/metadataEnricher';

export default function DoubleBookingsTable({ data, fieldMap }) {
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [filterChannel, setFilterChannel] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());

    if (!data || data.length === 0) {
        return (
            <div style={{
                padding: 'var(--space-l)',
                textAlign: 'center',
                color: 'var(--text-tertiary)'
            }}>
                No double bookings found.
            </div>
        );
    }

    // Get unique channels for filter (use enriched names if available)
    const channels = [...new Set(data.map(item => {
        const channel = getDisplayName(item, 'channel') || 
                       item[fieldMap?.program_column] || 
                       item.program_original || 
                       item.program_norm || 
                       item.channel_display ||
                       'Unknown';
        return channel;
    }))].sort();

    // Filter data (use enriched names if available)
    let filteredData = data.filter(item => {
        const channel = getDisplayName(item, 'channel') || 
                       item[fieldMap?.program_column] || 
                       item.program_original || 
                       item.program_norm || 
                       item.channel_display ||
                       'Unknown';
        const date = item.timestamp ? item.timestamp.split('T')[0] : '';
        
        if (filterChannel && channel !== filterChannel) return false;
        if (filterDate && date !== filterDate) return false;
        return true;
    });

    // Sort data
    if (sortColumn) {
        filteredData = [...filteredData].sort((a, b) => {
            let aVal = a[sortColumn];
            let bVal = b[sortColumn];

            // Handle timestamp sorting
            if (sortColumn === 'timestamp') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            }

            // Handle numeric sorting
            if (sortColumn.includes('cost') || sortColumn.includes('Spend')) {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

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
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return timestamp.split('T')[0];
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCost = (item) => {
        return item.cost_numeric || item[fieldMap?.cost_column] || item.Spend || 0;
    };

    const getChannel = (item) => {
        return getDisplayName(item, 'channel') || 
               item[fieldMap?.program_column] || 
               item.program_original || 
               item.program_norm || 
               item.Channel || 
               item.channel_display ||
               'Unknown';
    };

    const getCreative = (item) => {
        return item[fieldMap?.creative_column] || item.Claim || item.creative_norm || 'N/A';
    };

    return (
        <div>
            {/* Filters */}
            <div style={{
                padding: 'var(--space-m)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: 'var(--space-m)',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}>
                    <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Filter:</span>
                </div>
                
                <select
                    value={filterChannel}
                    onChange={(e) => setFilterChannel(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        fontSize: 'var(--font-size-sm)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                    }}
                >
                    <option value="">All Channels</option>
                    {channels.map(ch => (
                        <option key={ch} value={ch}>{ch}</option>
                    ))}
                </select>

                <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    placeholder="Filter by date"
                    style={{
                        padding: '8px 12px',
                        fontSize: 'var(--font-size-sm)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)'
                    }}
                />

                {(filterChannel || filterDate) && (
                    <button
                        onClick={() => {
                            setFilterChannel('');
                            setFilterDate('');
                        }}
                        style={{
                            padding: '8px 12px',
                            fontSize: 'var(--font-size-sm)',
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)'
                        }}
                    >
                        <X size={14} />
                        Clear Filters
                    </button>
                )}

                <div style={{ marginLeft: 'auto', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    Showing {filteredData.length} of {data.length} double bookings
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}></th>
                            <th 
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => handleSort('program_original')}
                            >
                                Channel {sortColumn === 'program_original' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th 
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => handleSort('timestamp')}
                            >
                                Date {sortColumn === 'timestamp' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>Time</th>
                            <th 
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => handleSort('cost_numeric')}
                            >
                                Spend {sortColumn === 'cost_numeric' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>Creative</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((item, index) => {
                            const isExpanded = expandedRows.has(index);
                            
                            // Find potential matched spots (same channel, same day, within time window)
                            const matchedSpots = filteredData.filter(other => {
                                if (other === item) return false;
                                const itemChannel = getChannel(item);
                                const otherChannel = getChannel(other);
                                if (itemChannel !== otherChannel) return false;
                                
                                const itemDate = formatDate(item.timestamp);
                                const otherDate = formatDate(other.timestamp);
                                if (itemDate !== otherDate) return false;
                                
                                const itemTime = new Date(item.timestamp).getTime();
                                const otherTime = new Date(other.timestamp).getTime();
                                const diffMinutes = Math.abs(itemTime - otherTime) / (1000 * 60);
                                
                                // Within 2 hours window (reasonable for double bookings)
                                return diffMinutes <= 120;
                            });

                            return (
                                <>
                                    <tr key={index} style={{ cursor: 'pointer' }} onClick={() => toggleRow(index)}>
                                        <td>
                                            {isExpanded ? (
                                                <ChevronUp size={16} style={{ color: 'var(--text-secondary)' }} />
                                            ) : (
                                                <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{getChannel(item)}</td>
                                        <td>{formatDate(item.timestamp)}</td>
                                        <td>{formatTime(item.timestamp)}</td>
                                        <td>€{getCost(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {getCreative(item)}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr key={`${index}-details`}>
                                            <td colSpan={6} style={{ 
                                                padding: 'var(--space-m)', 
                                                backgroundColor: 'var(--bg-tertiary)',
                                                borderTop: '1px solid var(--border-subtle)'
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
                                                    <div>
                                                        <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>
                                                            Spot Details:
                                                        </strong>
                                                        <div style={{ 
                                                            marginTop: 'var(--space-xs)', 
                                                            fontSize: 'var(--font-size-sm)',
                                                            color: 'var(--text-secondary)',
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                            gap: 'var(--space-s)'
                                                        }}>
                                                            <div>
                                                                <span style={{ color: 'var(--text-tertiary)' }}>EPG Name: </span>
                                                                {item['EPG name'] || item[fieldMap?.sendung_long] || 'N/A'}
                                                            </div>
                                                            <div>
                                                                <span style={{ color: 'var(--text-tertiary)' }}>Full Timestamp: </span>
                                                                {formatTimestamp(item.timestamp)}
                                                            </div>
                                                            <div>
                                                                <span style={{ color: 'var(--text-tertiary)' }}>Creative: </span>
                                                                {getCreative(item)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {matchedSpots.length > 0 && (
                                                        <div>
                                                            <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>
                                                                Potential Matched Spots ({matchedSpots.length}):
                                                            </strong>
                                                            <div style={{ 
                                                                marginTop: 'var(--space-xs)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: 'var(--space-xs)'
                                                            }}>
                                                                {matchedSpots.slice(0, 5).map((match, matchIndex) => {
                                                                    const timeDiff = Math.abs(
                                                                        new Date(item.timestamp).getTime() - 
                                                                        new Date(match.timestamp).getTime()
                                                                    ) / (1000 * 60);
                                                                    return (
                                                                        <div key={matchIndex} style={{
                                                                            padding: 'var(--space-s)',
                                                                            backgroundColor: 'var(--bg-secondary)',
                                                                            borderRadius: '6px',
                                                                            fontSize: 'var(--font-size-sm)',
                                                                            display: 'grid',
                                                                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                                                            gap: 'var(--space-s)'
                                                                        }}>
                                                                            <div>
                                                                                <span style={{ color: 'var(--text-tertiary)' }}>Time: </span>
                                                                                {formatTime(match.timestamp)}
                                                                            </div>
                                                                            <div>
                                                                                <span style={{ color: 'var(--text-tertiary)' }}>Time Diff: </span>
                                                                                {Math.round(timeDiff)} min
                                                                            </div>
                                                                            <div>
                                                                                <span style={{ color: 'var(--text-tertiary)' }}>Spend: </span>
                                                                                €{getCost(match).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </div>
                                                                            <div>
                                                                                <span style={{ color: 'var(--text-tertiary)' }}>Creative: </span>
                                                                                {getCreative(match)}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {matchedSpots.length > 5 && (
                                                                    <div style={{ 
                                                                        fontSize: 'var(--font-size-xs)', 
                                                                        color: 'var(--text-tertiary)',
                                                                        fontStyle: 'italic'
                                                                    }}>
                                                                        ... and {matchedSpots.length - 5} more
                                                                    </div>
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
                <div style={{
                    padding: 'var(--space-l)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)'
                }}>
                    No double bookings match the selected filters.
                </div>
            )}
        </div>
    );
}

