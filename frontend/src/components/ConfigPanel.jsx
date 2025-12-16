import { useMemo } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Info } from 'lucide-react';

// Time window risk configuration based on AGF approximation
const TIME_WINDOW_RULES = {
    veryHigh: {
        min: 5,
        max: 29,
        risk: 'Very High: 50-70%',
        riskColor: '#EF4444',
        budgetShare: 'Max. 2%',
        reachEffect: 'Very high overlap – hardly any net increase',
        dwellTime: '~55-70% stay 30 minutes',
        description: 'Very high risk of double contact'
    },
    high: {
        min: 30,
        max: 59,
        risk: 'High: 25-45%',
        riskColor: '#F59E0B',
        budgetShare: 'Max. 10-13%',
        reachEffect: 'Still high overlap – limited increase',
        dwellTime: '~35-50% stay at least 60 minutes',
        description: 'High risk of double contact'
    },
    medium: {
        min: 60,
        max: 89,
        risk: 'Medium: 18-30%',
        riskColor: '#3B82F6',
        budgetShare: '35-45%',
        reachEffect: 'Start of net reach gains',
        dwellTime: '~20-30% stay at least 90 minutes',
        description: 'Medium risk, start of net reach gains'
    },
    low: {
        min: 90,
        max: 120,
        risk: 'Low: 10-18%',
        riskColor: '#10B981',
        budgetShare: '>45%',
        reachEffect: 'Maximum net reach gain',
        dwellTime: '<20% – viewer drop-off increases significantly',
        description: 'Low risk, maximum net reach gain'
    }
};

function getTimeWindowCategory(minutes) {
    if (minutes < 30) return TIME_WINDOW_RULES.veryHigh;
    if (minutes < 60) return TIME_WINDOW_RULES.high;
    if (minutes < 90) return TIME_WINDOW_RULES.medium;
    return TIME_WINDOW_RULES.low;
}

export default function ConfigPanel({ config, setConfig }) {
    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const timeWindowCategory = useMemo(() => {
        return getTimeWindowCategory(config.time_window_minutes);
    }, [config.time_window_minutes]);

    const presetWindows = [
        { label: '<30min', value: 25, category: 'veryHigh' },
        { label: '30-60min', value: 45, category: 'high' },
        { label: '60-90min', value: 75, category: 'medium' },
        { label: '>90min', value: 105, category: 'low' }
    ];

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

            {/* Time Window with Risk Indicators */}
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
                        Time Window (Double Booking Detection)
                    </label>
                    <span style={{
                        fontSize: 'var(--font-size-sm)',
                        color: timeWindowCategory.riskColor,
                        fontWeight: 600
                    }}>
                        {config.time_window_minutes} min
                    </span>
                </div>

                {/* Preset Buttons */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 'var(--space-xs)',
                    marginBottom: 'var(--space-m)'
                }}>
                    {presetWindows.map(preset => {
                        const presetCategory = TIME_WINDOW_RULES[preset.category];
                        const isActive = config.time_window_minutes === preset.value;
                        return (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => handleChange('time_window_minutes', preset.value)}
                                style={{
                                    padding: 'var(--space-xs) var(--space-s)',
                                    border: `2px solid ${isActive ? presetCategory.riskColor : 'var(--border-color)'}`,
                                    borderRadius: '6px',
                                    backgroundColor: isActive ? `${presetCategory.riskColor}15` : 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: isActive ? 600 : 400,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>

                {/* Slider */}
                <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={config.time_window_minutes}
                    onChange={(e) => handleChange('time_window_minutes', parseInt(e.target.value))}
                    style={{ width: '100%', marginBottom: 'var(--space-m)' }}
                />

                {/* Risk Information Card */}
                <div style={{
                    padding: 'var(--space-m)',
                    borderRadius: '8px',
                    border: `2px solid ${timeWindowCategory.riskColor}40`,
                    backgroundColor: `${timeWindowCategory.riskColor}08`
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-s)',
                        marginBottom: 'var(--space-s)'
                    }}>
                        <AlertTriangle size={18} style={{ color: timeWindowCategory.riskColor }} />
                        <div style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600,
                            color: timeWindowCategory.riskColor
                        }}>
                            {timeWindowCategory.description}
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 'var(--space-s)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-secondary)'
                    }}>
                        <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                Risk of Double Contact
                            </div>
                            <div style={{ color: timeWindowCategory.riskColor, fontWeight: 600 }}>
                                {timeWindowCategory.risk}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                Recommended Budget Share
                            </div>
                            <div style={{ color: timeWindowCategory.riskColor, fontWeight: 600 }}>
                                {timeWindowCategory.budgetShare}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                Average Viewer Dwell Time
                            </div>
                            <div>{timeWindowCategory.dwellTime}</div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                Reach Effect
                            </div>
                            <div>{timeWindowCategory.reachEffect}</div>
                        </div>
                    </div>
                </div>

                {/* Info Note */}
                <div style={{
                    marginTop: 'var(--space-s)',
                    padding: 'var(--space-s)',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '6px',
                    display: 'flex',
                    gap: 'var(--space-s)',
                    alignItems: 'start'
                }}>
                    <Info size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        <strong>AGF Approximation:</strong> Time windows &lt; 90 minutes have higher double contact risk. 
                        For maximum reach efficiency, use 90+ minute windows, but budget share should be limited to 2-13% for shorter windows.
                    </div>
                </div>
            </div>

        </div>
    );
}
