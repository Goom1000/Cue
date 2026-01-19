import { useState, useEffect, useCallback } from 'react';
import { SavedClass } from '../types';

export const CLASS_BANK_KEY = 'pipi-class-bank';

/**
 * Validate that parsed data has the expected SavedClass shape.
 * Guards against corrupted localStorage data.
 */
function isValidSavedClass(data: unknown): data is SavedClass {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== 'string') return false;
  if (typeof obj.name !== 'string') return false;
  if (!Array.isArray(obj.students)) return false;
  if (!obj.students.every((s: unknown) => typeof s === 'string')) return false;
  if (typeof obj.savedAt !== 'string') return false;

  return true;
}

/**
 * Read classes from localStorage with validation.
 * Returns empty array if no data or invalid data found.
 */
function readClassesFromStorage(): SavedClass[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(CLASS_BANK_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(isValidSavedClass)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse class bank from localStorage:', e);
  }
  return [];
}

/**
 * Hook to persist saved classes (student lists) to localStorage.
 *
 * - Loads from localStorage on mount with validation
 * - Saves on every state change
 * - Handles corrupted data gracefully by returning empty array
 * - Handles QuotaExceededError gracefully
 *
 * @returns Object with classes array and class management functions
 */
export function useClassBank() {
  // Lazy initialization from localStorage
  const [classes, setClasses] = useState<SavedClass[]>(readClassesFromStorage);

  // Save to localStorage whenever classes change
  useEffect(() => {
    try {
      window.localStorage.setItem(CLASS_BANK_KEY, JSON.stringify(classes));
    } catch (e) {
      // Handle QuotaExceededError
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded. Unable to save class bank.');
      } else {
        console.warn('Failed to save class bank to localStorage:', e);
      }
    }
  }, [classes]);

  /**
   * Save or update a class with the given name and students.
   * If a class with the same name exists, it will be replaced.
   * Name is trimmed before saving.
   */
  const saveClass = useCallback((name: string, students: string[]) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setClasses(prev => {
      // Check if class with same name exists
      const existingIndex = prev.findIndex(c => c.name === trimmedName);

      const newClass: SavedClass = {
        id: existingIndex >= 0 ? prev[existingIndex].id : crypto.randomUUID(),
        name: trimmedName,
        students: [...students],
        savedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        // Replace existing class
        const updated = [...prev];
        updated[existingIndex] = newClass;
        return updated;
      } else {
        // Add new class
        return [...prev, newClass];
      }
    });
  }, []);

  /**
   * Delete a class by its ID.
   */
  const deleteClass = useCallback((classId: string) => {
    setClasses(prev => prev.filter(c => c.id !== classId));
  }, []);

  /**
   * Get a class by its name (for duplicate checking).
   * Returns undefined if not found.
   */
  const getClassByName = useCallback((name: string): SavedClass | undefined => {
    const trimmedName = name.trim();
    return classes.find(c => c.name === trimmedName);
  }, [classes]);

  /**
   * Refresh classes by re-reading from localStorage.
   * Useful if another component may have modified the data.
   */
  const refreshClasses = useCallback(() => {
    setClasses(readClassesFromStorage());
  }, []);

  return {
    classes,
    saveClass,
    deleteClass,
    getClassByName,
    refreshClasses,
  };
}
