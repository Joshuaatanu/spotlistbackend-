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
            <div className="p-6 border-2 border-primary/25 bg-primary/5 rounded-2xl flex items-center gap-4">
                <div className="p-4 bg-primary/15 rounded-xl flex items-center justify-center shrink-0 border border-primary/20">
                    <FileText className="size-6 text-primary" />
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
                    className="shrink-0"
                >
                    <X className="size-5" />
                </Button>
            </div>
        );
    }

    return (
        <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
                "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
            )}
        >
            <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
            />
            <label
                htmlFor="file-upload"
                className="cursor-pointer block"
            >
                <div className={cn(
                    "size-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 transition-transform",
                    isDragging && "scale-110"
                )}>
                    <Upload className="size-8 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">
                    Drop your spotlist here
                </h3>
                <p className="text-sm text-muted-foreground mb-1">
                    or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                    Accepted: .csv, .xlsx, .xls (max 10MB)
                </p>
            </label>
        </div>
    );
}
