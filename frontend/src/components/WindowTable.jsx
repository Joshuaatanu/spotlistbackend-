// Time window risk configuration (matching ConfigPanel)
const TIME_WINDOW_RULES = {
    veryHigh: {
        min: 5,
        max: 29,
        risk: 'Very High: 50-70%',
        riskColor: '#EF4444',
        budgetShare: 'Max. 2%',
        reachEffect: 'Very high overlap – hardly any net increase',
        dwellTime: '~55-70% stay 30 minutes'
    },
    high: {
        min: 30,
        max: 59,
        risk: 'High: 25-45%',
        riskColor: '#F59E0B',
        budgetShare: 'Max. 10-13%',
        reachEffect: 'Still high overlap – limited increase',
        dwellTime: '~35-50% stay at least 60 minutes'
    },
    medium: {
        min: 60,
        max: 89,
        risk: 'Medium: 18-30%',
        riskColor: '#3B82F6',
        budgetShare: '35-45%',
        reachEffect: 'Start of net reach gains',
        dwellTime: '~20-30% stay at least 90 minutes'
    },
    low: {
        min: 90,
        max: 120,
        risk: 'Low: 10-18%',
        riskColor: '#10B981',
        budgetShare: '>45%',
        reachEffect: 'Maximum net reach gain',
        dwellTime: '<20% – viewer drop-off increases significantly, dwell time decreases'
    }
};

function getTimeWindowCategory(minutes) {
    if (minutes < 30) return TIME_WINDOW_RULES.veryHigh;
    if (minutes < 60) return TIME_WINDOW_RULES.high;
    if (minutes < 90) return TIME_WINDOW_RULES.medium;
    return TIME_WINDOW_RULES.low;
}

export default function WindowTable({ summaries }) {
    if (!summaries || summaries.length === 0) {
        return (
            <div style={{
                padding: 'var(--space-l)',
                textAlign: 'center',
                color: 'var(--text-tertiary)'
            }}>
                No data available
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Time Window</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Risk Category</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Spots (Abs)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Spots (%)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Budget (Abs)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Budget (%)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Recommended Budget Share</th>
                    </tr>
                </thead>
                <tbody>
                    {summaries.map((row, idx) => {
                        // Extract minutes from "Within X min" format
                        const minutes = parseInt(row.window.match(/\d+/)?.[0] || '0');
                        const category = getTimeWindowCategory(minutes);
                        const actualBudgetPct = parseFloat(row.budget_pct.replace('%', ''));
                        const recommendedBudgetPct = category.budgetShare.includes('Max.') 
                            ? parseFloat(category.budgetShare.match(/\d+(?:\.\d+)?/)?.[0] || '0')
                            : category.budgetShare.includes('>') 
                                ? 100 
                                : parseFloat(category.budgetShare.match(/\d+(?:\.\d+)?/)?.[0] || '0');
                        const isOverBudget = category.budgetShare.includes('Max.') && actualBudgetPct > recommendedBudgetPct;
                        
                        return (
                            <tr 
                                key={idx}
                                style={{
                                    borderBottom: '1px solid var(--border-subtle)',
                                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)'
                                }}
                            >
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {row.window}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: `${category.riskColor}15`,
                                        color: category.riskColor,
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 600
                                    }}>
                                        {category.risk}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                    {row.spots_abs}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                    {row.spots_pct}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                                    €{row.budget_abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ 
                                    padding: '12px 16px', 
                                    textAlign: 'right', 
                                    fontVariantNumeric: 'tabular-nums',
                                    color: isOverBudget ? '#EF4444' : 'var(--text-primary)',
                                    fontWeight: isOverBudget ? 600 : 400
                                }}>
                                    {row.budget_pct}
                                    {isOverBudget && (
                                        <span style={{ 
                                            marginLeft: '4px', 
                                            fontSize: 'var(--font-size-xs)',
                                            color: '#EF4444'
                                        }} title="Exceeds recommended budget share">
                                            ⚠️
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'left', fontSize: 'var(--font-size-xs)', color: category.riskColor, fontWeight: 500 }}>
                                    {category.budgetShare}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            
            {/* Risk Information Legend */}
            <div style={{
                marginTop: 'var(--space-m)',
                padding: 'var(--space-m)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
            }}>
                <div style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-s)'
                }}>
                    Time Window Risk Guidelines (AGF Approximation)
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'var(--space-s)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)'
                }}>
                    {Object.values(TIME_WINDOW_RULES).map((rule, idx) => (
                        <div key={idx} style={{
                            padding: 'var(--space-xs)',
                            borderLeft: `3px solid ${rule.riskColor}`,
                            paddingLeft: 'var(--space-s)'
                        }}>
                            <div style={{ fontWeight: 600, color: rule.riskColor, marginBottom: '2px' }}>
                                {rule.risk} Risk
                            </div>
                            <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                Budget: {rule.budgetShare} • {rule.dwellTime}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
