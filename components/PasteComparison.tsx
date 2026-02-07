import React, { useState } from 'react';
import { Slide } from '../types';
import Button from './Button';

interface PasteComparisonProps {
  slide: Slide;
  onRevert: () => void;      // Clear AI notes, revert to basic pasted slide
}

const PasteComparison: React.FC<PasteComparisonProps> = ({ slide, onRevert }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Guard: nothing to show if no original pasted image
  if (!slide.originalPastedImage) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mt-4">
      {/* Toggle button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1.5"
      >
        <svg className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        AI Teleprompter Notes
      </button>

      {showDetails && (
        <div className="mt-4 space-y-4">
          {/* What AI extracted */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              AI extracted from pasted slide
            </p>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Title</p>
              <p className="font-semibold text-slate-800 dark:text-white text-sm">{slide.title}</p>
            </div>
            {slide.speakerNotes && (
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Teleprompter Script</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {slide.speakerNotes}
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            The original image is displayed full-screen to students. These AI notes appear only in your teleprompter.
          </p>

          {/* Action buttons */}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onRevert} className="text-sm">
              Clear AI Notes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasteComparison;
