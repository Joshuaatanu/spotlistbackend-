import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export default function AdvancedFilters({ data, fieldMap, onFilterChange, isExpanded: controlledExpanded, onExpandChange }) {
    const [internalExpanded, setInternalExpanded] = useState(false);
    const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
    const setIsExpanded = onExpandChange || setInternalExpanded;

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

    // Early return if no data
    if (!data || !Array.isArray(data) || data.length === 0) {
        return null;
    }

    // Extract unique values for dropdowns
    const channels = [...new Set(data.map(d => d[fieldMap?.program_column] || d.Channel || d.program_original).filter(Boolean))].sort();
    const dayparts = [...new Set(data.map(d => d[fieldMap?.daypart_column] || d['Airing daypart']).filter(Boolean))].sort();
    const categories = [...new Set(data.map(d => d[fieldMap?.epg_category_column] || d['EPG category']).filter(Boolean))].sort();
    const brands = [...new Set(data.map(d => d.Brand).filter(Boolean))].sort();
    const placements = ['Before', 'Within'];

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        if (onFilterChange) onFilterChange(newFilters);
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
            channels: [], dates: { start: '', end: '' }, dayparts: [],
            categories: [], brands: [], placement: '',
            minSpend: '', maxSpend: '', minDuration: '', maxDuration: ''
        };
        setFilters(emptyFilters);
        if (onFilterChange) onFilterChange(emptyFilters);
    };

    const hasActiveFilters = () => {
        return filters.channels.length > 0 || filters.dates.start || filters.dates.end ||
            filters.dayparts.length > 0 || filters.categories.length > 0 ||
            filters.brands.length > 0 || filters.placement ||
            filters.minSpend || filters.maxSpend || filters.minDuration || filters.maxDuration;
    };

    const FilterChip = ({ selected, onClick, children }) => (
        <button
            onClick={onClick}
            className={cn(
                "px-3 py-1.5 text-xs rounded-md border transition-all duration-200",
                selected
                    ? "bg-primary text-primary-foreground border-primary font-semibold"
                    : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"
            )}
        >
            {children}
        </button>
    );

    return (
        <Card>
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Filter className="size-[18px] text-primary" />
                                <CardTitle className="text-base">Advanced Filters</CardTitle>
                                {hasActiveFilters() && (
                                    <Badge className="text-xs">Active</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {hasActiveFilters() && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); clearFilters(); }}
                                    >
                                        Clear All
                                    </Button>
                                )}
                                {isExpanded ? <ChevronUp className="size-[18px]" /> : <ChevronDown className="size-[18px]" />}
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent className="animate-in slide-in-from-top-2 duration-200">
                    <CardContent className="pt-0 space-y-5">
                        {/* Channels */}
                        {channels.length > 0 && (
                            <div>
                                <Label className="mb-2 block">Channels</Label>
                                <div className="flex flex-wrap gap-2">
                                    {channels.map(ch => (
                                        <FilterChip
                                            key={ch}
                                            selected={filters.channels.includes(ch)}
                                            onClick={() => handleMultiSelect('channels', ch)}
                                        >
                                            {ch}
                                        </FilterChip>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-2 block">Start Date</Label>
                                <Input
                                    type="date"
                                    value={filters.dates.start}
                                    onChange={(e) => handleFilterChange('dates', { ...filters.dates, start: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">End Date</Label>
                                <Input
                                    type="date"
                                    value={filters.dates.end}
                                    onChange={(e) => handleFilterChange('dates', { ...filters.dates, end: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Dayparts */}
                        {dayparts.length > 0 && (
                            <div>
                                <Label className="mb-2 block">Dayparts</Label>
                                <div className="flex flex-wrap gap-2">
                                    {dayparts.map(dp => (
                                        <FilterChip
                                            key={dp}
                                            selected={filters.dayparts.includes(dp)}
                                            onClick={() => handleMultiSelect('dayparts', dp)}
                                        >
                                            {dp}
                                        </FilterChip>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Categories */}
                        {categories.length > 0 && (
                            <div>
                                <Label className="mb-2 block">EPG Categories</Label>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(cat => (
                                        <FilterChip
                                            key={cat}
                                            selected={filters.categories.includes(cat)}
                                            onClick={() => handleMultiSelect('categories', cat)}
                                        >
                                            {cat}
                                        </FilterChip>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Brands */}
                        {brands.length > 0 && (
                            <div>
                                <Label className="mb-2 block">Brands</Label>
                                <div className="flex flex-wrap gap-2">
                                    {brands.map(brand => (
                                        <FilterChip
                                            key={brand}
                                            selected={filters.brands.includes(brand)}
                                            onClick={() => handleMultiSelect('brands', brand)}
                                        >
                                            {brand}
                                        </FilterChip>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Placement */}
                        <div>
                            <Label className="mb-2 block">Placement</Label>
                            <select
                                value={filters.placement}
                                onChange={(e) => handleFilterChange('placement', e.target.value)}
                                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                            >
                                <option value="">All Placements</option>
                                {placements.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* Spend Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-2 block">Min Spend (€)</Label>
                                <Input
                                    type="number"
                                    value={filters.minSpend}
                                    onChange={(e) => handleFilterChange('minSpend', e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">Max Spend (€)</Label>
                                <Input
                                    type="number"
                                    value={filters.maxSpend}
                                    onChange={(e) => handleFilterChange('maxSpend', e.target.value)}
                                    placeholder="∞"
                                />
                            </div>
                        </div>

                        {/* Duration Range */}
                        {fieldMap?.duration_column && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-2 block">Min Duration (sec)</Label>
                                    <Input
                                        type="number"
                                        value={filters.minDuration}
                                        onChange={(e) => handleFilterChange('minDuration', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <Label className="mb-2 block">Max Duration (sec)</Label>
                                    <Input
                                        type="number"
                                        value={filters.maxDuration}
                                        onChange={(e) => handleFilterChange('maxDuration', e.target.value)}
                                        placeholder="∞"
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
