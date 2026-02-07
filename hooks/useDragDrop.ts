import { useEffect } from 'react';

/**
 * Hook for window-level drag-and-drop handling of .cue files and images.
 *
 * Attaches to window so drops work anywhere (no visible drop zone needed).
 * Per CONTEXT.md: "No visible drop zone - drop anywhere on window, just works"
 *
 * @param onFile - Callback invoked when a valid .cue file is dropped
 * @param enabled - Whether to listen for drops (default: true). Set to false during modals.
 * @param onInvalidFile - Optional callback invoked when an invalid (non-.cue) file is dropped
 * @param onImageFile - Optional callback invoked when an image file is dropped (Phase 57)
 *
 * @example
 * useDragDrop(handleLoadFile, !showSettings, handleInvalid, handleImageDrop);
 */
export function useDragDrop(
  onFile: (file: File) => void,
  enabled: boolean = true,
  onInvalidFile?: (file: File) => void,
  onImageFile?: (file: File) => void
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

      // Phase 57: Route image files to dedicated handler
      if (file.type.startsWith('image/') && onImageFile) {
        onImageFile(file);
        return;
      }

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
  }, [onFile, enabled, onInvalidFile, onImageFile]);
}

export default useDragDrop;
