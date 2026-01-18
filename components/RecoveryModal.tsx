import React from 'react';

// ============================================================================
// Types
// ============================================================================

interface RecoveryModalProps {
  /** Title of the saved presentation (from recovered data) */
  savedTitle: string;
  /** Timestamp when data was last auto-saved (Unix ms) */
  savedTimestamp: number;
  /** Callback when user chooses to restore the saved data */
  onRestore: () => void;
  /** Callback when user chooses to discard and start fresh */
  onDiscard: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a timestamp as a relative time string.
 * - < 1 min: "just now"
 * - < 60 min: "X minutes ago"
 * - >= 60 min: "X hours ago"
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
}

// ============================================================================
// RecoveryModal Component
// ============================================================================

/**
 * Modal displayed on app load when auto-save data exists.
 * Prompts user to restore their previous work or start fresh.
 *
 * Follows existing modal patterns (EnableAIModal, SettingsModal):
 * - Fixed overlay with dark backdrop
 * - Centered modal card with rounded corners
 * - Primary/secondary button actions
 * - Dark mode support
 */
const RecoveryModal: React.FC<RecoveryModalProps> = ({
  savedTitle,
  savedTimestamp,
  onRestore,
  onDiscard,
}) => {
  const relativeTime = formatRelativeTime(savedTimestamp);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka">
            Recover Unsaved Work?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Last auto-saved {relativeTime}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-bold mb-1">
              Presentation
            </p>
            <p className="text-slate-800 dark:text-white font-medium truncate">
              {savedTitle || 'Untitled Presentation'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex flex-col gap-3">
          <button
            onClick={onRestore}
            className="w-full px-5 py-3 bg-indigo-600 dark:bg-amber-500 hover:bg-indigo-700 dark:hover:bg-amber-400 text-white dark:text-slate-900 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Restore
          </button>
          <button
            onClick={onDiscard}
            className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm transition-colors"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecoveryModal;
