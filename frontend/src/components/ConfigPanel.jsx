import { useMemo } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Time window risk configuration based on AGF approximation
const TIME_WINDOW_RULES = {
    veryHigh: {
        min: 5,
        max: 29,
        risk: 'Very High: 50-70%',
        riskColor: 'destructive',
        budgetShare: 'Max. 2%',
        reachEffect: 'Very high overlap – hardly any net increase',
        dwellTime: '~55-70% stay 30 minutes',
        description: 'Very high risk of double contact'
    },
    high: {
        min: 30,
        max: 59,
        risk: 'High: 25-45%',
        riskColor: 'warning',
        budgetShare: 'Max. 10-13%',
        reachEffect: 'Still high overlap – limited increase',
        dwellTime: '~35-50% stay at least 60 minutes',
        description: 'High risk of double contact'
    },
    medium: {
        min: 60,
        max: 89,
        risk: 'Medium: 18-30%',
        riskColor: 'info',
        budgetShare: '35-45%',
        reachEffect: 'Start of net reach gains',
        dwellTime: '~20-30% stay at least 90 minutes',
        description: 'Medium risk, start of net reach gains'
    },
    low: {
        min: 90,
        max: 120,
        risk: 'Low: 10-18%',
        riskColor: 'success',
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
        <div className="flex flex-col gap-6">
            {/* Creative Match Mode - Always Exact Match */}
            <div>
                <Label className="mb-2 block">Creative Match Mode</Label>
                <div className="px-3 py-2 text-sm rounded-lg bg-muted border font-medium">
                    Exact Match
                </div>
            </div>

            {/* Time Window with Risk Indicators */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <Label>Time Window (Double Booking Detection)</Label>
                    <Badge variant={timeWindowCategory.riskColor}>
                        {config.time_window_minutes} min
                    </Badge>
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-4 gap-1 mb-4">
                    {presetWindows.map(preset => {
                        const presetCategory = TIME_WINDOW_RULES[preset.category];
                        const isActive = config.time_window_minutes === preset.value;
                        return (
                            <Button
                                key={preset.label}
                                type="button"
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleChange('time_window_minutes', preset.value)}
                                className={cn(
                                    "text-xs",
                                    isActive && presetCategory.riskColor === 'destructive' && "bg-red-500 hover:bg-red-600",
                                    isActive && presetCategory.riskColor === 'warning' && "bg-amber-500 hover:bg-amber-600",
                                    isActive && presetCategory.riskColor === 'info' && "bg-blue-500 hover:bg-blue-600",
                                    isActive && presetCategory.riskColor === 'success' && "bg-emerald-500 hover:bg-emerald-600"
                                )}
                            >
                                {preset.label}
                            </Button>
                        );
                    })}
                </div>

                {/* Slider */}
                <Slider
                    min={5}
                    max={120}
                    step={5}
                    value={[config.time_window_minutes]}
                    onValueChange={([value]) => handleChange('time_window_minutes', value)}
                    className="mb-4"
                />

                {/* Risk Information Card */}
                <Alert variant={timeWindowCategory.riskColor}>
                    <AlertTriangle className="size-4" />
                    <AlertDescription>
                        <div className="font-semibold mb-2">{timeWindowCategory.description}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <div className="font-medium text-foreground mb-1">Risk of Double Contact</div>
                                <div>{timeWindowCategory.risk}</div>
                            </div>
                            <div>
                                <div className="font-medium text-foreground mb-1">Recommended Budget Share</div>
                                <div>{timeWindowCategory.budgetShare}</div>
                            </div>
                            <div>
                                <div className="font-medium text-foreground mb-1">Average Viewer Dwell Time</div>
                                <div>{timeWindowCategory.dwellTime}</div>
                            </div>
                            <div>
                                <div className="font-medium text-foreground mb-1">Reach Effect</div>
                                <div>{timeWindowCategory.reachEffect}</div>
                            </div>
                        </div>
                    </AlertDescription>
                </Alert>

                {/* Info Note */}
                <Alert variant="info" className="mt-3">
                    <Info className="size-4" />
                    <AlertDescription className="text-xs">
                        <strong>AGF Approximation:</strong> Time windows &lt; 90 minutes have higher double contact risk.
                        For maximum reach efficiency, use 90+ minute windows, but budget share should be limited to 2-13% for shorter windows.
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
}
