import { useEffect } from 'react';

/**
 * Hook for window-level drag-and-drop handling of .cue files.
 *
 * Attaches to window so drops work anywhere (no visible drop zone needed).
 * Per CONTEXT.md: "No visible drop zone - drop anywhere on window, just works"
 *
 * @param onFile - Callback invoked when a valid .cue file is dropped
 * @param enabled - Whether to listen for drops (default: true). Set to false during modals.
 * @param onInvalidFile - Optional callback invoked when an invalid (non-.cue) file is dropped
 *
 * @example
 * useDragDrop((file) => handleLoadFile(file), !showSettings, (file) => showError(`${file.name} is not a .cue file`));
 */
export function useDragDrop(
  onFile: (file: File) => void,
  enabled: boolean = true,
  onInvalidFile?: (file: File) => void
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
      if (!file) return;

      const isValidFile = file.name.endsWith('.cue') || file.name.endsWith('.pipi');
      if (isValidFile) {
        onFile(file);
      } else if (onInvalidFile) {
        onInvalidFile(file);
      }
    };

    // Attach window-level listeners
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    // Cleanup on unmount or when enabled changes
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFile, enabled, onInvalidFile]);
}

export default useDragDrop;
