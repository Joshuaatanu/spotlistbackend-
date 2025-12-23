import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function MetricsCard({ title, value, subValue, icon: Icon, trend, onClick, isCritical }) {
    return (
        <Card
            className={cn(
                "flex flex-row items-center gap-4 p-6 h-full transition-all",
                onClick && "cursor-pointer hover:shadow-md"
            )}
            onClick={onClick}
        >
            {Icon && (
                <div className={cn(
                    "size-12 rounded-full flex items-center justify-center shrink-0",
                    isCritical ? "bg-red-100 dark:bg-red-950/50" : "bg-amber-100 dark:bg-amber-950/50"
                )}>
                    <Icon className={cn(
                        "size-6",
                        isCritical ? "text-red-500" : "text-amber-500"
                    )} />
                </div>
            )}

            <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-muted-foreground mb-1.5 tracking-tight">
                    {title}
                </div>
                <div className="text-2xl font-bold text-foreground leading-tight tracking-tight tabular-nums">
                    {value}
                </div>
                {subValue && (
                    <div className="mt-1.5">
                        <Badge variant={isCritical ? "error" : "success"} className="text-xs">
                            {subValue}
                        </Badge>
                    </div>
                )}
            </div>
        </Card>
    );
}
