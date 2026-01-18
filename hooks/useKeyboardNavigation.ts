import { useEffect } from 'react';

interface UseKeyboardNavigationOptions {
  onNext: () => void;
  onPrev: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

/**
 * Hook for global keyboard navigation in presentations.
 * Handles standard presentation remote keys (Page Up/Down, Arrow keys, Space, Escape).
 * Automatically ignores input when user is typing in form fields.
 */
function useKeyboardNavigation({
  onNext,
  onPrev,
  onEscape,
  enabled = true,
}: UseKeyboardNavigationOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip handling if user is typing in an input or textarea
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toUpperCase();
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ': // Space
          event.preventDefault();
          onNext();
          break;

        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          onPrev();
          break;

        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onNext, onPrev, onEscape]);
}

export default useKeyboardNavigation;
