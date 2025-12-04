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
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                }}>
                    {title}
                </div>
                <div style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.2
                }}>
                    {value}
                </div>
                {subValue && (
                    <div style={{
                        fontSize: '12px',
                        color: isCritical ? 'var(--accent-error)' : 'var(--text-tertiary)',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <span style={{ 
                            backgroundColor: isCritical ? '#FEF2F2' : '#ECFDF5',
                            color: isCritical ? '#DC2626' : '#059669',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontWeight: 600
                        }}>
                            {subValue}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
