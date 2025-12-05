
export default function ConfigPanel({ config, setConfig }) {
    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-l)' }}>
            {/* Creative Match Mode - Always Exact Match */}
            <div>
                <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-s)'
                }}>
                    Creative Match Mode
                </label>
                <div style={{
                    padding: 'var(--space-s)',
                    fontSize: 'var(--font-size-sm)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontWeight: 500
                }}>
                    Exact Match
                </div>
            </div>

            {/* Time Window */}
            <div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-s)'
                }}>
                    <label style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 500,
                        color: 'var(--text-primary)'
                    }}>
                        Time Window
                    </label>
                    <span style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--accent-primary)',
                        fontWeight: 600
                    }}>
                        {config.time_window_minutes} min
                    </span>
                </div>
                <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={config.time_window_minutes}
                    onChange={(e) => handleChange('time_window_minutes', parseInt(e.target.value))}
                    style={{ width: '100%' }}
                />
            </div>

        </div>
    );
}
