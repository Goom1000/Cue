import React, { useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { CohesionResult } from '../services/aiProvider';

interface CohesionPreviewProps {
  result: CohesionResult;
  onApply: () => void;
  onCancel: () => void;
  isDarkMode: boolean;
}

const CohesionPreview: React.FC<CohesionPreviewProps> = ({ result, onApply, onCancel, isDarkMode }) => {
  // Track expanded/collapsed state per slide (all expanded by default)
  const [expandedSlides, setExpandedSlides] = useState<Set<number>>(
    new Set(result.changes.map((_, i) => i))
  );

  const toggleSlide = (index: number) => {
    setExpandedSlides(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Empty state: deck is already cohesive
  if (result.changes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka mb-2">
            Already Cohesive
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Your deck is already cohesive! No changes needed.
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

  const totalSlides = result.changes.length > 0
    ? Math.max(...result.changes.map(c => c.slideIndex)) + 1
    : 0;
  // Count the total number of slides in the deck (estimated from highest index)
  const affectedCount = result.changes.length;

  const diffStyles = {
    variables: {
      light: {
        diffViewerBackground: '#ffffff',
        addedBackground: '#dcfce7',
        addedColor: '#166534',
        removedBackground: '#fee2e2',
        removedColor: '#991b1b',
        wordAddedBackground: '#bbf7d0',
        wordRemovedBackground: '#fecaca',
        addedGutterBackground: '#dcfce7',
        removedGutterBackground: '#fee2e2',
        gutterBackground: '#f8fafc',
        gutterBackgroundDark: '#f1f5f9',
        codeFoldBackground: '#f8fafc',
        codeFoldGutterBackground: '#f1f5f9',
      },
      dark: {
        diffViewerBackground: '#1e293b',
        addedBackground: '#14532d40',
        addedColor: '#86efac',
        removedBackground: '#7f1d1d40',
        removedColor: '#fca5a5',
        wordAddedBackground: '#16a34a40',
        wordRemovedBackground: '#dc262640',
        addedGutterBackground: '#14532d40',
        removedGutterBackground: '#7f1d1d40',
        gutterBackground: '#0f172a',
        gutterBackgroundDark: '#1e293b',
        codeFoldBackground: '#0f172a',
        codeFoldGutterBackground: '#1e293b',
      },
    },
    contentText: {
      fontFamily: 'inherit',
      fontSize: '0.875rem',
      lineHeight: '1.5',
    },
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka mb-3">
            Deck Cohesion Preview
          </h2>

          {/* Summary banner */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-3">
            <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">
              {result.summary}
            </p>
          </div>

          {/* Stats line */}
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{affectedCount}</span> slide{affectedCount === 1 ? '' : 's'} will be updated
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>
              Tone: <span className="font-medium text-slate-700 dark:text-slate-200">{result.toneDescription}</span>
            </span>
          </div>
        </div>

        {/* Changes list - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {result.changes.map((change, idx) => {
            const isExpanded = expandedSlides.has(idx);
            const hasTitleDiff = !!change.proposedTitle;
            const hasContentDiff = !!change.proposedContent;
            const hasNotesDiff = !!change.proposedSpeakerNotes;

            return (
              <div
                key={idx}
                className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
              >
                {/* Slide header */}
                <button
                  onClick={() => toggleSlide(idx)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold px-2 py-1 bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 rounded">
                      {change.slideIndex + 1}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate">
                      {change.originalTitle}
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium shrink-0">
                      {change.reason}
                    </span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Diff sections */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {hasTitleDiff && (
                      <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5">
                          Title
                        </div>
                        <ReactDiffViewer
                          oldValue={change.originalTitle}
                          newValue={change.proposedTitle!}
                          splitView={false}
                          useDarkTheme={isDarkMode}
                          compareMethod={DiffMethod.WORDS}
                          hideLineNumbers={true}
                          showDiffOnly={false}
                          styles={diffStyles}
                        />
                      </div>
                    )}

                    {hasContentDiff && (
                      <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5">
                          Content
                        </div>
                        <ReactDiffViewer
                          oldValue={change.originalContent.join('\n')}
                          newValue={change.proposedContent!.join('\n')}
                          splitView={false}
                          useDarkTheme={isDarkMode}
                          compareMethod={DiffMethod.WORDS}
                          hideLineNumbers={true}
                          showDiffOnly={false}
                          styles={diffStyles}
                        />
                      </div>
                    )}

                    {hasNotesDiff && (
                      <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5">
                          Speaker Notes
                        </div>
                        <ReactDiffViewer
                          oldValue={change.originalSpeakerNotes}
                          newValue={change.proposedSpeakerNotes!}
                          splitView={false}
                          useDarkTheme={isDarkMode}
                          compareMethod={DiffMethod.WORDS}
                          hideLineNumbers={true}
                          showDiffOnly={false}
                          styles={diffStyles}
                        />
                      </div>
                    )}

                    {!hasTitleDiff && !hasContentDiff && !hasNotesDiff && (
                      <p className="text-sm text-slate-400 dark:text-slate-500 italic px-2">
                        No text differences for this slide.
                      </p>
                    )}
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
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-amber-500 dark:to-orange-500 text-white dark:text-slate-900 rounded-xl font-bold text-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Apply All Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default CohesionPreview;
