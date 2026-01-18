# Phase 4: Save/Load System - Research

**Researched:** 2026-01-19
**Domain:** Browser file I/O, localStorage persistence, file format design
**Confidence:** HIGH

## Summary

This phase implements a complete save/load system for PiPi presentations. The system uses browser-native APIs for file download/upload, extends the existing Toast component for user feedback, and adds localStorage-based auto-save for crash recovery.

The codebase already has established patterns for localStorage (useSettings hook with type guards) and Toast notifications. These patterns should be extended rather than replaced. The file format will be JSON with optional gzip compression for large files (those exceeding 10MB uncompressed).

**Primary recommendation:** Use native browser Blob/createObjectURL for downloads, FileReader for imports, extend existing Toast for all feedback, and implement throttled auto-save using the same localStorage pattern as settings.

## Standard Stack

The established libraries/tools for this domain:

### Core (No New Dependencies Required)
| Technology | Purpose | Why Standard |
|------------|---------|--------------|
| Blob + URL.createObjectURL | File download | Native browser API, no library needed |
| FileReader.readAsText | File import | Native browser API, handles JSON well |
| HTML5 drag/drop events | Drag-and-drop loading | Native, no library overhead |
| localStorage | Auto-save persistence | Already in use (useSettings pattern) |

### Optional (For Compression)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fflate | ^0.8.2 | gzip compression | Files > 10MB uncompressed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fflate | pako | fflate is 4x smaller (8kB vs 45kB), faster |
| fflate | lz-string | lz-string better for localStorage, fflate better for files |
| Native drag/drop | react-dropzone | Overkill for single file type, adds 7kB |

**Installation (only if compression needed):**
```bash
npm install fflate
```

## Architecture Patterns

### Recommended Project Structure
```
services/
  saveService.ts         # Save/export logic
  loadService.ts         # Load/import logic
  autoSaveService.ts     # Auto-save to localStorage
hooks/
  useAutoSave.ts         # Hook wrapping auto-save logic
  useDragDrop.ts         # Hook for window drag-drop handling
types.ts                 # Extend with PiPiFile interface
```

### Pattern 1: File Format with Version Metadata
**What:** Embed version and metadata in saved files for future migration
**When to use:** Always - enables forward compatibility
**Example:**
```typescript
// Source: JSON schema versioning best practices
interface PiPiFile {
  version: 1;  // Increment on breaking changes
  createdAt: string;  // ISO 8601
  modifiedAt: string;
  title: string;
  author?: string;
  content: {
    slides: Slide[];
    studentNames: string[];
    lessonText: string;
  };
}

// Migration function pattern
function migrateFile(data: unknown): PiPiFile {
  const version = (data as any)?.version ?? 0;

  if (version === 0) {
    // Legacy format (no version field)
    return migrateV0toV1(data);
  }
  if (version === 1) {
    return data as PiPiFile;
  }
  throw new Error(`Unknown file version: ${version}`);
}
```

### Pattern 2: Blob Download with Memory Cleanup
**What:** Create downloadable file from JSON data
**When to use:** Save/export operations
**Example:**
```typescript
// Source: MDN URL.createObjectURL documentation
function downloadFile(data: PiPiFile, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pipi') ? filename : `${filename}.pipi`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Firefox needs delay before revoke
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
```

### Pattern 3: FileReader with Promise Wrapper
**What:** Read uploaded file as JSON with validation
**When to use:** Load/import operations
**Example:**
```typescript
// Source: MDN FileReader documentation
function readFileAsJSON<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.pipi')) {
      reject(new Error('Invalid file type. Expected .pipi file.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        resolve(data);
      } catch (e) {
        reject(new Error('File contains invalid JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
```

### Pattern 4: Window-Level Drag Drop (Invisible Drop Zone)
**What:** Handle file drop anywhere on window without visible drop zone
**When to use:** Per CONTEXT.md decision: "No visible drop zone - drop anywhere"
**Example:**
```typescript
// Source: Native HTML5 drag-drop API
function useDragDrop(onFile: (file: File) => void) {
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer?.files[0];
      if (file?.name.endsWith('.pipi')) {
        onFile(file);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFile]);
}
```

### Pattern 5: Throttled Auto-Save
**What:** Save state to localStorage at intervals, not on every keystroke
**When to use:** Continuous auto-save for crash recovery
**Example:**
```typescript
// Source: React debounce/throttle best practices
const AUTOSAVE_KEY = 'pipi-autosave';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

function useAutoSave(data: PiPiFile | null) {
  const throttledSave = useMemo(
    () => throttle((d: PiPiFile) => {
      try {
        const json = JSON.stringify(d);
        localStorage.setItem(AUTOSAVE_KEY, json);
        localStorage.setItem(`${AUTOSAVE_KEY}-timestamp`, Date.now().toString());
      } catch (e) {
        console.warn('Auto-save failed:', e);
      }
    }, AUTOSAVE_INTERVAL),
    []
  );

  useEffect(() => {
    if (data) throttledSave(data);
  }, [data, throttledSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => throttledSave.cancel?.();
  }, [throttledSave]);
}
```

### Anti-Patterns to Avoid
- **Creating Blob URL without cleanup:** Memory leak. Always call revokeObjectURL.
- **Auto-saving on every keystroke:** Performance killer. Use throttle (not debounce) for auto-save.
- **Debounce for auto-save:** Dangerous - user might leave before save. Throttle ensures regular saves.
- **Storing Blob URLs in state:** URLs become invalid after revoke. Store data, generate URL on demand.
- **Blocking main thread with large file operations:** Use async where possible for files > 5MB.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Throttle function | Custom throttle | lodash-es throttle or inline | Edge cases around cancellation, leading edge |
| File type validation | Regex on filename | Check file.type + extension | MIME type more reliable |
| JSON pretty-print | Manual spacing | JSON.stringify(data, null, 2) | Built-in, handles all edge cases |
| Size calculation | String length | new Blob([json]).size | Accurate byte count for UTF-8 |
| Unique backup keys | Random strings | Timestamp-based keys | Predictable, sortable |

**Key insight:** Browser APIs cover 90% of file I/O needs. Libraries are only needed for compression.

## Common Pitfalls

### Pitfall 1: localStorage Quota Exceeded
**What goes wrong:** Auto-save fails silently when localStorage is full (~5MB limit)
**Why it happens:** Large presentations with base64 images quickly exceed limit
**How to avoid:**
- Check size before save: `new Blob([json]).size`
- Warn user if approaching limit (e.g., > 4MB)
- For auto-save, store only essential data (no images) if over limit
- Consider IndexedDB for backup if localStorage insufficient
**Warning signs:** QuotaExceededError in console

### Pitfall 2: Base64 Image Size Bloat
**What goes wrong:** 1MB image becomes 1.37MB in JSON (37% overhead)
**Why it happens:** Base64 encoding adds ~33% size, plus JSON escaping
**How to avoid:**
- Calculate total size BEFORE showing 50MB warning
- Size = actual Blob size, not string.length
- Consider compressing images before base64 if size is concern
**Warning signs:** Files much larger than expected

### Pitfall 3: beforeunload Unreliability
**What goes wrong:** Unsaved changes warning doesn't show on mobile/background tabs
**Why it happens:** Mobile browsers may kill tabs without firing beforeunload
**How to avoid:**
- Also listen to visibilitychange event for save
- Auto-save frequently enough that loss is minimal
- Don't rely solely on beforeunload for data safety
**Warning signs:** Data loss reports from mobile users

### Pitfall 4: URL.revokeObjectURL Too Early
**What goes wrong:** Download fails or file is corrupted
**Why it happens:** Revoked URL before browser finished download
**How to avoid:** Use setTimeout with 100ms delay before revoke (Firefox needs this)
**Warning signs:** Download works in Chrome but not Firefox

### Pitfall 5: Multiple Tabs Overwriting Auto-Save
**What goes wrong:** User opens two tabs, edits in both, one overwrites the other
**Why it happens:** All tabs share same localStorage key
**How to avoid:**
- Use tab-specific keys (sessionStorage + localStorage combo)
- Or: Store array of backups with timestamps
- Or: Warn user on load if another tab is editing
**Warning signs:** Users report losing changes unexpectedly

### Pitfall 6: JSON.parse on Untrusted Data
**What goes wrong:** Malformed file crashes app or worse
**Why it happens:** No validation before using parsed data
**How to avoid:**
- Wrap JSON.parse in try-catch
- Validate structure with type guards (like existing isValidSettings pattern)
- Show user-friendly error, not stack trace
**Warning signs:** White screen when loading corrupted file

## Code Examples

Verified patterns from official sources:

### Calculate File Size Before Save
```typescript
// Check if presentation exceeds 50MB before saving
function checkFileSize(data: PiPiFile): { size: number; exceeds50MB: boolean } {
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  return {
    size: blob.size,
    exceeds50MB: blob.size > 50 * 1024 * 1024
  };
}
```

### Type Guard for File Validation
```typescript
// Follows existing isValidSettings pattern from useSettings.ts
function isValidPiPiFile(data: unknown): data is PiPiFile {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'number') return false;
  if (typeof obj.title !== 'string') return false;
  if (typeof obj.content !== 'object' || obj.content === null) return false;

  const content = obj.content as Record<string, unknown>;
  if (!Array.isArray(content.slides)) return false;

  return true;
}
```

### Extend Existing Toast for Success/Error Variants
```typescript
// Build on existing Toast.tsx pattern
// Add variant prop for success (green), error (red), warning (amber)
export interface ToastData {
  id: string;
  message: string;
  duration: number;
  variant?: 'success' | 'error' | 'warning' | 'info';
}

// Usage in save operation:
addToast('Presentation saved successfully!', 3000, 'success');
addToast('Failed to load file: Invalid format', 5000, 'error');
addToast('This presentation is over 50MB', 5000, 'warning');
```

### File Input with Accept Attribute
```typescript
// Hidden file input for .pipi files
<input
  type="file"
  accept=".pipi,application/json"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleFileLoad(file);
  }}
  style={{ display: 'none' }}
  ref={fileInputRef}
/>

// Trigger from button
<Button onClick={() => fileInputRef.current?.click()}>
  Load Presentation
</Button>
```

### Unsaved Changes Warning (Conditional beforeunload)
```typescript
// Only add listener when there are unsaved changes
useEffect(() => {
  if (!hasUnsavedChanges) return;

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    // Modern browsers ignore custom message, show generic warning
    return '';
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

### Crash Recovery Modal
```typescript
// On app mount, check for auto-save
function useRecoveryCheck() {
  const [recoveryData, setRecoveryData] = useState<PiPiFile | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('pipi-autosave');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (isValidPiPiFile(data)) {
          setRecoveryData(data);
        }
      } catch (e) {
        // Corrupted auto-save, clear it
        localStorage.removeItem('pipi-autosave');
      }
    }
  }, []);

  const acceptRecovery = () => { /* restore data, clear modal */ };
  const declineRecovery = () => {
    localStorage.removeItem('pipi-autosave');
    setRecoveryData(null);
  };

  return { recoveryData, acceptRecovery, declineRecovery };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FileSaver.js library | Native Blob + createObjectURL | 2020+ | No dependency needed |
| pako for compression | fflate | 2021+ | 4x smaller, faster |
| localStorage only | IndexedDB for large data | 2018+ | No 5MB limit |
| react-dropzone | Native drag/drop | Always available | Zero bundle impact |
| Custom modal dialogs | Native beforeunload | Always available | Browser-native UX |

**Deprecated/outdated:**
- **FileSaver.js:** Was popular, now unnecessary with modern browser support
- **unload event:** Being deprecated by Chrome (2025-2026), use beforeunload or visibilitychange
- **Synchronous FileReader:** Always use async readAsText, not deprecated readAsTextSync

## Open Questions

Things that couldn't be fully resolved:

1. **Compression threshold decision**
   - What we know: fflate can compress JSON by 60-80%, adds 8kB to bundle
   - What's unclear: What's the typical presentation size with images?
   - Recommendation: Start without compression, add fflate if users hit 50MB regularly

2. **IndexedDB for auto-save**
   - What we know: IndexedDB has no practical limit, localStorage is 5MB
   - What's unclear: How large are typical auto-saves with base64 images?
   - Recommendation: Start with localStorage, monitor for QuotaExceededError, migrate to IndexedDB if needed

3. **Multi-tab conflict resolution**
   - What we know: Multiple tabs can overwrite each other's auto-save
   - What's unclear: How often do users actually edit in multiple tabs?
   - Recommendation: Use BroadcastChannel (already in types.ts) to detect other tabs, warn on conflict

## Sources

### Primary (HIGH confidence)
- [MDN Blob documentation](https://developer.mozilla.org/en-US/docs/Web/API/Blob) - createObjectURL patterns
- [MDN URL.createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) - memory management
- [MDN FileReader](https://developer.mozilla.org/en-US/docs/Web/API/FileReader) - file reading API
- [MDN beforeunload event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event) - unsaved changes warning
- [MDN Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) - localStorage limits

### Secondary (MEDIUM confidence)
- [fflate GitHub](https://github.com/101arrowz/fflate) - compression library documentation
- [LogRocket debounce/throttle guide](https://www.developerway.com/posts/debouncing-in-react) - React patterns
- [Chrome deprecating unload](https://developer.chrome.com/docs/web-platform/deprecating-unload) - future compatibility

### Tertiary (LOW confidence)
- Various blog posts on file download patterns - verified against MDN
- Stack Overflow discussions on localStorage limits - verified against MDN

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All native browser APIs, well-documented
- Architecture: HIGH - Patterns derived from MDN and existing codebase
- Pitfalls: MEDIUM - Some from experience, some from community discussions

**Research date:** 2026-01-19
**Valid until:** 2026-03-19 (60 days - stable browser APIs, unlikely to change)
