import { useState, useEffect, useMemo } from 'react';
import { Building2, Search } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function CompanySelector({ companyName, setCompanyName, setCompanyId }) {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState(null);

    // Fetch companies from backend
    useEffect(() => {
        const fetchCompanies = async () => {
            setLoading(true);
            setError(null);
            try {
                // Try to fetch from metadata endpoint first
                const response = await axios.get(`${API_BASE_URL}/metadata/companies`);
                if (response.data && Array.isArray(response.data)) {
                    setCompanies(response.data);
                } else {
                    // Fallback: try to get companies via AEOS helper
                    // This would require a new backend endpoint
                    setCompanies([]);
                }
            } catch (err) {
                console.error('Error fetching companies:', err);
                setError('Unable to load companies. You can still type the company name.');
                setCompanies([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCompanies();
    }, []);

    // Filter companies based on search query
    const filteredCompanies = useMemo(() => {
        if (!searchQuery.trim()) {
            return companies; // Show all companies if no search
        }
        const query = searchQuery.toLowerCase();
        return companies.filter(company => {
            const name = company.caption || company.name || company.label || '';
            const value = company.value || company.id || '';
            return name.toLowerCase().includes(query) || 
                   String(value).includes(query);
        }); // Show all matching results
    }, [companies, searchQuery]);

    // Find selected company object
    const selectedCompany = useMemo(() => {
        if (!companyName) return null;
        return companies.find(c => {
            const name = c.caption || c.name || c.label || '';
            const value = c.value || c.id || '';
            return name.toLowerCase() === companyName.toLowerCase() ||
                   String(value) === String(companyName);
        });
    }, [companies, companyName]);

    const handleSelectCompany = (company) => {
        const name = company.caption || company.name || company.label || '';
        const id = company.value || company.id;
        setCompanyName(name);
        if (setCompanyId) {
            setCompanyId(id);
        }
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setCompanyName(value);
        if (value && !isOpen) {
            setIsOpen(true);
        }
    };

    const displayName = selectedCompany 
        ? (selectedCompany.caption || selectedCompany.name || selectedCompany.label)
        : companyName;

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
                <Building2 size={16} />
                Company Name
            </label>
            
            <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <input
                        type="text"
                        value={displayName}
                        onChange={handleInputChange}
                        onFocus={() => setIsOpen(true)}
                        placeholder="Search or type company name..."
                        style={{
                            width: '100%',
                            padding: 'var(--space-m)',
                            paddingRight: loading ? '40px' : 'var(--space-m)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            fontSize: 'var(--font-size-base)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                        }}
                    />
                    {loading && (
                        <div 
                            className="loading-spinner"
                            style={{ 
                                position: 'absolute', 
                                right: '12px',
                                width: '16px',
                                height: '16px'
                            }} 
                        />
                    )}
                </div>

                {error && (
                    <p style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--accent-error)',
                        marginTop: 'var(--space-xs)',
                        margin: 'var(--space-xs) 0 0 0'
                    }}>
                        {error}
                    </p>
                )}

                {isOpen && (filteredCompanies.length > 0 || searchQuery) && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 1000,
                        maxHeight: '500px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Search within dropdown */}
                        {companies.length > 10 && (
                            <div style={{
                                padding: 'var(--space-s)',
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-secondary)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-xs)',
                                    padding: 'var(--space-xs) var(--space-s)',
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px'
                                }}>
                                    <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search companies..."
                                        style={{
                                            flex: 1,
                                            border: 'none',
                                            outline: 'none',
                                            backgroundColor: 'transparent',
                                            color: 'var(--text-primary)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}

                        {/* Company list */}
                        <div style={{
                            overflowY: 'auto',
                            maxHeight: '400px'
                        }}>
                            {filteredCompanies.length > 0 ? (
                                filteredCompanies.map((company, index) => {
                                    const name = company.caption || company.name || company.label || 'Unknown';
                                    const isSelected = selectedCompany && 
                                        (selectedCompany.value || selectedCompany.id) === (company.value || company.id);
                                    
                                    return (
                                        <button
                                            key={company.value || company.id || index}
                                            type="button"
                                            onClick={() => handleSelectCompany(company)}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-m)',
                                                border: 'none',
                                                borderBottom: '1px solid var(--border-subtle)',
                                                backgroundColor: isSelected 
                                                    ? 'rgba(59, 130, 246, 0.1)' 
                                                    : 'transparent',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
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
                                            <span style={{ fontWeight: isSelected ? 600 : 400 }}>
                                                {name}
                                            </span>
                                            {isSelected && (
                                                <span style={{ 
                                                    color: 'var(--accent-primary)',
                                                    fontSize: '18px'
                                                }}>✓</span>
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div style={{
                                    padding: 'var(--space-l)',
                                    textAlign: 'center',
                                    color: 'var(--text-tertiary)',
                                    fontSize: 'var(--font-size-sm)'
                                }}>
                                    {searchQuery ? 'No companies found' : 'No companies available'}
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>

            {/* Click outside to close */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                    }}
                    onClick={() => {
                        setIsOpen(false);
                        setSearchQuery('');
                    }}
                />
            )}

            <p style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-tertiary)',
                marginTop: 'var(--space-xs)',
                margin: 'var(--space-xs) 0 0 0'
            }}>
                {companies.length > 0 
                    ? `${companies.length} companies available. ${searchQuery ? `${filteredCompanies.length} match your search` : 'Type to filter'}`
                    : 'Enter the company name to search for in TV audit data'}
            </p>
        </div>
    );
}



