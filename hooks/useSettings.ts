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
  // Note: OpenAI removed - doesn't support browser CORS
  const validProviders: AIProvider[] = ['gemini', 'claude'];
  if (!validProviders.includes(obj.provider as AIProvider)) return false;

  // Validate apiKey is a string
  if (typeof obj.apiKey !== 'string') return false;

  // Optional: selectedModel must be string if present
  if (obj.selectedModel !== undefined && typeof obj.selectedModel !== 'string') return false;

  // Optional: availableModels must be array of strings if present
  if (obj.availableModels !== undefined) {
    if (!Array.isArray(obj.availableModels)) return false;
    if (!obj.availableModels.every((m: unknown) => typeof m === 'string')) return false;
  }

  return true;
}

/**
 * Read settings from localStorage with validation.
 * Exported for use outside the hook (e.g., refresh from other components).
 */
export function readSettingsFromStorage(): Settings {
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
}

/**
 * Hook to persist application settings (provider, API key) to localStorage.
 *
 * - Loads from localStorage on mount with validation
 * - Saves on every state change
 * - Handles corrupted data gracefully by falling back to defaults
 * - Provides refreshSettings() to re-read from localStorage (useful after modal saves)
 *
 * @returns Tuple of [settings, updateSettings, refreshSettings]
 */
export function useSettings(): [Settings, (updates: Partial<Settings>) => void, () => void] {
  // Lazy initialization from localStorage
  const [settings, setSettings] = useState<Settings>(readSettingsFromStorage);

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

  // Refresh settings by re-reading from localStorage
  // Use this when another component (like SettingsModal) may have saved directly
  const refreshSettings = useCallback(() => {
    setSettings(readSettingsFromStorage());
  }, []);

  return [settings, updateSettings, refreshSettings];
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
