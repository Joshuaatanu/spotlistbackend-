import { useState, useEffect, useMemo } from 'react';
import { Building2, Search, Check, Plus, X, Users, Calendar } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import CompanySelector from '../selectors/CompanySelector';

const MAX_COMPETITORS = 5;

// Inner component for selecting a single competitor
function SingleCompetitorSelect({
    companies,
    value,
    onChange,
    onRemove,
    color,
    index
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCompanies = useMemo(() => {
        if (!searchQuery.trim()) return companies;
        const query = searchQuery.toLowerCase();
        return companies.filter(company => {
            const name = company.caption || company.name || company.label || '';
            const val = company.value || company.id || '';
            return name.toLowerCase().includes(query) || String(val).includes(query);
        });
    }, [companies, searchQuery]);

    const selectedCompany = useMemo(() => {
        if (!value) return null;
        return companies.find(c => String(c.value || c.id) === String(value));
    }, [companies, value]);

    const displayName = selectedCompany
        ? (selectedCompany.caption || selectedCompany.name || selectedCompany.label)
        : '';

    return (
        <div className="flex items-center gap-2 mb-2">
            <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: color }}
                title={`Competitor ${index + 1}`}
            />

            <div className="relative flex-1">
                <div className="relative">
                    <Input
                        type="text"
                        value={isOpen ? searchQuery : displayName}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (!isOpen) setIsOpen(true);
                        }}
                        onFocus={() => {
                            setSearchQuery('');
                            setIsOpen(true);
                        }}
                        placeholder={`Select Competitor ${index + 1}...`}
                        className="h-9"
                    />

                    {isOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-[300px] overflow-hidden flex flex-col">
                            <div className="overflow-y-auto">
                                {filteredCompanies.length > 0 ? (
                                    filteredCompanies.map((company, idx) => {
                                        const name = company.caption || company.name || company.label;
                                        const id = company.value || company.id;
                                        return (
                                            <button
                                                key={id || idx}
                                                type="button"
                                                onClick={() => {
                                                    onChange(id);
                                                    setIsOpen(false);
                                                }}
                                                className="w-full p-2 text-sm text-left hover:bg-muted flex items-center justify-between"
                                            >
                                                <span>{name}</span>
                                                {String(id) === String(value) && <Check className="size-4 text-primary" />}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="p-3 text-xs text-muted-foreground text-center">No matches</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Click outside backdrop */}
                    {isOpen && (
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    )}
                </div>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
            >
                <X className="size-4" />
            </Button>
        </div>
    );
}

export default function CompetitorSelector({
    myCompanyId,
    setMyCompanyId,
    competitorIds = [],
    setCompetitorIds,
    dateRange,
    setDateRange,
    onAnalyze,
    loading: analysisLoading
}) {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);

    // Ensure competitorIds is always an array
    const safeCompetitorIds = Array.isArray(competitorIds) ? competitorIds : [];

    // Competitor colors (matching requirements)
    const COLORS = ['#F97316', '#22C55E', '#A855F7', '#EC4899', '#06B6D4'];

    useEffect(() => {
        const fetchCompanies = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${API_BASE_URL}/metadata/companies`);
                if (response.data && Array.isArray(response.data)) {
                    setCompanies(response.data);
                }
            } catch (err) {
                console.error('Error fetching companies:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    // Wrapper for My Company to reuse existing CompanySelector logic/UI style if desired, 
    // or we can build a simpler one. 
    // Ideally we want the exact ID. The existing CompanySelector takes name and optional setID.
    // Let's use a simplified direct select for consistency or just render the reused component.
    // However, existing CompanySelector manages its own fetch. Let's reuse it for "My Company"
    // but we need to control the ID.
    // Since we already fetched companies here, we can just use a similar dropdown for My Company.

    // Actually, reusing CompanySelector is better for consistency across the app, 
    // but the existing one relies on name matching sometimes.
    // Let's implement a clean "My Company" select here using the fetched list.

    const handleAddCompetitor = () => {
        if (safeCompetitorIds.length < MAX_COMPETITORS) {
            setCompetitorIds([...safeCompetitorIds, null]);
        }
    };

    const handleUpdateCompetitor = (index, newId) => {
        const newIds = [...safeCompetitorIds];
        newIds[index] = newId;
        setCompetitorIds(newIds);
    };

    const handleRemoveCompetitor = (index) => {
        const newIds = safeCompetitorIds.filter((_, i) => i !== index);
        setCompetitorIds(newIds);
    };

    // My Company Input State (searchable)
    const [myCompanySearch, setMyCompanySearch] = useState('');
    const [myCompanyOpen, setMyCompanyOpen] = useState(false);

    const myCompanyObj = useMemo(() =>
        companies.find(c => String(c.value || c.id) === String(myCompanyId)),
        [companies, myCompanyId]
    );

    const filteredForMyCompany = useMemo(() => {
        if (!myCompanySearch) return companies;
        return companies.filter(c =>
            (c.caption || c.name || '').toLowerCase().includes(myCompanySearch.toLowerCase())
        );
    }, [companies, myCompanySearch]);

    return (
        <div className="space-y-6 p-4 border rounded-lg bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 pb-2 border-b">
                <Users className="size-5 text-primary" />
                <h3 className="font-semibold">Competitor Selection</h3>
            </div>

            {/* My Company Section */}
            <div className="space-y-2">
                <Label className="text-primary font-medium">My Company (Primary)</Label>
                <div className="relative">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#3B82F6] shrink-0" title="My Company" />
                        <div className="relative flex-1">
                            <Input
                                value={myCompanyOpen ? myCompanySearch : (myCompanyObj?.caption || myCompanyObj?.name || '')}
                                onChange={e => {
                                    setMyCompanySearch(e.target.value);
                                    if (!myCompanyOpen) setMyCompanyOpen(true);
                                }}
                                onFocus={() => {
                                    setMyCompanySearch('');
                                    setMyCompanyOpen(true);
                                }}
                                placeholder="Select your company..."
                                className="bg-background"
                            />
                            {/* Dropdown for My Company */}
                            {myCompanyOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
                                    {filteredForMyCompany.map((c, i) => (
                                        <button
                                            key={i}
                                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm truncate"
                                            onClick={() => {
                                                setMyCompanyId(c.value || c.id);
                                                setMyCompanyOpen(false);
                                            }}
                                        >
                                            {c.caption || c.name}
                                        </button>
                                    ))}
                                    {filteredForMyCompany.length === 0 && (
                                        <div className="p-2 text-xs text-muted-foreground">No matches</div>
                                    )}
                                    {/* Backdrop */}
                                    <div className="fixed inset-0 z-[-1]" onClick={() => setMyCompanyOpen(false)} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Date Range Section */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    Date Range
                </Label>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs text-muted-foreground">From</Label>
                        <Input
                            type="date"
                            value={dateRange?.start || ''}
                            onChange={(e) => setDateRange?.(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-background"
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">To</Label>
                        <Input
                            type="date"
                            value={dateRange?.end || ''}
                            onChange={(e) => setDateRange?.(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-background"
                        />
                    </div>
                </div>
            </div>

            {/* Competitors List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label>Competitors ({safeCompetitorIds.length}/{MAX_COMPETITORS})</Label>
                    {safeCompetitorIds.length < MAX_COMPETITORS && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddCompetitor}
                            className="h-7 text-xs"
                        >
                            <Plus className="size-3 mr-1" /> Add
                        </Button>
                    )}
                </div>

                <div className="space-y-2">
                    {safeCompetitorIds.map((id, idx) => (
                        <SingleCompetitorSelect
                            key={idx}
                            index={idx}
                            companies={companies}
                            value={id}
                            onChange={(newId) => handleUpdateCompetitor(idx, newId)}
                            onRemove={() => handleRemoveCompetitor(idx)}
                            color={COLORS[idx % COLORS.length]}
                        />
                    ))}

                    {safeCompetitorIds.length === 0 && (
                        <p className="text-xs text-muted-foreground italic pl-5">
                            No competitors added. Comparisons will be against market totals only.
                        </p>
                    )}
                </div>
            </div>

            <Button
                className="w-full mt-4"
                onClick={onAnalyze}
                disabled={!myCompanyId || analysisLoading}
            >
                {analysisLoading ? 'Analyzing...' : 'Run Analysis'}
            </Button>
        </div>
    );
}
