
export default function ConfigPanel({ config, setConfig }) {
    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-l)' }}>
            {/* Creative Match Mode */}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-s)' }}>
                    <button
                        onClick={() => handleChange('creative_match_mode', 1)}
                        style={{
                            padding: 'var(--space-s)',
                            fontSize: 'var(--font-size-sm)',
                            borderRadius: '8px',
                            border: '1px solid',
                            transition: 'all var(--transition-fast)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            ...(config.creative_match_mode === 1
                                ? {
                                    backgroundColor: 'var(--accent-primary)',
                                    borderColor: 'var(--accent-primary)',
                                    color: 'white'
                                }
                                : {
                                    backgroundColor: 'var(--bg-tertiary)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-secondary)'
                                })
                        }}
                        onMouseEnter={(e) => {
                            if (config.creative_match_mode !== 1) {
                                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (config.creative_match_mode !== 1) {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                            }
                        }}
                    >
                        Exact Match
                    </button>
                    <button
                        onClick={() => handleChange('creative_match_mode', 2)}
                        style={{
                            padding: 'var(--space-s)',
                            fontSize: 'var(--font-size-sm)',
                            borderRadius: '8px',
                            border: '1px solid',
                            transition: 'all var(--transition-fast)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            ...(config.creative_match_mode === 2
                                ? {
                                    backgroundColor: 'var(--accent-primary)',
                                    borderColor: 'var(--accent-primary)',
                                    color: 'white'
                                }
                                : {
                                    backgroundColor: 'var(--bg-tertiary)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-secondary)'
                                })
                        }}
                        onMouseEnter={(e) => {
                            if (config.creative_match_mode !== 2) {
                                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (config.creative_match_mode !== 2) {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                            }
                        }}
                    >
                        Contains Text
                    </button>
                </div>
            </div>

            {/* Match Text (only for mode 2) */}
            {config.creative_match_mode === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
                    <label style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 500,
                        color: 'var(--text-primary)'
                    }}>
                        Match Text
                    </label>
                    <input
                        type="text"
                        value={config.creative_match_text}
                        onChange={(e) => handleChange('creative_match_text', e.target.value)}
                        placeholder="e.g. buy"
                    />
                    <p style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-tertiary)',
                        margin: 0
                    }}>
                        Both creatives must contain this text.
                    </p>
                </div>
            )}

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
