import { AIProvider } from '../types';

/**
 * Result of an API key validation attempt.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Endpoint configuration for each AI provider.
 * Uses lightweight list-models endpoints that are free/cheap
 * and only require valid authentication.
 */
const VALIDATION_ENDPOINTS: Record<AIProvider, { url: string; headers: HeadersInit }> = {
  gemini: {
    // API key in URL (Google's pattern)
    url: '', // Will be constructed with key
    headers: {},
  },
  openai: {
    url: 'https://api.openai.com/v1/models',
    headers: {}, // Authorization header added dynamically
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

      case 'openai':
        // OpenAI uses Bearer token in Authorization header
        url = VALIDATION_ENDPOINTS.openai.url;
        headers = {
          Authorization: `Bearer ${apiKey}`,
        };
        break;

      case 'claude':
        // Claude uses x-api-key header with anthropic-version
        url = VALIDATION_ENDPOINTS.claude.url;
        headers = {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        };
        break;

      default:
        return { valid: false, error: `Unknown provider: ${provider}` };
    }

    const response = await fetch(url, { headers });

    if (response.ok) {
      return { valid: true };
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
