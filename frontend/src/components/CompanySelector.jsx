import { useState, useEffect, useMemo } from 'react';
import { Building2, Search, Check } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function CompanySelector({ companyName, setCompanyName, setCompanyId }) {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCompanies = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`${API_BASE_URL}/metadata/companies`);
                if (response.data && Array.isArray(response.data)) {
                    setCompanies(response.data);
                } else {
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

    const filteredCompanies = useMemo(() => {
        if (!searchQuery.trim()) {
            return companies;
        }
        const query = searchQuery.toLowerCase();
        return companies.filter(company => {
            const name = company.caption || company.name || company.label || '';
            const value = company.value || company.id || '';
            return name.toLowerCase().includes(query) ||
                String(value).includes(query);
        });
    }, [companies, searchQuery]);

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
        <div className="relative">
            <Label className="flex items-center gap-2 mb-2">
                <Building2 className="size-4" />
                Company Name
            </Label>

            <div className="relative">
                <div className="relative">
                    <Input
                        type="text"
                        value={displayName}
                        onChange={handleInputChange}
                        onFocus={() => setIsOpen(true)}
                        placeholder="Search or type company name..."
                        className={cn(loading && "pr-10")}
                    />
                    {loading && (
                        <div className="loading-spinner absolute right-3 top-1/2 -translate-y-1/2 size-4" />
                    )}
                </div>

                {error && (
                    <p className="text-xs text-destructive mt-1">{error}</p>
                )}

                {isOpen && (filteredCompanies.length > 0 || searchQuery) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-[500px] overflow-hidden flex flex-col">
                        {/* Search within dropdown */}
                        {companies.length > 10 && (
                            <div className="p-2 border-b bg-muted">
                                <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-md">
                                    <Search className="size-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search companies..."
                                        className="flex-1 border-none outline-none bg-transparent text-sm"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}

                        {/* Company list */}
                        <div className="overflow-y-auto max-h-96">
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
                                            className={cn(
                                                "w-full p-3 border-b last:border-b-0 flex items-center justify-between text-left transition-colors",
                                                isSelected ? "bg-primary/10" : "hover:bg-muted"
                                            )}
                                        >
                                            <span className={cn(isSelected && "font-semibold")}>
                                                {name}
                                            </span>
                                            {isSelected && (
                                                <Check className="size-5 text-primary" />
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="p-6 text-center text-muted-foreground text-sm">
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
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setIsOpen(false);
                        setSearchQuery('');
                    }}
                />
            )}

            <p className="text-xs text-muted-foreground mt-1">
                {companies.length > 0
                    ? `${companies.length} companies available. ${searchQuery ? `${filteredCompanies.length} match your search` : 'Type to filter'}`
                    : 'Enter the company name to search for in TV audit data'}
            </p>
        </div>
    );
}
