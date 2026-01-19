import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

interface ClassBankSaveModalProps {
  /** Callback when user saves with a class name */
  onSave: (name: string) => void;
  /** Callback when user cancels/closes the modal */
  onClose: () => void;
  /** Existing class names for duplicate detection */
  existingNames: string[];
}

// ============================================================================
// ClassBankSaveModal Component
// ============================================================================

/**
 * Modal for naming and saving a class to the class bank.
 *
 * Features:
 * - Auto-focus on name input
 * - Save button disabled for empty/whitespace names
 * - Duplicate name detection with confirmation prompt
 * - Escape key closes modal
 * - Enter key triggers save
 *
 * Follows existing modal patterns (RecoveryModal, SettingsModal):
 * - Fixed overlay with dark backdrop
 * - Centered modal card with rounded corners
 * - Dark mode support
 */
const ClassBankSaveModal: React.FC<ClassBankSaveModalProps> = ({
  onSave,
  onClose,
  existingNames,
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const trimmedName = name.trim();
  const isValidName = trimmedName.length > 0;
  const isDuplicate = existingNames.includes(trimmedName);

  const handleSave = () => {
    if (!isValidName) return;

    if (isDuplicate) {
      const confirmed = window.confirm(
        'A class with this name exists. Replace it?'
      );
      if (!confirmed) return;
    }

    onSave(trimmedName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValidName) {
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka">
            Save Class
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Give your class list a name to save it
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-bold mb-2 block">
              Class Name
            </span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Period 1 Math"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </label>
          {isDuplicate && isValidName && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              A class with this name already exists and will be replaced.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex flex-col gap-3">
          <button
            onClick={handleSave}
            disabled={!isValidName}
            className="w-full px-5 py-3 bg-indigo-600 dark:bg-amber-500 hover:bg-indigo-700 dark:hover:bg-amber-400 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white dark:text-slate-900 dark:disabled:text-slate-500 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
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
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            Save Class
          </button>
          <button
            onClick={onClose}
            className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassBankSaveModal;
