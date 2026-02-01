import { AIProvider } from '../types';

/**
 * Result of an API key validation attempt.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  models?: string[];  // Available models for the validated key
}

/**
 * Endpoint configuration for each AI provider.
 * Uses lightweight list-models endpoints that are free/cheap
 * and only require valid authentication.
 * Note: OpenAI removed - doesn't support browser CORS
 */
const VALIDATION_ENDPOINTS: Record<AIProvider, { url: string; headers: HeadersInit }> = {
  gemini: {
    // API key in URL (Google's pattern)
    url: '', // Will be constructed with key
    headers: {},
  },
  claude: {
    url: 'https://api.anthropic.com/v1/models',
    headers: {
      'anthropic-version': '2023-06-01',
    },
  },
};

/**
 * Validate an API key by making a lightweight request to the provider's
 * list-models endpoint. This is free/cheap and confirms authentication.
 *
 * @param provider The AI provider ('gemini' | 'openai' | 'claude')
 * @param apiKey The API key to validate
 * @returns Promise resolving to validation result with valid flag and optional error message
 */
export async function validateApiKey(
  provider: AIProvider,
  apiKey: string
): Promise<ValidationResult> {
  // Empty key is invalid
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'API key is required' };
  }

  try {
    let url: string;
    let headers: HeadersInit;

    switch (provider) {
      case 'gemini':
        // Gemini uses key in URL parameter
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        headers = {};
        break;

      case 'claude':
        // Claude uses x-api-key header with anthropic-version
        // MUST include browser CORS header for direct browser access
        url = VALIDATION_ENDPOINTS.claude.url;
        headers = {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        };
        break;

      default:
        return { valid: false, error: `Unknown provider: ${provider}` };
    }

    const response = await fetch(url, { headers });

    if (response.ok) {
      // Parse response to get available models
      try {
        const data = await response.json();
        let models: string[] = [];

        if (provider === 'gemini' && data.models) {
          // Gemini returns { models: [{ name: "models/gemini-2.0-flash", ... }] }
          // Filter to only include generative models that support generateContent
          models = data.models
            .filter((m: any) =>
              m.supportedGenerationMethods?.includes('generateContent') &&
              m.name?.includes('gemini')
            )
            .map((m: any) => m.name.replace('models/', ''))
            .sort((a: string, b: string) => {
              // Sort by version (higher first) then by variant
              const getVersion = (name: string) => {
                const match = name.match(/gemini-(\d+\.?\d*)/);
                return match ? parseFloat(match[1]) : 0;
              };
              const versionDiff = getVersion(b) - getVersion(a);
              if (versionDiff !== 0) return versionDiff;
              // Pro before Flash before others
              if (a.includes('pro') && !b.includes('pro')) return -1;
              if (!a.includes('pro') && b.includes('pro')) return 1;
              return a.localeCompare(b);
            });
        } else if (provider === 'claude' && data.data) {
          // Claude returns { data: [{ id: "claude-3-opus-20240229", ... }] }
          models = data.data
            .map((m: any) => m.id)
            .filter((id: string) => id.startsWith('claude'))
            .sort((a: string, b: string) => {
              // Sort by model tier (opus > sonnet > haiku)
              const getTier = (name: string) => {
                if (name.includes('opus')) return 3;
                if (name.includes('sonnet')) return 2;
                if (name.includes('haiku')) return 1;
                return 0;
              };
              return getTier(b) - getTier(a);
            });
        }

        return { valid: true, models };
      } catch {
        // If parsing fails, still valid but no models list
        return { valid: true, models: [] };
      }
    }

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Invalid API key' };
    }

    // Try to extract error message from response
    try {
      const errorData = await response.json();
      // Different providers structure errors differently
      const errorMessage =
        errorData.error?.message || // Gemini, OpenAI format
        errorData.error?.error?.message || // Nested format
        errorData.message || // Simple format
        `Request failed with status ${response.status}`;
      return { valid: false, error: errorMessage };
    } catch {
      return { valid: false, error: `Request failed with status ${response.status}` };
    }
  } catch (e) {
    // Network errors, CORS issues, etc.
    return { valid: false, error: 'Network error - check your connection' };
  }
}
