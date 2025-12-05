import { Search, Bell, ChevronDown } from 'lucide-react';

export default function Header() {
    return (
        <header style={{
            height: '80px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 40px', // Match content padding
            position: 'sticky',
            top: 0,
            zIndex: 90
        }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '320px' }}>
                <Search size={18} style={{ 
                    position: 'absolute', 
                    left: '16px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)'
                }} />
                <input 
                    type="text" 
                    placeholder="Search Anything ...." 
                    style={{
                        width: '100%',
                        padding: '10px 16px 10px 44px',
                        borderRadius: '20px',
                        border: '1.5px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-normal)',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.01em',
                        transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)'
                    }}
                />
            </div>

            {/* Right Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                <div style={{ position: 'relative', cursor: 'pointer' }}>
                    <Bell size={20} style={{ color: 'var(--text-secondary)' }} />
                    <div style={{
                        position: 'absolute',
                        top: '-1px',
                        right: '0px',
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#1A1A1A', // Black dot as seen in image? Or red? Image shows black icon with maybe no dot or subtle one. I'll stick to standard dot.
                        borderRadius: '50%',
                        border: '2px solid var(--bg-secondary)'
                    }} />
                </div>
                
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: 'var(--font-size-sm)', 
                    fontWeight: 'var(--font-weight-semibold)', 
                    color: 'var(--text-primary)', 
                    cursor: 'pointer',
                    letterSpacing: '-0.01em'
                }}>
                    EN <ChevronDown size={16} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                            fontSize: 'var(--font-size-sm)', 
                            fontWeight: 'var(--font-weight-semibold)', 
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.01em'
                        }}>Daniel Craig</div>
                        <div style={{ 
                            fontSize: 'var(--font-size-xs)', 
                            color: 'var(--text-tertiary)',
                            fontWeight: 'var(--font-weight-normal)'
                        }}>Super Admin</div>
                    </div>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#1A1A1A',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'var(--font-weight-bold)',
                        fontSize: 'var(--font-size-sm)',
                        fontFamily: "'Space Grotesk', sans-serif",
                        letterSpacing: '-0.01em'
                    }}>
                        DC
                    </div>
                    <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
                </div>
            </div>
        </header>
    );
}


