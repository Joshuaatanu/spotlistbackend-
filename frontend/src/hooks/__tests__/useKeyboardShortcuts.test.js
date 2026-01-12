/**
 * Tests for useKeyboardShortcuts hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, DASHBOARD_SHORTCUTS } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
    beforeEach(() => {
        // Clear any existing event listeners
        vi.clearAllMocks();
    });

    it('calls callback when key is pressed', () => {
        const mockCallback = vi.fn();

        renderHook(() => useKeyboardShortcuts({ 'f': mockCallback }));

        // Simulate keydown event
        const event = new KeyboardEvent('keydown', { key: 'f' });
        document.dispatchEvent(event);

        expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('calls callback with event object', () => {
        const mockCallback = vi.fn();

        renderHook(() => useKeyboardShortcuts({ 'e': mockCallback }));

        const event = new KeyboardEvent('keydown', { key: 'e' });
        document.dispatchEvent(event);

        expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
            key: 'e',
        }));
    });

    it('ignores shortcuts when typing in input', () => {
        const mockCallback = vi.fn();

        renderHook(() => useKeyboardShortcuts({ 'f': mockCallback }));

        // Create an input element and focus it
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        // Create event with input as target
        const event = new KeyboardEvent('keydown', {
            key: 'f',
            bubbles: true,
        });
        Object.defineProperty(event, 'target', {
            writable: false,
            value: input
        });

        document.dispatchEvent(event);

        expect(mockCallback).not.toHaveBeenCalled();

        // Cleanup
        document.body.removeChild(input);
    });

    it('ignores shortcuts when typing in textarea', () => {
        const mockCallback = vi.fn();

        renderHook(() => useKeyboardShortcuts({ 'f': mockCallback }));

        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        const event = new KeyboardEvent('keydown', {
            key: 'f',
            bubbles: true,
        });
        Object.defineProperty(event, 'target', {
            writable: false,
            value: textarea
        });

        document.dispatchEvent(event);

        expect(mockCallback).not.toHaveBeenCalled();

        document.body.removeChild(textarea);
    });

    it('handles modifier keys (ctrl+key)', () => {
        const mockCallback = vi.fn();

        renderHook(() => useKeyboardShortcuts({ 'ctrl+s': mockCallback }));

        const event = new KeyboardEvent('keydown', {
            key: 's',
            ctrlKey: true,
        });
        document.dispatchEvent(event);

        expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('does not call callback when disabled', () => {
        const mockCallback = vi.fn();

        renderHook(() => useKeyboardShortcuts({ 'f': mockCallback }, false));

        const event = new KeyboardEvent('keydown', { key: 'f' });
        document.dispatchEvent(event);

        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('handles escape key', () => {
        const mockCallback = vi.fn();

        renderHook(() => useKeyboardShortcuts({ 'escape': mockCallback }));

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);

        expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('cleans up event listener on unmount', () => {
        const mockCallback = vi.fn();
        const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

        const { unmount } = renderHook(() => useKeyboardShortcuts({ 'f': mockCallback }));

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

        removeEventListenerSpy.mockRestore();
    });
});

describe('DASHBOARD_SHORTCUTS', () => {
    it('defines expected shortcut keys', () => {
        expect(DASHBOARD_SHORTCUTS).toHaveProperty('f');
        expect(DASHBOARD_SHORTCUTS).toHaveProperty('e');
        expect(DASHBOARD_SHORTCUTS).toHaveProperty('escape');
        expect(DASHBOARD_SHORTCUTS).toHaveProperty('?');
    });

    it('has correct structure for each shortcut', () => {
        const shortcut = DASHBOARD_SHORTCUTS['f'];
        expect(shortcut).toHaveProperty('key');
        expect(shortcut).toHaveProperty('label');
        expect(shortcut).toHaveProperty('description');
    });
});
