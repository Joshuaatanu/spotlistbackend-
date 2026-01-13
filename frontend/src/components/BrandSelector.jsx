import { useState, useEffect, useMemo } from 'react';
import { Tag, Search, X, Check } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function BrandSelector({
    companyId,
    brandIds,
    setBrandIds,
    disabled = false
}) {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!companyId) {
            setBrands([]);
            setBrandIds([]);
            return;
        }

        const fetchBrands = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/metadata/brands`,
                    { params: { company_ids: String(companyId), filter_text: searchQuery } }
                );
                if (response.data && Array.isArray(response.data)) {
                    setBrands(response.data);
                } else {
                    setBrands([]);
                }
            } catch (err) {
                console.error('Error fetching brands:', err);
                setError('Unable to load brands.');
                setBrands([]);
            } finally {
                setLoading(false);
            }
        };

        fetchBrands();
    }, [companyId, searchQuery]);

    const filteredBrands = useMemo(() => {
        if (!searchQuery.trim()) {
            return brands;
        }
        const query = searchQuery.toLowerCase();
        return brands.filter(brand => {
            const name = brand.caption || brand.name || brand.label || '';
            return name.toLowerCase().includes(query);
        });
    }, [brands, searchQuery]);

    const handleToggleBrand = (brand) => {
        const brandId = brand.value || brand.id;
        if (!brandId) return;

        setBrandIds(prev => {
            if (prev.includes(brandId)) {
                return prev.filter(id => id !== brandId);
            } else {
                return [...prev, brandId];
            }
        });
    };

    const handleRemoveBrand = (brandId) => {
        setBrandIds(prev => prev.filter(id => id !== brandId));
    };

    const selectedBrands = useMemo(() => {
        return brands.filter(b => brandIds.includes(b.value || b.id));
    }, [brands, brandIds]);

    return (
        <div className="relative">
            <Label className="flex items-center gap-2 mb-2">
                <Tag className="size-4" />
                Brands {companyId ? '' : '(Select company first)'}
            </Label>

            {!companyId && (
                <p className="text-xs text-muted-foreground italic mb-2 p-2">
                    Please select a company first to load brands
                </p>
            )}

            {companyId && (
                <>
                    {/* Selected Brands Display */}
                    {selectedBrands.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2 p-2 bg-muted rounded-md min-h-8">
                            {selectedBrands.map(brand => {
                                const brandId = brand.value || brand.id;
                                const name = brand.caption || brand.name || brand.label || 'Unknown';
                                return (
                                    <Badge key={brandId} className="gap-1">
                                        {name}
                                        <button
                                            onClick={() => handleRemoveBrand(brandId)}
                                            className="ml-1 hover:bg-primary-foreground/20 rounded-full"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </Badge>
                                );
                            })}
                        </div>
                    )}

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                            type="text"
                            placeholder={loading ? "Loading brands..." : "Search brands..."}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (e.target.value && !isOpen) {
                                    setIsOpen(true);
                                }
                            }}
                            onFocus={() => setIsOpen(true)}
                            disabled={disabled || loading}
                            className="pl-9"
                        />
                    </div>

                    {/* Dropdown */}
                    {isOpen && companyId && (
                        <>
                            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                                {loading ? (
                                    <div className="p-4 text-center text-muted-foreground">
                                        Loading brands...
                                    </div>
                                ) : filteredBrands.length === 0 ? (
                                    <div className="p-4 text-center text-muted-foreground">
                                        {searchQuery ? 'No brands found' : 'No brands available'}
                                    </div>
                                ) : (
                                    filteredBrands.map(brand => {
                                        const brandId = brand.value || brand.id;
                                        const name = brand.caption || brand.name || brand.label || 'Unknown';
                                        const isSelected = brandIds.includes(brandId);
                                        return (
                                            <div
                                                key={brandId}
                                                onClick={() => handleToggleBrand(brand)}
                                                className={cn(
                                                    "px-4 py-2.5 cursor-pointer flex items-center gap-3 transition-colors border-l-2",
                                                    isSelected
                                                        ? "bg-primary/10 border-l-primary"
                                                        : "border-l-transparent hover:bg-muted"
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleBrand(brand)}
                                                    className="cursor-pointer"
                                                />
                                                <span className={cn(
                                                    "flex-1",
                                                    isSelected && "text-primary font-semibold"
                                                )}>
                                                    {name}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsOpen(false)}
                            />
                        </>
                    )}

                    {error && (
                        <p className="mt-1 text-xs text-destructive">{error}</p>
                    )}

                    {selectedBrands.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            {selectedBrands.length} brand{selectedBrands.length !== 1 ? 's' : ''} selected
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

