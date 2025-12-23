import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            {/* Overview Stats Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="p-4 border-l-4 border-l-muted">
                        <div className="flex items-center gap-3">
                            <Skeleton className="size-10 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Metrics Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="p-6">
                        <div className="flex items-center gap-4">
                            <Skeleton className="size-12 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-32" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Chart Skeleton */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full rounded-lg" />
                </CardContent>
            </Card>

            {/* Table Skeleton */}
            <Card>
                <CardHeader className="border-b">
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <div className="p-4">
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="h-10 flex-1" />
                                <Skeleton className="h-10 w-24" />
                                <Skeleton className="h-10 w-20" />
                                <Skeleton className="h-10 w-32" />
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
}

export function MetricsCardSkeleton() {
    return (
        <Card className="p-6">
            <div className="flex items-center gap-4">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                </div>
            </div>
        </Card>
    );
}

export function TableSkeleton({ rows = 5 }) {
    return (
        <div className="p-4 space-y-3">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-32" />
                </div>
            ))}
        </div>
    );
}

export function ChartSkeleton() {
    return (
        <div className="p-6">
            <Skeleton className="h-64 w-full rounded-lg" />
        </div>
    );
}
