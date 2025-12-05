export default function MetricsCard({ title, value, subValue, icon: Icon, trend, onClick, isCritical }) {
    return (
        <div
            className="card"
            style={{
                cursor: onClick ? 'pointer' : 'default',
                height: '100%',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '16px',
                padding: '24px'
            }}
            onClick={onClick}
        >
            {Icon && (
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: isCritical ? '#FEE2E2' : '#FEF3C7', // Light red or Light yellow
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <Icon size={24} style={{ color: isCritical ? '#EF4444' : '#F59E0B' }} />
                </div>
            )}
            
            <div style={{ flex: 1 }}>
                <div style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                    letterSpacing: '-0.01em'
                }}>
                    {title}
                </div>
                <div style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--text-primary)',
                    lineHeight: 'var(--line-height-tight)',
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums'
                }}>
                    {value}
                </div>
                {subValue && (
                    <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: isCritical ? 'var(--accent-error)' : 'var(--text-tertiary)',
                        marginTop: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <span style={{ 
                            backgroundColor: isCritical ? '#FEF2F2' : '#ECFDF5',
                            color: isCritical ? '#DC2626' : '#059669',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 'var(--font-weight-semibold)',
                            letterSpacing: '-0.01em'
                        }}>
                            {subValue}
                    </span>
                    </div>
                )}
            </div>
        </div>
    );
}
