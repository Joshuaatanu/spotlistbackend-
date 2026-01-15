/**
 * JobsPanel - Displays background job status and management
 */

import { useState } from 'react';
import {
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    X,
    RefreshCw,
    Download,
    Play,
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useBackgroundJobs } from '../../hooks/useBackgroundJobs';

const STATUS_CONFIG = {
    pending: {
        icon: Clock,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        badge: 'secondary',
        label: 'Pending'
    },
    queued: {
        icon: Clock,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        badge: 'warning',
        label: 'Queued'
    },
    running: {
        icon: Loader2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        badge: 'default',
        label: 'Running',
        animate: true
    },
    completed: {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        badge: 'success',
        label: 'Complete'
    },
    failed: {
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        badge: 'destructive',
        label: 'Failed'
    },
};

function JobItem({ job, onCancel, onRetry, onDelete, onViewData, onAnalyze }) {
    const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
    const Icon = config.icon;

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={cn(
            "p-4 border rounded-lg transition-all",
            config.bgColor,
            "hover:shadow-sm"
        )}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className={cn(
                        "size-5 flex-shrink-0",
                        config.color,
                        config.animate && "animate-spin"
                    )} />
                    <span className="font-medium truncate">{job.job_name}</span>
                </div>
                <Badge variant={config.badge} className="flex-shrink-0 ml-2">
                    {config.label}
                </Badge>
            </div>

            {/* Progress bar for running jobs */}
            {job.status === 'running' && (
                <div className="mb-3">
                    <Progress value={job.progress || 0} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                        {job.progress_message || `${job.progress || 0}%`}
                    </p>
                </div>
            )}

            {/* Error message for failed jobs */}
            {job.status === 'failed' && job.error_message && (
                <p className="text-xs text-red-600 mb-2 line-clamp-2">
                    {job.error_message}
                </p>
            )}

            {/* Completed stats */}
            {job.status === 'completed' && job.result_metadata && (
                <p className="text-xs text-muted-foreground mb-2">
                    {job.result_metadata.total_spots?.toLocaleString() || 0} spots collected
                    {job.result_metadata.channels_with_data && (
                        <> from {job.result_metadata.channels_with_data} channels</>
                    )}
                </p>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground mb-3">
                {job.parameters?.date_from && job.parameters?.date_to && (
                    <span>{job.parameters.date_from} to {job.parameters.date_to}</span>
                )}
                {job.created_at && (
                    <span className="ml-2">Created: {formatDate(job.created_at)}</span>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
                {job.status === 'completed' && (
                    <>
                        <Button size="sm" variant="outline" onClick={() => onViewData?.(job)}>
                            <Download className="size-3 mr-1" />
                            View Data
                        </Button>
                        <Button size="sm" onClick={() => onAnalyze?.(job)}>
                            <Play className="size-3 mr-1" />
                            Analyze
                        </Button>
                    </>
                )}

                {job.status === 'failed' && (
                    <>
                        <Button size="sm" variant="outline" onClick={() => onRetry?.(job.id)}>
                            <RefreshCw className="size-3 mr-1" />
                            Retry
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete?.(job.id)}>
                            <Trash2 className="size-3 mr-1" />
                            Delete
                        </Button>
                    </>
                )}

                {['pending', 'queued', 'running'].includes(job.status) && (
                    <Button size="sm" variant="ghost" onClick={() => onCancel?.(job.id)}>
                        <X className="size-3 mr-1" />
                        Cancel
                    </Button>
                )}

                {job.status === 'completed' && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto"
                        onClick={() => onDelete?.(job.id)}
                    >
                        <Trash2 className="size-3" />
                    </Button>
                )}
            </div>
        </div>
    );
}

export default function JobsPanel({ onViewJobData, onAnalyzeJob }) {
    const {
        jobs,
        running,
        pending,
        completed,
        cancelJob,
        retryJob,
        deleteJob,
        refreshJobs,
        loading
    } = useBackgroundJobs();

    const [filter, setFilter] = useState('all'); // all, active, completed

    const filteredJobs = jobs.filter(job => {
        if (filter === 'active') return ['pending', 'queued', 'running'].includes(job.status);
        if (filter === 'completed') return job.status === 'completed';
        if (filter === 'failed') return job.status === 'failed';
        return true;
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Background Jobs</CardTitle>
                <div className="flex items-center gap-2">
                    {running > 0 && (
                        <Badge variant="default" className="animate-pulse">
                            <Loader2 className="size-3 mr-1 animate-spin" />
                            {running} running
                        </Badge>
                    )}
                    {pending > 0 && (
                        <Badge variant="secondary">
                            {pending} queued
                        </Badge>
                    )}
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={refreshJobs}
                        disabled={loading}
                    >
                        <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {/* Filter tabs */}
                <div className="flex gap-1 mb-4 border-b">
                    {[
                        { value: 'all', label: 'All' },
                        { value: 'active', label: 'Active' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'failed', label: 'Failed' },
                    ].map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value)}
                            className={cn(
                                "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                                filter === tab.value
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Jobs list */}
                {filteredJobs.length === 0 ? (
                    <div className="text-center py-12">
                        <Clock className="size-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">
                            {filter === 'all'
                                ? "No background jobs yet"
                                : `No ${filter} jobs`}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Start a new data collection to see jobs here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {filteredJobs.map((job) => (
                            <JobItem
                                key={job.id}
                                job={job}
                                onCancel={cancelJob}
                                onRetry={retryJob}
                                onDelete={deleteJob}
                                onViewData={onViewJobData}
                                onAnalyze={onAnalyzeJob}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Small indicator for sidebar showing active jobs count
 */
export function JobsStatusIndicator() {
    const { running, pending } = useBackgroundJobs();

    if (running === 0 && pending === 0) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full text-xs font-medium">
            {running > 0 && (
                <span className="flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" />
                    {running}
                </span>
            )}
            {pending > 0 && (
                <span className="text-muted-foreground">
                    +{pending} queued
                </span>
            )}
        </div>
    );
}
