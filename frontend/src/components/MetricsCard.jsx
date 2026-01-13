import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function MetricsCard({ title, value, subValue, icon: Icon, trend, onClick, isCritical }) {
    return (
        <Card
            className={cn(
                "border border-border bg-card transition-all",
                onClick && "cursor-pointer hover:border-primary/50"
            )}
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                    <div className="text-sm font-medium text-muted-foreground">
                        {title}
                    </div>
                    {Icon && (
                        <Icon className={cn(
                            "size-5",
                            isCritical ? "text-destructive" : "text-muted-foreground"
                        )} />
                    )}
                </div>
                <div className="text-3xl font-semibold text-foreground tabular-nums mb-1">
                    {value}
                </div>
                {subValue && (
                    <div className={cn(
                        "text-sm",
                        isCritical ? "text-destructive" : "text-muted-foreground"
                    )}>
                        {subValue}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
