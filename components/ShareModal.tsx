import React, { useState, useEffect } from 'react';
import { Slide } from '../types';
import { AIProviderInterface, AIProviderError, ColleagueTransformationResult, VerbosityLevel } from '../services/aiProvider';
import { exportScriptPptx } from '../services/pptxService';
import { exportScriptPdf } from '../services/pdfService';

// ============================================================================
// Types
// ============================================================================

interface ShareModalProps {
  slides: Slide[];
  lessonTitle: string;
  deckVerbosity: VerbosityLevel;
  gradeLevel: string;
  provider: AIProviderInterface;
  onClose: () => void;
  addToast: (message: string, duration?: number, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

type SharePhase = 'transforming' | 'preview' | 'exporting' | 'error';

// ============================================================================
// ShareModal Component
// ============================================================================

/**
 * Modal for sharing a script-version PPTX with a colleague.
 *
 * Workflow:
 * 1. Auto-triggers AI transformation on mount (transforming phase)
 * 2. Shows scrollable preview grid of transformed slides (preview phase)
 * 3. Exports to PPTX on download click (exporting phase)
 * 4. Handles errors with clear messaging (error phase)
 *
 * Follows existing modal chrome pattern (ExportModal, ClassBankSaveModal).
 */
const ShareModal: React.FC<ShareModalProps> = ({
  slides,
  lessonTitle,
  deckVerbosity,
  gradeLevel,
  provider,
  onClose,
  addToast,
}) => {
  const [phase, setPhase] = useState<SharePhase>('transforming');
  const [transformResult, setTransformResult] = useState<ColleagueTransformationResult | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'pptx' | 'pdf'>('pptx');

  // Auto-trigger transformation on mount
  useEffect(() => {
    let cancelled = false;

    const runTransformation = async () => {
      try {
        const result = await provider.transformForColleague(
          slides,
          deckVerbosity,
          gradeLevel,
          (p) => { if (!cancelled) setProgress(p); }
        );

        if (cancelled) return;

        if (result.slides.length === 0) {
          setPhase('error');
          setErrorMessage('No slides have teleprompter scripts to transform. Generate speaker notes first.');
          return;
        }

        setTransformResult(result);
        setPhase('preview');
      } catch (error) {
        if (cancelled) return;

        const message = error instanceof AIProviderError
          ? error.userMessage
          : 'Transformation failed. Please try again.';

        setPhase('error');
        setErrorMessage(message);
        addToast(message, 5000, 'error');
      }
    };

    runTransformation();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key to close (disabled during exporting)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'exporting') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, phase]);

  // Handle PPTX/PDF download
  const handleDownload = () => {
    if (!transformResult) return;

    setPhase('exporting');

    // Use setTimeout to let the exporting UI render before the export call
    setTimeout(async () => {
      try {
        if (selectedFormat === 'pptx') {
          exportScriptPptx(slides, transformResult, lessonTitle);
        } else {
          await exportScriptPdf(slides, transformResult, lessonTitle);
        }
        addToast(`Script version downloaded as ${selectedFormat.toUpperCase()}!`, 3000, 'success');
        onClose();
      } catch (error) {
        console.error('[ShareModal] Export failed:', error);
        addToast('Export failed. Please try again.', 5000, 'error');
        setPhase('preview');
      }
    }, 50);
  };

  // ============================================================================
  // Render helpers
  // ============================================================================

  const renderTransforming = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-12 h-12 border-4 border-indigo-600 dark:border-amber-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="text-lg font-bold text-slate-700 dark:text-white">
        {!progress
          ? 'Preparing transformation...'
          : progress.total <= 20
            ? `Transforming ${progress.total} slides...`
            : `Transforming slides ${progress.current} of ${progress.total}...`
        }
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
        Creating colleague-friendly talking points
      </p>
    </div>
  );

  const renderPreview = () => {
    if (!transformResult) return null;

    const { slides: transformed, skippedCount } = transformResult;

    return (
      <div>
        {/* Summary line */}
        <div className="mb-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-bold">{transformed.length} slides transformed</span>
            {skippedCount > 0 && (
              <span className="text-slate-400 dark:text-slate-500">
                , {skippedCount} skipped (no script content)
              </span>
            )}
          </p>
        </div>

        {/* Preview grid */}
        <div className="grid grid-cols-2 gap-4">
          {transformed.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 relative"
            >
              {/* Slide number badge */}
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg">
                {item.slideIndex + 1}
              </div>

              {/* Title */}
              <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-2 pr-8">
                {item.originalTitle}
              </h4>

              {/* Expanded bullets */}
              <ul className="list-disc pl-5 space-y-1">
                {item.expandedBullets.map((bullet, bIdx) => (
                  <li
                    key={bIdx}
                    className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                  >
                    {bullet.replace(/\*\*/g, '')}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderExporting = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-12 h-12 border-4 border-indigo-600 dark:border-amber-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="text-lg font-bold text-slate-700 dark:text-white">
        {selectedFormat === 'pptx' ? 'Generating PowerPoint...' : 'Generating PDF...'}
      </p>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-lg font-bold text-slate-700 dark:text-white mb-2">
        Transformation Error
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
        {errorMessage}
      </p>
    </div>
  );

  // ============================================================================
  // Footer buttons by phase
  // ============================================================================

  const renderFooter = () => {
    switch (phase) {
      case 'transforming':
        return (
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        );

      case 'preview':
        return (
          <div className="flex items-center justify-between w-full">
            {/* Format selector */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedFormat('pptx')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedFormat === 'pptx'
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-600 dark:border-indigo-500'
                    : 'text-slate-500 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                PowerPoint (.pptx)
              </button>
              <button
                onClick={() => setSelectedFormat('pdf')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedFormat === 'pdf'
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-600 dark:border-indigo-500'
                    : 'text-slate-500 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                PDF (.pdf)
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 dark:hover:bg-amber-600 transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        );

      case 'exporting':
        return (
          <button
            disabled
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed"
          >
            Exporting...
          </button>
        );

      case 'error':
        return (
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 dark:hover:bg-amber-600 transition-colors"
          >
            Close
          </button>
        );
    }
  };

  // ============================================================================
  // Main render
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-6 pb-0 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka">
                Share with Colleague
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Transform your teleprompter scripts into deliverable talking points
              </p>
            </div>
          </div>

          {/* Close button (disabled during exporting only) */}
          <button
            onClick={onClose}
            disabled={phase === 'exporting'}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {phase === 'transforming' && renderTransforming()}
          {phase === 'preview' && renderPreview()}
          {phase === 'exporting' && renderExporting()}
          {phase === 'error' && renderError()}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex items-center justify-end border-t border-slate-200 dark:border-slate-700 mt-auto">
          <div className="pt-4 w-full flex justify-end">
            {renderFooter()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
