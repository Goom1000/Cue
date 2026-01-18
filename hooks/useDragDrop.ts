import { useEffect } from 'react';

/**
 * Hook for window-level drag-and-drop handling of .pipi files.
 *
 * Attaches to window so drops work anywhere (no visible drop zone needed).
 * Per CONTEXT.md: "No visible drop zone - drop anywhere on window, just works"
 *
 * @param onFile - Callback invoked when a valid .pipi file is dropped
 * @param enabled - Whether to listen for drops (default: true). Set to false during modals.
 *
 * @example
 * useDragDrop((file) => handleLoadFile(file), !showSettings && !showResourceHub);
 */
export function useDragDrop(
  onFile: (file: File) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    // Don't attach listeners if disabled
    if (!enabled) return;

    // Prevent default drag behavior (required to enable drop)
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Handle file drop
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer?.files[0];
      if (file?.name.endsWith('.pipi')) {
        onFile(file);
      }
      // Ignore non-.pipi files silently
      // (load service will show proper error if user picks wrong file via picker)
    };

    // Attach window-level listeners
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    // Cleanup on unmount or when enabled changes
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFile, enabled]);
}

export default useDragDrop;
