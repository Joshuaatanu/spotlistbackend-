import { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Wrappe any chart component with fullscreen capability
 */
export function FullscreenChart({ title, children, className }) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    return (
        <>
            {/* Normal view with expand button */}
            <div className={cn("relative group", className)}>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={() => setIsFullscreen(true)}
                    title="View fullscreen"
                >
                    <Maximize2 className="size-4" />
                </Button>
                {children}
            </div>

            {/* Fullscreen Dialog */}
            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                <DialogContent className="max-w-[90vw] h-[85vh] flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="flex items-center justify-between">
                            {title}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsFullscreen(false)}
                            >
                                <Minimize2 className="size-4" />
                            </Button>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto">
                        {children}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
