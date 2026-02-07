import React, { useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { Slide } from '../types';
import Button from './Button';

interface PasteComparisonProps {
  slide: Slide;              // The AI-improved slide (has originalPastedImage)
  onRevert: () => void;      // Revert to original image
}

const PasteComparison: React.FC<PasteComparisonProps> = ({ slide, onRevert }) => {
  const [showComparison, setShowComparison] = useState(false);
  const [showTextDiff, setShowTextDiff] = useState(false);

  // Guard: nothing to compare if no original image
  if (!slide.originalPastedImage) return null;

  // Format AI result for text diff
  const oldText = "[Image Only]\n\nNo text content extracted from original paste.";
  const newText = `Title: ${slide.title}\n\nContent:\n${slide.content.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nSpeaker Notes:\n${slide.speakerNotes}`;

  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mt-4">
      {/* Toggle button */}
      <button
        onClick={() => setShowComparison(!showComparison)}
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1.5"
      >
        <svg className={`w-4 h-4 transition-transform ${showComparison ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Compare with Original
      </button>

      {showComparison && (
        <div className="mt-4 space-y-4">
          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Original paste */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Original Paste
              </h4>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <img
                  src={slide.originalPastedImage}
                  alt="Original pasted slide"
                  className="rounded-lg max-h-48 object-contain w-full"
                />
              </div>
            </div>

            {/* Right: AI-improved content */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                AI-Improved
              </h4>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700 space-y-2">
                <p className="font-bold text-slate-800 dark:text-white text-sm">{slide.title}</p>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                  {slide.content.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
                <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                  {slide.layout || 'split'}
                </span>
                {slide.speakerNotes && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 italic line-clamp-3">
                    {slide.speakerNotes.substring(0, 100)}{slide.speakerNotes.length > 100 ? '...' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Text diff toggle */}
          <div>
            <button
              onClick={() => setShowTextDiff(!showTextDiff)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
            >
              {showTextDiff ? 'Hide' : 'Show'} Text Diff
            </button>

            {showTextDiff && (
              <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <ReactDiffViewer
                  oldValue={oldText}
                  newValue={newText}
                  splitView={false}
                  compareMethod={DiffMethod.WORDS}
                  hideLineNumbers={true}
                  useDarkTheme={isDark}
                  styles={{
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
                  }}
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onRevert} className="text-sm">
              Revert to Original Image
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasteComparison;
