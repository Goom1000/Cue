import React, { useState, useEffect, useRef } from 'react';
import { AIProvider, DEFAULT_SETTINGS } from '../types';
import { useSettings, clearSettings } from '../hooks/useSettings';
import { validateApiKey, ValidationResult } from '../services/apiValidation';
import { InfoTooltip } from './InfoTooltip';

interface SettingsModalProps {
  onClose: () => void;
  autoFocusApiKey?: boolean;
}

type TestStatus =
  | { state: 'idle' }
  | { state: 'testing' }
  | { state: 'success' }
  | { state: 'error'; message: string };

// Setup instructions per provider
// Note: OpenAI removed - doesn't support browser CORS
const PROVIDER_INSTRUCTIONS: Record<AIProvider, { steps: string[]; cost: string; buttonText: string; url: string }> = {
  gemini: {
    steps: [
      'Go to Google AI Studio',
      'Click "Get API Key"',
      'Create or copy existing key',
    ],
    cost: 'Free tier (15 req/min), paid ~$0.075/1M tokens',
    buttonText: 'Open Google AI Studio',
    url: 'https://aistudio.google.com/app/apikey',
  },
  claude: {
    steps: [
      'Go to console.anthropic.com',
      'Navigate to API Keys',
      'Create new key',
    ],
    cost: '~$0.25/1M tokens, requires $5 credit',
    buttonText: 'Open Anthropic Console',
    url: 'https://console.anthropic.com/settings/keys',
  },
};

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, autoFocusApiKey = false }) => {
  // Hook for persisted settings
  const [savedSettings, updateSettings] = useSettings();

  // Ref for auto-focus API key input
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

  // Local form state
  const [provider, setProvider] = useState<AIProvider>(savedSettings.provider);
  const [apiKey, setApiKey] = useState(savedSettings.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Test status state
  const [testStatus, setTestStatus] = useState<TestStatus>({ state: 'idle' });

  // Track if test has passed (for Save button enable)
  const [testPassed, setTestPassed] = useState(false);

  // Accordion state
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);

  // Provider switch warning state
  const [pendingProvider, setPendingProvider] = useState<AIProvider | null>(null);


  // Load initial values when modal opens
  useEffect(() => {
    setProvider(savedSettings.provider);
    setApiKey(savedSettings.apiKey);
    // If there's already a saved key, consider it tested
    if (savedSettings.apiKey) {
      setTestPassed(true);
    }
  }, [savedSettings]);

  // Auto-focus API key input when opened from EnableAIModal
  useEffect(() => {
    if (autoFocusApiKey && apiKeyInputRef.current) {
      // Small delay ensures modal animation completes
      setTimeout(() => {
        apiKeyInputRef.current?.focus();
      }, 100);
    }
  }, [autoFocusApiKey]);

  // Intercept provider change to show warning if key exists
  const handleProviderChange = (newProvider: AIProvider) => {
    if (newProvider !== provider && apiKey) {
      // User has existing key - show warning modal
      setPendingProvider(newProvider);
    } else {
      // No existing key or same provider - just change
      setProvider(newProvider);
      setApiKey('');
      setTestStatus({ state: 'idle' });
      setTestPassed(false);
    }
  };

  // Confirm provider switch after warning
  const confirmProviderSwitch = () => {
    if (pendingProvider) {
      setProvider(pendingProvider);
      setApiKey('');
      setTestStatus({ state: 'idle' });
      setTestPassed(false);
      setPendingProvider(null);
    }
  };

  // Reset test status when key changes
  const handleKeyChange = (newKey: string) => {
    setApiKey(newKey);
    setTestStatus({ state: 'idle' });
    setTestPassed(false);
  };

  // Test connection handler
  const handleTestConnection = async () => {
    setTestStatus({ state: 'testing' });

    const result: ValidationResult = await validateApiKey(provider, apiKey);

    if (result.valid) {
      setTestStatus({ state: 'success' });
      setTestPassed(true);
    } else {
      setTestStatus({ state: 'error', message: result.error || 'Validation failed' });
      setTestPassed(false);
    }
  };

  // Save handler
  const handleSave = () => {
    // Save directly to localStorage before closing to avoid race condition
    // (useEffect won't run if component unmounts immediately)
    try {
      window.localStorage.setItem('pipi-settings', JSON.stringify({ provider, apiKey }));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
    updateSettings({ provider, apiKey });
    onClose();
  };

  // Cancel handler
  const handleCancel = () => {
    onClose();
  };

  // Clear data handler
  const handleClearData = () => {
    clearSettings();
    setProvider(DEFAULT_SETTINGS.provider);
    setApiKey(DEFAULT_SETTINGS.apiKey);
    setTestStatus({ state: 'idle' });
    setTestPassed(false);
    setConfirmText('');
  };

  const instructions = PROVIDER_INSTRUCTIONS[provider];
  const canSave = testPassed && apiKey.trim() !== '';
  const canClear = confirmText.toLowerCase() === 'delete';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Provider Selection Section */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              AI Provider
              <InfoTooltip content="Gemini is recommended for best results. Claude offers an alternative if you have an Anthropic API key." />
            </label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-amber-500 transition-colors"
            >
              <option value="gemini">Gemini</option>
              <option value="claude">Claude</option>
            </select>
          </div>

          {/* API Key Section */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                ref={apiKeyInputRef}
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-12 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-amber-500 transition-colors font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Test Connection Button */}
            <button
              onClick={handleTestConnection}
              disabled={testStatus.state === 'testing' || !apiKey.trim()}
              className="mt-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
            >
              {testStatus.state === 'testing' ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  Testing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test Connection
                </>
              )}
            </button>

            {/* Status Feedback */}
            {testStatus.state === 'success' && (
              <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                API key is valid
              </div>
            )}
            {testStatus.state === 'error' && (
              <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {testStatus.message}
              </div>
            )}
          </div>

          {/* Setup Instructions Accordion */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setInstructionsExpanded(!instructionsExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                How to get an API key
              </span>
              <svg
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  instructionsExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                instructionsExpanded ? 'max-h-[500px]' : 'max-h-0'
              }`}
            >
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  {instructions.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
                <p className="text-xs text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
                  <span className="font-bold">Cost:</span> {instructions.cost}
                </p>
                <a
                  href={instructions.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-amber-500 hover:bg-indigo-700 dark:hover:bg-amber-400 text-white dark:text-slate-900 rounded-xl font-bold text-sm transition-colors"
                >
                  {instructions.buttonText}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Danger Zone Section */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6">
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-3">Clear All Data</h3>
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-3">
              This will remove your API key and reset settings. Type "delete" to confirm.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Type "delete" to confirm'
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              />
              <button
                onClick={handleClearData}
                disabled={!canClear}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Your API key is stored locally in your browser only
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="px-5 py-2 bg-indigo-600 dark:bg-amber-500 hover:bg-indigo-700 dark:hover:bg-amber-400 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white dark:text-slate-900 rounded-xl font-bold text-sm transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Provider Switch Warning Modal */}
        {pendingProvider && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                Switch to {pendingProvider === 'gemini' ? 'Gemini' : 'Claude'}?
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                Switching providers will clear your current API key. You'll need to enter a new key for {pendingProvider === 'gemini' ? 'Google' : 'Anthropic'}.
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-6">
                Note: Different AI providers may generate slightly different content for the same lesson.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setPendingProvider(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:underline"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmProviderSwitch}
                  className="px-4 py-2 bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 rounded-lg font-medium hover:opacity-90"
                >
                  Switch Provider
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SettingsModal;
