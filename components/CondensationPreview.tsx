import React from 'react';
import { CondensationResult } from '../services/aiProvider';
import { Slide } from '../types';

interface CondensationPreviewProps {
  result: CondensationResult;
  slides: Slide[];
  onApply: () => void;
  onCancel: () => void;
  isDarkMode: boolean;
}

const ACTION_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  keep:   { label: 'Keep',         bg: 'bg-green-100 dark:bg-green-900/30',   text: 'text-green-700 dark:text-green-400',   border: 'border-l-green-500' },
  remove: { label: 'Remove',       bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-700 dark:text-red-400',       border: 'border-l-red-500' },
  merge:  { label: 'Merge Target', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-l-purple-500' },
};

const CondensationPreview: React.FC<CondensationPreviewProps> = ({ result, slides, onApply, onCancel }) => {
  // Empty state: all slides kept
  const hasChanges = result.actions.some(a => a.action !== 'keep');
  if (!hasChanges) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka mb-2">
            Already Concise
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Your deck is already concise! No changes needed.
          </p>
          <button
            onClick={onCancel}
            className="px-6 py-2.5 bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Count actions
  const counts = { keep: 0, remove: 0, merge: 0 };
  for (const a of result.actions) {
    if (a.action in counts) counts[a.action as keyof typeof counts]++;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka mb-3">
            Deck Condensation Preview
          </h2>

          {/* Summary banner */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-3">
            <p className="text-sm text-orange-700 dark:text-orange-300 leading-relaxed">
              {result.summary}
            </p>
          </div>

          {/* Stats line */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mb-3">
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {result.originalSlideCount} slides
              <span className="mx-1.5 text-slate-400 dark:text-slate-500">&rarr;</span>
              {result.proposedSlideCount} slides
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            {counts.keep > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                {counts.keep} kept
              </span>
            )}
            {counts.remove > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                {counts.remove} removed
              </span>
            )}
            {counts.merge > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                {counts.merge} merged
              </span>
            )}
          </div>

          {/* Essential topics preserved */}
          {result.essentialTopicsPreserved.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 self-center mr-1">
                Preserved:
              </span>
              {result.essentialTopicsPreserved.map((topic, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Slide list - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {result.actions.map((action) => {
            const slide = slides[action.slideIndex];
            if (!slide) return null;
            const badge = ACTION_BADGE[action.action] || ACTION_BADGE.keep;

            return (
              <div
                key={action.slideIndex}
                className={`border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden border-l-4 ${badge.border} ${
                  action.action === 'remove' ? 'opacity-75' : ''
                }`}
              >
                {/* Slide row */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold px-2 py-1 bg-slate-600 dark:bg-slate-500 text-white rounded shrink-0">
                      {action.slideIndex + 1}
                    </span>
                    <span className={`font-medium text-sm truncate ${
                      action.action === 'remove' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {slide.title}
                    </span>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium shrink-0 ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[200px] truncate hidden sm:inline">
                      {action.reason}
                    </span>
                  </div>
                </div>

                {/* Merge info: which slides are being absorbed */}
                {action.action === 'merge' && action.mergeWithSlideIndices && action.mergeWithSlideIndices.length > 0 && (
                  <div className="px-4 py-2 flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-900/10 border-t border-slate-100 dark:border-slate-800">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <span className="font-medium">
                      Absorbing slide{action.mergeWithSlideIndices.length > 1 ? 's' : ''}: {action.mergeWithSlideIndices.map(i => i + 1).join(', ')}
                    </span>
                  </div>
                )}

                {/* "Merged into" note for removed-by-merge slides (mobile) */}
                {action.action === 'remove' && action.reason.toLowerCase().startsWith('merged into') && (
                  <div className="px-4 py-1.5 text-[11px] text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10 border-t border-slate-100 dark:border-slate-800 sm:hidden">
                    {action.reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 dark:from-amber-500 dark:to-orange-500 text-white dark:text-slate-900 rounded-xl font-bold text-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Apply Condensation
          </button>
        </div>
      </div>
    </div>
  );
};

export default CondensationPreview;
