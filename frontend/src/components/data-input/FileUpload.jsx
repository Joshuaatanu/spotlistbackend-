import { Upload, FileText, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function FileUpload({ file, setFile }) {
    const [isDragging, setIsDragging] = useState(false);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            setFile(droppedFile);
        }
    }, [setFile]);

    const onDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (file) {
        return (
            <div className="p-6 border-2 border-emerald-500/30 bg-emerald-500/5 rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-emerald-500/15 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/20">
                        <FileText className="size-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate mb-1">
                            {file.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFile(null)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                        <X className="size-5" />
                    </Button>
                </div>
                <div className="mt-4 pt-4 border-t border-emerald-500/20 flex items-center gap-2 text-sm text-emerald-600">
                    <span className="size-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        ✓
                    </span>
                    <span className="font-medium">Ready to analyze</span>
                    <span className="text-muted-foreground">• Click "Run Analysis" to proceed</span>
                </div>
            </div>
        );
    }

    return (
        <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
                "border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all relative overflow-hidden group",
                isDragging
                    ? "border-primary bg-primary/10 scale-[1.02]"
                    : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5"
            )}
        >
            {/* Subtle gradient accent */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity",
                isDragging ? "opacity-100" : "group-hover:opacity-50"
            )} />

            <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
            />
            <label
                htmlFor="file-upload"
                className="cursor-pointer block relative z-10"
            >
                <div className={cn(
                    "size-20 bg-primary/10 border-2 border-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 transition-all",
                    isDragging && "scale-110 bg-primary/20"
                )}>
                    <Upload className={cn(
                        "size-10 text-primary transition-transform",
                        isDragging && "animate-bounce"
                    )} />
                </div>
                <h3 className="font-display text-xl font-bold mb-3 text-foreground">
                    Drop your spotlist here
                </h3>
                <p className="text-base text-muted-foreground mb-2">
                    or <span className="text-primary font-medium underline underline-offset-2">click to browse</span>
                </p>
                <p className="text-sm text-muted-foreground/70">
                    Supports CSV, Excel (.xlsx, .xls) • Max 10MB
                </p>
            </label>
        </div>
    );
}
