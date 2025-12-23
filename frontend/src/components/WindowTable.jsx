import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Time window risk configuration
const TIME_WINDOW_RULES = {
    veryHigh: {
        min: 5, max: 29,
        risk: 'Very High: 50-70%',
        color: 'red',
        budgetShare: 'Max. 2%',
        dwellTime: '~55-70% stay 30 minutes'
    },
    high: {
        min: 30, max: 59,
        risk: 'High: 25-45%',
        color: 'amber',
        budgetShare: 'Max. 10-13%',
        dwellTime: '~35-50% stay at least 60 minutes'
    },
    medium: {
        min: 60, max: 89,
        risk: 'Medium: 18-30%',
        color: 'blue',
        budgetShare: '35-45%',
        dwellTime: '~20-30% stay at least 90 minutes'
    },
    low: {
        min: 90, max: 120,
        risk: 'Low: 10-18%',
        color: 'green',
        budgetShare: '>45%',
        dwellTime: '<20% – viewer drop-off increases'
    }
};

const colorClasses = {
    red: { badge: 'bg-red-100 text-red-600 dark:bg-red-950/50', border: 'border-l-red-500', text: 'text-red-500' },
    amber: { badge: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50', border: 'border-l-amber-500', text: 'text-amber-500' },
    blue: { badge: 'bg-blue-100 text-blue-600 dark:bg-blue-950/50', border: 'border-l-blue-500', text: 'text-blue-500' },
    green: { badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50', border: 'border-l-emerald-500', text: 'text-emerald-500' },
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
            <div className="p-6 text-center text-muted-foreground">
                No data available
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b-2 border-border">
                        <th className="px-4 py-3 text-left text-sm font-semibold">Time Window</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Risk Category</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Spots (Abs)</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Spots (%)</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Budget (Abs)</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Budget (%)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Recommended</th>
                    </tr>
                </thead>
                <tbody>
                    {summaries.map((row, idx) => {
                        const minutes = parseInt(row.window.match(/\d+/)?.[0] || '0');
                        const category = getTimeWindowCategory(minutes);
                        const colors = colorClasses[category.color];
                        const actualBudgetPct = parseFloat(row.budget_pct.replace('%', ''));
                        const recommendedBudgetPct = category.budgetShare.includes('Max.')
                            ? parseFloat(category.budgetShare.match(/\d+(?:\.\d+)?/)?.[0] || '0')
                            : 100;
                        const isOverBudget = category.budgetShare.includes('Max.') && actualBudgetPct > recommendedBudgetPct;

                        return (
                            <tr
                                key={idx}
                                className={cn(
                                    "border-b border-border",
                                    idx % 2 === 1 && "bg-muted/50"
                                )}
                            >
                                <td className="px-4 py-3 font-semibold">{row.window}</td>
                                <td className="px-4 py-3 text-right">
                                    <span className={cn("px-2 py-1 rounded text-xs font-semibold", colors.badge)}>
                                        {category.risk}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">{row.spots_abs}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{row.spots_pct}</td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums">
                                    €{row.budget_abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className={cn(
                                    "px-4 py-3 text-right tabular-nums",
                                    isOverBudget && "text-red-500 font-semibold"
                                )}>
                                    {row.budget_pct}
                                    {isOverBudget && <span className="ml-1" title="Exceeds recommended">⚠️</span>}
                                </td>
                                <td className={cn("px-4 py-3 text-xs font-medium", colors.text)}>
                                    {category.budgetShare}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Risk Information Legend */}
            <div className="m-4 p-4 bg-muted rounded-lg border">
                <h4 className="text-xs font-semibold mb-3">
                    Time Window Risk Guidelines (AGF Approximation)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.values(TIME_WINDOW_RULES).map((rule, idx) => {
                        const colors = colorClasses[rule.color];
                        return (
                            <div key={idx} className={cn("pl-3 border-l-[3px]", colors.border)}>
                                <p className={cn("font-semibold text-xs mb-0.5", colors.text)}>
                                    {rule.risk} Risk
                                </p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Budget: {rule.budgetShare} • {rule.dwellTime}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
