import { useEffect, useRef } from 'react';
import { Slide, StudentWithGrade } from '../types';

// ============================================================================
// Constants
// ============================================================================

const AUTOSAVE_KEY = 'pipi-autosave';
const AUTOSAVE_TIMESTAMP_KEY = 'pipi-autosave-timestamp';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

// ============================================================================
// Types
// ============================================================================

/**
 * Data structure for auto-save persistence.
 * Contains the essential presentation state for crash recovery.
 */
// NOTE: Supplementary resources excluded to prevent localStorage overflow (binary thumbnails/content)
export interface AutoSaveData {
  slides: Slide[];
  studentNames: string[];
  studentGrades?: StudentWithGrade[];
  lessonText: string;
  lessonTitle: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Validate that parsed data has the expected AutoSaveData shape.
 * Guards against corrupted localStorage data.
 */
function isValidAutoSaveData(data: unknown): data is AutoSaveData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  // Validate slides is an array
  if (!Array.isArray(obj.slides)) return false;

  // Validate studentNames is an array
  if (!Array.isArray(obj.studentNames)) return false;

  // Validate lessonText is a string
  if (typeof obj.lessonText !== 'string') return false;

  // Validate lessonTitle is a string
  if (typeof obj.lessonTitle !== 'string') return false;

  return true;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Read auto-save data from localStorage with validation.
 * Returns null if no auto-save exists or data is invalid.
 */
export function getAutoSave(): AutoSaveData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(AUTOSAVE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (isValidAutoSaveData(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse auto-save from localStorage:', e);
  }
  return null;
}

/**
 * Get the timestamp of the last auto-save.
 * Returns null if no timestamp exists.
 */
export function getAutoSaveTimestamp(): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(AUTOSAVE_TIMESTAMP_KEY);
    if (stored) {
      const timestamp = parseInt(stored, 10);
      if (!isNaN(timestamp)) {
        return timestamp;
      }
    }
  } catch (e) {
    console.warn('Failed to read auto-save timestamp:', e);
  }
  return null;
}

/**
 * Check if auto-save data exists in localStorage.
 */
export function hasAutoSave(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(AUTOSAVE_KEY) !== null;
}

/**
 * Clear auto-save data from localStorage.
 * Removes both the data and timestamp keys.
 */
export function clearAutoSave(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(AUTOSAVE_KEY);
    window.localStorage.removeItem(AUTOSAVE_TIMESTAMP_KEY);
  } catch (e) {
    console.warn('Failed to clear auto-save from localStorage:', e);
  }
}

// ============================================================================
// useAutoSave Hook
// ============================================================================

/**
 * Hook to auto-save presentation data to localStorage at regular intervals.
 *
 * Uses throttling (not debounce) to ensure regular saves even during
 * continuous editing. This protects against data loss from browser crashes
 * or unexpected closures.
 *
 * @param data - The presentation data to auto-save, or null to disable
 * @param enabled - Whether auto-save is enabled (default: true)
 *
 * @example
 * // Auto-save presentation state every 30 seconds
 * useAutoSave({
 *   slides,
 *   studentNames,
 *   lessonText,
 *   lessonTitle
 * });
 */
export function useAutoSave(data: AutoSaveData | null, enabled: boolean = true): void {
  // Track last save time for throttling
  const lastSaveTime = useRef<number>(0);

  useEffect(() => {
    // Don't save if disabled or no data
    if (!enabled || !data) return;

    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTime.current;

    // Only save if interval has passed since last save
    if (timeSinceLastSave < AUTOSAVE_INTERVAL) return;

    try {
      const json = JSON.stringify(data);
      window.localStorage.setItem(AUTOSAVE_KEY, json);
      window.localStorage.setItem(AUTOSAVE_TIMESTAMP_KEY, now.toString());
      lastSaveTime.current = now;
    } catch (e) {
      // localStorage can be full - just warn to console
      // This is not a critical error, just means auto-save failed this time
      console.warn('Auto-save failed (localStorage may be full):', e);
    }
  }, [data, enabled]);
}

export default useAutoSave;
