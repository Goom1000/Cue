import { useEffect, useCallback, useRef } from 'react';

/**
 * Result of a paste operation with extracted content
 */
export interface PasteResult {
  /** HTML content from clipboard (PowerPoint copies as HTML) */
  html: string | null;
  /** Plain text fallback */
  text: string | null;
  /** Image blob if present (for Phase 57) */
  imageBlob: Blob | null;
  /** Whether this looks like rich content (not just plain text) */
  isRichContent: boolean;
  /** Whether this is a standalone image paste (screenshot, copied image, or web image with HTML wrapper) */
  isImageOnly: boolean;
}

/**
 * Options for paste handling
 */
export interface UsePasteOptions {
  /** Callback when paste is detected with rich content (HTML or image) */
  onPaste: (result: PasteResult) => void;
  /** Whether to listen for paste events (default: true) */
  enabled?: boolean;
  /** Whether to prevent default paste behavior for rich content (default: true) */
  preventDefault?: boolean;
}

/**
 * Hook for window-level paste event handling.
 *
 * Captures Ctrl+V/Cmd+V paste events and extracts clipboard content.
 * Only triggers onPaste for rich content (HTML/images) - plain text
 * in form fields is handled normally.
 *
 * Per CONTEXT.md: "Content type detection - rich HTML content (from PowerPoint)
 * creates new slide; plain text pastes into active text field normally"
 *
 * @example
 * usePaste({
 *   onPaste: (result) => handlePasteSlide(result),
 *   enabled: appState === AppState.EDITING,
 * });
 */
export function usePaste({
  onPaste,
  enabled = true,
  preventDefault = true,
}: UsePasteOptions): void {
  // Use ref to avoid stale closure in event handler
  const onPasteRef = useRef(onPaste);
  onPasteRef.current = onPaste;

  const handlePaste = useCallback((e: ClipboardEvent) => {
    // Skip if disabled
    if (!enabled) return;

    // Skip if user is typing in an input/textarea (let normal paste work)
    const activeElement = document.activeElement;
    const isInTextField = activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement?.getAttribute('contenteditable') === 'true' ||
      activeElement?.getAttribute('contenteditable') === 'plaintext-only';

    // Get clipboard data
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Extract content
    const html = clipboardData.getData('text/html') || null;
    const text = clipboardData.getData('text/plain') || null;

    // Check for image - first in items, then in files
    let imageBlob: Blob | null = null;
    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        imageBlob = items[i].getAsFile();
        break;
      }
    }

    // Also check files array (PowerPoint copies slides as image files)
    if (!imageBlob && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type.startsWith('image/')) {
          imageBlob = file;
          break;
        }
      }
    }

    // Determine if this is "rich" content vs plain text
    // Rich = has HTML (from PPT/Word/web) or has image
    const isRichContent = !!html || !!imageBlob;

    // Determine if this is a standalone image paste (Phase 57)
    // Image-only = has imageBlob AND either no HTML, or HTML is just an image wrapper
    // Web-copied images often come with HTML like <img src="..."> or <meta>...<img>
    // We detect these by stripping tags and checking if remaining text is empty
    let isImageOnly = false;
    if (imageBlob) {
      if (!html) {
        // Pure image paste (screenshot, etc.) — no HTML at all
        isImageOnly = true;
      } else {
        // Has both image and HTML — check if HTML is just an image wrapper
        // Parse HTML, strip all tags, check if remaining text is empty/whitespace
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const textContent = doc.body?.textContent?.trim() || '';
        // If no substantive text remains after stripping tags, this is an image wrapper
        // (e.g., <img src="..."> or <meta charset="utf-8"><img src="...">)
        if (textContent.length === 0) {
          isImageOnly = true;
        }
      }
    }

    // If in text field and NOT rich content, let browser handle normally
    if (isInTextField && !isRichContent) {
      return; // Don't prevent default, don't call onPaste
    }

    // If in text field WITH rich content, we should still allow paste
    // but this is edge case - for now, also skip (user expects to paste into field)
    if (isInTextField) {
      return;
    }

    // Rich content outside text field -> create slide
    if (isRichContent) {
      if (preventDefault) {
        e.preventDefault();
      }

      onPasteRef.current({
        html,
        text,
        imageBlob,
        isRichContent,
        isImageOnly,
      });
    }
  }, [enabled, preventDefault]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [enabled, handlePaste]);
}

export default usePaste;
