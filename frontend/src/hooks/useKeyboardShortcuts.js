import { useEffect, useCallback } from 'react';

/**
 * Custom hook for keyboard shortcuts
 * @param {Object} shortcuts - Object mapping keys to callback functions
 * @param {boolean} enabled - Whether shortcuts are active
 */
export function useKeyboardShortcuts(shortcuts, enabled = true) {
    const handleKeyDown = useCallback((event) => {
        if (!enabled) return;

        // Don't trigger shortcuts when typing in inputs
        const target = event.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        // Build the key combo string
        const combo = [
            event.ctrlKey && 'ctrl',
            event.altKey && 'alt',
            event.shiftKey && 'shift',
            event.metaKey && 'meta',
            event.key.toLowerCase()
        ].filter(Boolean).join('+');

        // Check for simple key match
        const key = event.key.toLowerCase();

        if (shortcuts[combo]) {
            event.preventDefault();
            shortcuts[combo](event);
        } else if (shortcuts[key]) {
            event.preventDefault();
            shortcuts[key](event);
        }
    }, [shortcuts, enabled]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * Default keyboard shortcuts config for Dashboard
 */
export const DASHBOARD_SHORTCUTS = {
    'f': { key: 'f', label: 'Toggle Filters', description: 'Open/close advanced filters' },
    'e': { key: 'e', label: 'Export', description: 'Download Excel report' },
    'escape': { key: 'Escape', label: 'Close', description: 'Close dialogs and modals' },
    '?': { key: '?', label: 'Help', description: 'Show keyboard shortcuts' },
};
