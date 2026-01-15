import { Keyboard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DASHBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

export function KeyboardShortcutsHelp({ open, onOpenChange }) {
    const shortcuts = [
        { key: 'F', label: 'Toggle Filters', description: 'Open/close advanced filters panel' },
        { key: 'E', label: 'Export', description: 'Download Excel report' },
        { key: 'Esc', label: 'Close', description: 'Close dialogs and modals' },
        { key: '?', label: 'Help', description: 'Show this shortcuts dialog' },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="size-5" />
                        Keyboard Shortcuts
                    </DialogTitle>
                    <DialogDescription>
                        Use these shortcuts to navigate faster
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-4">
                    {shortcuts.map((shortcut) => (
                        <div key={shortcut.key} className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="font-medium text-sm">{shortcut.label}</p>
                                <p className="text-xs text-muted-foreground">{shortcut.description}</p>
                            </div>
                            <kbd className="px-2 py-1 text-xs font-mono bg-muted border rounded">
                                {shortcut.key}
                            </kbd>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function KeyboardShortcutsButton({ onClick }) {
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            title="Keyboard shortcuts (?)"
            className="text-muted-foreground hover:text-foreground"
        >
            <Keyboard className="size-5" />
        </Button>
    );
}
