import { 
    LayoutDashboard, 
    FileText, 
    Clock, 
    Settings, 
    LogOut
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
    const menuItems = [
        {
            category: 'MAIN',
            items: [
                { id: 'analyze', label: 'Overview', icon: LayoutDashboard },
                { id: 'results', label: 'Analysis Results', icon: FileText },
                { id: 'history', label: 'History', icon: Clock },
            ]
        },
        {
            category: 'SYSTEM',
            items: [
                { id: 'configuration', label: 'Settings', icon: Settings },
                { id: 'logout', label: 'Logout', icon: LogOut },
            ]
        }
    ];

    return (
        <aside style={{
            width: '260px',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            padding: 'var(--space-l)',
            zIndex: 100
        }}>
            {/* Logo */}
            <div style={{ 
                fontSize: '24px', 
                fontWeight: '800', 
                marginBottom: 'var(--space-xxl)',
                paddingLeft: '12px',
                color: 'var(--text-primary)',
                letterSpacing: '-0.5px'
            }}>
                Spot Analysis
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', overflowY: 'auto' }}>
                {menuItems.map((section, idx) => (
                    <div key={idx}>
                        <div style={{ 
                            fontSize: '12px', 
                            fontWeight: '600', 
                            color: 'var(--text-tertiary)', 
                            marginBottom: '16px',
                            paddingLeft: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {section.category}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {section.items.map((item) => {
                                const ItemIcon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontWeight: isActive ? 600 : 500,
                                            transition: 'all 0.2s',
                                            width: '100%',
                                            position: 'relative'
                                        }}
                                    >
                                        <ItemIcon size={20} style={{ color: isActive ? 'var(--text-primary)' : 'inherit' }} />
                                        <span>{item.label}</span>
                                        
                                        {isActive && (
                                            <div style={{
                                                position: 'absolute',
                                                right: '-24px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: '4px',
                                                height: '24px',
                                                backgroundColor: 'var(--accent-primary)',
                                                borderTopLeftRadius: '4px',
                                                borderBottomLeftRadius: '4px'
                                            }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}
