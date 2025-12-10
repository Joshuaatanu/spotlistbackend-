import { useEffect } from 'react';
import { Database, Calendar, Building2 } from 'lucide-react';

export default function AeosDataFetch({ companyName, setCompanyName, dateFrom, setDateFrom, dateTo, setDateTo, channelFilter, setChannelFilter }) {
    // Set default date range to last 7 days if not set
    const getDefaultDateTo = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    const getDefaultDateFrom = () => {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return weekAgo.toISOString().split('T')[0];
    };

    // Initialize dates if not set (using useEffect to avoid setState during render)
    useEffect(() => {
        if (!dateFrom) {
            setDateFrom(getDefaultDateFrom());
        }
        if (!dateTo) {
            setDateTo(getDefaultDateTo());
        }
    }, []); // Only run once on mount

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
            <div>
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
                <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., eBay, Amazon, RTL"
                    style={{
                        width: '100%',
                        padding: 'var(--space-m)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: 'var(--font-size-base)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                    }}
                />
                <p style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-tertiary)',
                    marginTop: 'var(--space-xs)',
                    margin: 'var(--space-xs) 0 0 0'
                }}>
                    Enter the company name to search for in TV audit data
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-m)' }}>
                <div>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-s)',
                        marginBottom: 'var(--space-s)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 500,
                        color: 'var(--text-primary)'
                    }}>
                        <Calendar size={16} />
                        Date From
                    </label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        max={dateTo || getDefaultDateTo()}
                        style={{
                            width: '100%',
                            padding: 'var(--space-m)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            fontSize: 'var(--font-size-base)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                        }}
                    />
                </div>

                <div>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-s)',
                        marginBottom: 'var(--space-s)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 500,
                        color: 'var(--text-primary)'
                    }}>
                        <Calendar size={16} />
                        Date To
                    </label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        min={dateFrom || getDefaultDateFrom()}
                        max={getDefaultDateTo()}
                        style={{
                            width: '100%',
                            padding: 'var(--space-m)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            fontSize: 'var(--font-size-base)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                        }}
                    />
                </div>
            </div>

            <div>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-s)',
                    marginBottom: 'var(--space-s)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 500,
                    color: 'var(--text-primary)'
                }}>
                    <Database size={16} />
                    Channel Filter (Optional)
                </label>
                <input
                    type="text"
                    value={channelFilter}
                    onChange={(e) => setChannelFilter(e.target.value)}
                    placeholder="e.g., VOX, RTL or VOX,RTL,Pro7 (leave empty for all channels)"
                    style={{
                        width: '100%',
                        padding: 'var(--space-m)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: 'var(--font-size-base)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                    }}
                />
                <p style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-tertiary)',
                    marginTop: 'var(--space-xs)',
                    margin: 'var(--space-xs) 0 0 0'
                }}>
                    {channelFilter 
                        ? `Searching channels: ${channelFilter.split(',').map(c => c.trim()).join(', ')}`
                        : 'Searching all available channels'}
                </p>
            </div>

            <div style={{
                padding: 'var(--space-m)',
                backgroundColor: 'rgba(10, 132, 255, 0.08)',
                border: '1px solid rgba(10, 132, 255, 0.25)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'start',
                gap: 'var(--space-s)'
            }}>
                <Database size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                    <p style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        margin: 0,
                        marginBottom: 'var(--space-xs)'
                    }}>
                        Fetching from AEOS TV Audit
                    </p>
                    <p style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-secondary)',
                        margin: 0
                    }}>
                        {channelFilter 
                            ? `Data will be pulled from the specified channel(s) (${channelFilter}) for the specified company and date range.`
                            : 'Data will be pulled from the AEOS API across all available TV channels for the specified company and date range.'}
                    </p>
                </div>
            </div>
        </div>
    );
}

