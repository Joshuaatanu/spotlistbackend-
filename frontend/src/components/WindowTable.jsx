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
            <table style={{ width: '100%' }}>
                <thead>
                    <tr>
                        <th>Time Window</th>
                        <th>Spots (Abs)</th>
                        <th>Spots (%)</th>
                        <th>Budget (Abs)</th>
                        <th>Budget (%)</th>
                    </tr>
                </thead>
                <tbody>
                    {summaries.map((row, idx) => (
                        <tr key={idx}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {row.window}
                            </td>
                            <td>{row.spots_abs}</td>
                            <td>{row.spots_pct}</td>
                            <td style={{ fontWeight: 500 }}>
                                €{row.budget_abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td>{row.budget_pct}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
