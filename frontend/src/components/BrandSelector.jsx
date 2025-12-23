import { useState, useEffect, useMemo } from 'react';
import { Tag, Search } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

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

    // Fetch brands when company ID changes
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

    // Filter brands based on search query
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
                <Tag size={16} />
                Brands {companyId ? '' : '(Select company first)'}
            </label>
            
            {!companyId && (
                <div style={{
                    padding: 'var(--space-s)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-tertiary)',
                    fontStyle: 'italic',
                    marginBottom: 'var(--space-s)'
                }}>
                    Please select a company first to load brands
                </div>
            )}

            {companyId && (
                <>
                    {/* Selected Brands Display */}
                    {selectedBrands.length > 0 && (
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
                            {selectedBrands.map(brand => {
                                const brandId = brand.value || brand.id;
                                const name = brand.caption || brand.name || brand.label || 'Unknown';
                                return (
                                    <span
                                        key={brandId}
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
                                            onClick={() => handleRemoveBrand(brandId)}
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
                    {isOpen && companyId && (
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
                                        Loading brands...
                                    </div>
                                ) : filteredBrands.length === 0 ? (
                                    <div style={{ padding: 'var(--space-m)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
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
                                                    onChange={() => handleToggleBrand(brand)}
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

                    {selectedBrands.length > 0 && (
                        <div style={{
                            marginTop: 'var(--space-xs)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-secondary)'
                        }}>
                            {selectedBrands.length} brand{selectedBrands.length !== 1 ? 's' : ''} selected
                        </div>
                    )}
                </>
            )}
        </div>
    );
}


