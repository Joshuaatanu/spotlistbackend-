import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function AdvancedFilters({ data, fieldMap, onFilterChange }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [filters, setFilters] = useState({
        channels: [],
        dates: { start: '', end: '' },
        dayparts: [],
        categories: [],
        brands: [],
        placement: '',
        minSpend: '',
        maxSpend: '',
        minDuration: '',
        maxDuration: ''
    });

    // Extract unique values for dropdowns
    const channels = [...new Set(data.map(d => d[fieldMap?.program_column] || d.Channel || d.program_original).filter(Boolean))].sort();
    const dayparts = [...new Set(data.map(d => d[fieldMap?.daypart_column] || d['Airing daypart']).filter(Boolean))].sort();
    const categories = [...new Set(data.map(d => d[fieldMap?.epg_category_column] || d['EPG category']).filter(Boolean))].sort();
    const brands = [...new Set(data.map(d => d.Brand).filter(Boolean))].sort();
    const placements = ['Before', 'Within'];

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        if (onFilterChange) {
            onFilterChange(newFilters);
        }
    };

    const handleMultiSelect = (key, value) => {
        const current = filters[key] || [];
        const newValue = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
        handleFilterChange(key, newValue);
    };

    const clearFilters = () => {
        const emptyFilters = {
            channels: [],
            dates: { start: '', end: '' },
            dayparts: [],
            categories: [],
            brands: [],
            placement: '',
            minSpend: '',
            maxSpend: '',
            minDuration: '',
            maxDuration: ''
        };
        setFilters(emptyFilters);
        if (onFilterChange) {
            onFilterChange(emptyFilters);
        }
    };

    const hasActiveFilters = () => {
        return filters.channels.length > 0 ||
            filters.dates.start || filters.dates.end ||
            filters.dayparts.length > 0 ||
            filters.categories.length > 0 ||
            filters.brands.length > 0 ||
            filters.placement ||
            filters.minSpend || filters.maxSpend ||
            filters.minDuration || filters.maxDuration;
    };

    return (
        <div className="card">
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    paddingBottom: isExpanded ? '16px' : '0',
                    borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
                    marginBottom: isExpanded ? '16px' : '0'
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Filter size={18} style={{ color: 'var(--accent-primary-dark)' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                        Advanced Filters
                    </h3>
                    {hasActiveFilters() && (
                        <span style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            backgroundColor: 'var(--accent-primary)',
                            borderRadius: '12px',
                            color: '#1A1A1A',
                            fontWeight: 600
                        }}>
                            Active
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {hasActiveFilters() && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                clearFilters();
                            }}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer'
                            }}
                        >
                            Clear All
                        </button>
                    )}
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Channels */}
                    {channels.length > 0 && (
                        <div>
                            <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                                Channels
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {channels.map(ch => (
                                    <button
                                        key={ch}
                                        onClick={() => handleMultiSelect('channels', ch)}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            borderRadius: '6px',
                                            border: '1px solid',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            ...(filters.channels.includes(ch)
                                                ? {
                                                    backgroundColor: 'var(--accent-primary)',
                                                    borderColor: 'var(--accent-primary)',
                                                    color: '#1A1A1A',
                                                    fontWeight: 600
                                                }
                                                : {
                                                    backgroundColor: '#F3F4F6',
                                                    borderColor: 'transparent',
                                                    color: 'var(--text-secondary)'
                                                })
                                        }}
                                    >
                                        {ch}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Date Range */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={filters.dates.start}
                                onChange={(e) => handleFilterChange('dates', { ...filters.dates, start: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                                End Date
                            </label>
                            <input
                                type="date"
                                value={filters.dates.end}
                                onChange={(e) => handleFilterChange('dates', { ...filters.dates, end: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Dayparts */}
                    {dayparts.length > 0 && (
                        <div>
                            <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                                Dayparts
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {dayparts.map(dp => (
                                    <button
                                        key={dp}
                                        onClick={() => handleMultiSelect('dayparts', dp)}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            borderRadius: '6px',
                                            border: '1px solid',
                                            cursor: 'pointer',
                                            ...(filters.dayparts.includes(dp)
                                                ? {
                                                    backgroundColor: 'var(--accent-primary)',
                                                    borderColor: 'var(--accent-primary)',
                                                    color: '#1A1A1A',
                                                    fontWeight: 600
                                                }
                                                : {
                                                    backgroundColor: '#F3F4F6',
                                                    borderColor: 'transparent',
                                                    color: 'var(--text-secondary)'
                                                })
                                        }}
                                    >
                                        {dp}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Categories */}
                    {categories.length > 0 && (
                        <div>
                            <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                                EPG Categories
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => handleMultiSelect('categories', cat)}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            borderRadius: '6px',
                                            border: '1px solid',
                                            cursor: 'pointer',
                                            ...(filters.categories.includes(cat)
                                                ? {
                                                    backgroundColor: 'var(--accent-primary)',
                                                    borderColor: 'var(--accent-primary)',
                                                    color: '#1A1A1A',
                                                    fontWeight: 600
                                                }
                                                : {
                                                    backgroundColor: '#F3F4F6',
                                                    borderColor: 'transparent',
                                                    color: 'var(--text-secondary)'
                                                })
                                        }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Brands */}
                    {brands.length > 0 && (
                        <div>
                            <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                                Brands
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {brands.map(brand => (
                                    <button
                                        key={brand}
                                        onClick={() => handleMultiSelect('brands', brand)}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            borderRadius: '6px',
                                            border: '1px solid',
                                            cursor: 'pointer',
                                            ...(filters.brands.includes(brand)
                                                ? {
                                                    backgroundColor: 'var(--accent-primary)',
                                                    borderColor: 'var(--accent-primary)',
                                                    color: '#1A1A1A',
                                                    fontWeight: 600
                                                }
                                                : {
                                                    backgroundColor: '#F3F4F6',
                                                    borderColor: 'transparent',
                                                    color: 'var(--text-secondary)'
                                                })
                                        }}
                                    >
                                        {brand}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Placement */}
                    <div>
                        <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                            Placement
                        </label>
                        <select
                            value={filters.placement}
                            onChange={(e) => handleFilterChange('placement', e.target.value)}
                        >
                            <option value="">All Placements</option>
                            {placements.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    {/* Spend Range */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                                Min Spend (€)
                            </label>
                            <input
                                type="number"
                                value={filters.minSpend}
                                onChange={(e) => handleFilterChange('minSpend', e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                                Max Spend (€)
                            </label>
                            <input
                                type="number"
                                value={filters.maxSpend}
                                onChange={(e) => handleFilterChange('maxSpend', e.target.value)}
                                placeholder="∞"
                            />
                        </div>
                    </div>

                    {/* Duration Range */}
                    {fieldMap?.duration_column && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                                    Min Duration (sec)
                                </label>
                                <input
                                    type="number"
                                    value={filters.minDuration}
                                    onChange={(e) => handleFilterChange('minDuration', e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                                    Max Duration (sec)
                                </label>
                                <input
                                    type="number"
                                    value={filters.maxDuration}
                                    onChange={(e) => handleFilterChange('maxDuration', e.target.value)}
                                    placeholder="∞"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
