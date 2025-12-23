import { useState, useEffect, useMemo } from 'react';
import { Package, Search } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

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

    // Fetch products when brand IDs or company ID changes
    useEffect(() => {
        // If no brands selected but company is available, fetch all products for company
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
                
                // If brand IDs are provided, use them; otherwise use company ID
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

    // Filter products based on search query
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

    return (
        <div style={{ position: 'relative' }}>
            <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-s)',
                marginBottom: 'var(--space-s)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                color: 'var(--text-primary)'
            }}>
                <Package size={16} />
                Products {brandIds && brandIds.length > 0 ? '(filtered by selected brands)' : companyId ? '(all products for company)' : '(Select company or brands first)'}
            </label>
            
            {(!brandIds || brandIds.length === 0) && !companyId && (
                <div style={{
                    padding: 'var(--space-s)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-tertiary)',
                    fontStyle: 'italic',
                    marginBottom: 'var(--space-s)'
                }}>
                    Please select a company or at least one brand first to load products
                </div>
            )}

            {((brandIds && brandIds.length > 0) || companyId) && (
                <>
                    {/* Selected Products Display */}
                    {selectedProducts.length > 0 && (
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'var(--space-xs)',
                            marginBottom: 'var(--space-s)',
                            padding: 'var(--space-xs)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '6px',
                            minHeight: '32px'
                        }}>
                            {selectedProducts.map(product => {
                                const productId = product.value || product.id;
                                const name = product.caption || product.name || product.label || 'Unknown';
                                return (
                                    <span
                                        key={productId}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 8px',
                                            backgroundColor: 'var(--accent-primary)',
                                            color: 'white',
                                            borderRadius: '4px',
                                            fontSize: 'var(--font-size-xs)',
                                            fontWeight: 500
                                        }}
                                    >
                                        {name}
                                        <button
                                            onClick={() => handleRemoveProduct(productId)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'white',
                                                cursor: 'pointer',
                                                padding: 0,
                                                marginLeft: '4px',
                                                fontSize: '14px',
                                                lineHeight: 1
                                            }}
                                        >
                                            ×
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Search Input */}
                    <div style={{ position: 'relative' }}>
                        <Search 
                            size={16} 
                            style={{ 
                                position: 'absolute', 
                                left: '12px', 
                                top: '50%', 
                                transform: 'translateY(-50%)',
                                color: 'var(--text-tertiary)',
                                pointerEvents: 'none'
                            }} 
                        />
                        <input
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
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 36px',
                                borderRadius: '8px',
                                border: '1.5px solid var(--border-color)',
                                backgroundColor: disabled ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--text-primary)',
                                cursor: disabled ? 'not-allowed' : 'text'
                            }}
                        />
                    </div>

                    {/* Dropdown */}
                    {isOpen && ((brandIds && brandIds.length > 0) || companyId) && (
                        <>
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '4px',
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1.5px solid var(--border-color)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    zIndex: 1000,
                                    maxHeight: '300px',
                                    overflowY: 'auto'
                                }}
                            >
                                {loading ? (
                                    <div style={{ padding: 'var(--space-m)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                        Loading products...
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div style={{ padding: 'var(--space-m)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
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
                                                style={{
                                                    padding: '10px 16px',
                                                    cursor: 'pointer',
                                                    backgroundColor: isSelected ? 'var(--accent-primary)15' : 'transparent',
                                                    borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-s)',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleProduct(product)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <span style={{ 
                                                    flex: 1,
                                                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                    fontWeight: isSelected ? 600 : 400
                                                }}>
                                                    {name}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    zIndex: 999
                                }}
                                onClick={() => setIsOpen(false)}
                            />
                        </>
                    )}

                    {error && (
                        <div style={{
                            marginTop: 'var(--space-xs)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--accent-error)'
                        }}>
                            {error}
                        </div>
                    )}

                    {selectedProducts.length > 0 && (
                        <div style={{
                            marginTop: 'var(--space-xs)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-secondary)'
                        }}>
                            {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                        </div>
                    )}
                </>
            )}
        </div>
    );
}


