import { useState, useEffect, useCallback } from 'react';
import { Settings, DEFAULT_SETTINGS, AIProvider } from '../types';

const STORAGE_KEY = 'pipi-settings';

/**
 * Validate that parsed data has the expected Settings shape.
 * Guards against corrupted localStorage data.
 */
function isValidSettings(data: unknown): data is Settings {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  // Validate provider is one of the allowed values
  const validProviders: AIProvider[] = ['gemini', 'openai', 'claude'];
  if (!validProviders.includes(obj.provider as AIProvider)) return false;

  // Validate apiKey is a string
  if (typeof obj.apiKey !== 'string') return false;

  return true;
}

/**
 * Hook to persist application settings (provider, API key) to localStorage.
 *
 * - Loads from localStorage on mount with validation
 * - Saves on every state change
 * - Handles corrupted data gracefully by falling back to defaults
 *
 * @returns Tuple of [settings, updateSettings function]
 */
export function useSettings(): [Settings, (updates: Partial<Settings>) => void] {
  // Lazy initialization from localStorage
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate parsed data has expected shape
        if (isValidSettings(parsed)) {
          // Merge with defaults (in case schema evolved)
          return { ...DEFAULT_SETTINGS, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to parse settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  }, [settings]);

  // Update settings function (partial updates supported)
  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  return [settings, updateSettings];
}

/**
 * Clear all settings from localStorage.
 * Used in the "danger zone" feature to remove API key and reset settings.
 */
export function clearSettings(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear settings from localStorage:', e);
  }
}

// Re-export DEFAULT_SETTINGS for convenience
export { DEFAULT_SETTINGS };
