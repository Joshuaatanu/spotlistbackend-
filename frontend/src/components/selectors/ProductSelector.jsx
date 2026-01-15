import { useState, useEffect, useMemo } from 'react';
import { Package, Search, X } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ProductSelector({
    brandIds,
    companyId,
    productIds,
    setProductIds,
    disabled = false
}) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const shouldFetch = (brandIds && brandIds.length > 0) || companyId;

        if (!shouldFetch) {
            setProducts([]);
            setProductIds([]);
            return;
        }

        const fetchProducts = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = { filter_text: searchQuery };

                if (brandIds && brandIds.length > 0) {
                    params.brand_ids = brandIds.join(',');
                } else if (companyId) {
                    params.company_id = companyId;
                }

                const response = await axios.get(
                    `${API_BASE_URL}/metadata/products`,
                    { params }
                );
                if (response.data && Array.isArray(response.data)) {
                    setProducts(response.data);
                } else {
                    setProducts([]);
                }
            } catch (err) {
                console.error('Error fetching products:', err);
                setError('Unable to load products.');
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [brandIds, companyId, searchQuery]);

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) {
            return products;
        }
        const query = searchQuery.toLowerCase();
        return products.filter(product => {
            const name = product.caption || product.name || product.label || '';
            return name.toLowerCase().includes(query);
        });
    }, [products, searchQuery]);

    const handleToggleProduct = (product) => {
        const productId = product.value || product.id;
        if (!productId) return;

        setProductIds(prev => {
            if (prev.includes(productId)) {
                return prev.filter(id => id !== productId);
            } else {
                return [...prev, productId];
            }
        });
    };

    const handleRemoveProduct = (productId) => {
        setProductIds(prev => prev.filter(id => id !== productId));
    };

    const selectedProducts = useMemo(() => {
        return products.filter(p => productIds.includes(p.value || p.id));
    }, [products, productIds]);

    const canFetch = (brandIds && brandIds.length > 0) || companyId;

    return (
        <div className="relative">
            <Label className="flex items-center gap-2 mb-2">
                <Package className="size-4" />
                Products {brandIds && brandIds.length > 0 ? '(filtered by selected brands)' : companyId ? '(all products for company)' : '(Select company or brands first)'}
            </Label>

            {!canFetch && (
                <p className="text-xs text-muted-foreground italic mb-2 p-2">
                    Please select a company or at least one brand first to load products
                </p>
            )}

            {canFetch && (
                <>
                    {/* Selected Products Display */}
                    {selectedProducts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2 p-2 bg-muted rounded-md min-h-8">
                            {selectedProducts.map(product => {
                                const productId = product.value || product.id;
                                const name = product.caption || product.name || product.label || 'Unknown';
                                return (
                                    <Badge key={productId} className="gap-1">
                                        {name}
                                        <button
                                            onClick={() => handleRemoveProduct(productId)}
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
                            placeholder={loading ? "Loading products..." : "Search products..."}
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
                    {isOpen && canFetch && (
                        <>
                            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                                {loading ? (
                                    <div className="p-4 text-center text-muted-foreground">
                                        Loading products...
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="p-4 text-center text-muted-foreground">
                                        {searchQuery ? 'No products found' : 'No products available'}
                                    </div>
                                ) : (
                                    filteredProducts.map(product => {
                                        const productId = product.value || product.id;
                                        const name = product.caption || product.name || product.label || 'Unknown';
                                        const isSelected = productIds.includes(productId);
                                        return (
                                            <div
                                                key={productId}
                                                onClick={() => handleToggleProduct(product)}
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
                                                    onChange={() => handleToggleProduct(product)}
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

                    {selectedProducts.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

