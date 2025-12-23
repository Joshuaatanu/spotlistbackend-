import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
    "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
    {
        variants: {
            variant: {
                default: "bg-card text-foreground",
                destructive:
                    "text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current",
                warning:
                    "border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100 [&>svg]:text-amber-600",
                success:
                    "border-emerald-500/50 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100 [&>svg]:text-emerald-600",
                info:
                    "border-blue-500/50 bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100 [&>svg]:text-blue-600",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function Alert({ className, variant, ...props }) {
    return (
        <div
            data-slot="alert"
            role="alert"
            className={cn(alertVariants({ variant }), className)}
            {...props}
        />
    )
}

function AlertTitle({ className, ...props }) {
    return (
        <div
            data-slot="alert-title"
            className={cn(
                "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
                className
            )}
            {...props}
        />
    )
}

function AlertDescription({ className, ...props }) {
    return (
        <div
            data-slot="alert-description"
            className={cn(
                "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
                className
            )}
            {...props}
        />
    )
}

export { Alert, AlertTitle, AlertDescription }
