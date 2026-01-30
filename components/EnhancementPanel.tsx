import React, { useState, useRef, useReducer } from 'react';
import {
  UploadedResource,
  DocumentAnalysis,
  EnhancementResult,
  Slide,
  SlideMatch,
  DifferentiatedVersion,
  EnhancedElement,
  AnswerKeyItem,
  EditState,
  EditAction
} from '../types';
import { AIProviderInterface } from '../services/aiProvider';
import {
  enhanceUploadedDocument,
  getDefaultEnhancementOptions,
  EnhancementState
} from '../services/documentEnhancement/documentEnhancementService';
import Button from './Button';

interface EnhancementPanelProps {
  resource: UploadedResource;
  analysis: DocumentAnalysis;
  slides: Slide[];
  provider: AIProviderInterface;
  onError: (title: string, message: string) => void;
}

type DifferentiationLevel = 'simple' | 'standard' | 'detailed';

const initialEditState: EditState = {
  edits: {
    simple: new Map(),
    standard: new Map(),
    detailed: new Map()
  }
};

function editReducer(state: EditState, action: EditAction): EditState {
  switch (action.type) {
    case 'EDIT_ELEMENT': {
      const newEdits = { ...state.edits };
      newEdits[action.level] = new Map(state.edits[action.level]);
      newEdits[action.level].set(action.position, action.content);
      return { edits: newEdits };
    }
    case 'REVERT_ELEMENT': {
      const newEdits = { ...state.edits };
      newEdits[action.level] = new Map(state.edits[action.level]);
      newEdits[action.level].delete(action.position);
      return { edits: newEdits };
    }
    case 'DISCARD_ALL':
      return initialEditState;
    default:
      return state;
  }
}

const EnhancementPanel: React.FC<EnhancementPanelProps> = ({
  resource,
  analysis,
  slides,
  provider,
  onError
}) => {
  // State management
  const [enhancementState, setEnhancementState] = useState<EnhancementState>({ status: 'idle' });
  const [result, setResult] = useState<EnhancementResult | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<DifferentiationLevel>('standard');
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editState, dispatch] = useReducer(editReducer, initialEditState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleEnhance = async () => {
    abortControllerRef.current = new AbortController();
    setResult(null); // Clear previous result
    try {
      const enhancementResult = await enhanceUploadedDocument(
        resource,
        analysis,
        slides,
        provider,
        getDefaultEnhancementOptions(),
        abortControllerRef.current.signal,
        setEnhancementState
      );
      setResult(enhancementResult);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Cancellation handled by onProgress callback
        return;
      }
      // Error state handled by onProgress callback
      onError('Enhancement Failed', (error as Error).message);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setEnhancementState({ status: 'cancelled' });
  };

  const handleTryAgain = () => {
    setEnhancementState({ status: 'idle' });
    setResult(null);
  };

  // Render relevance badge
  const renderRelevanceBadge = (relevance: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${colors[relevance]}`}>
        {relevance}
      </span>
    );
  };

  // Render a single enhanced element
  const renderElement = (element: EnhancedElement, index: number) => {
    const baseClasses = 'mb-4';

    switch (element.type) {
      case 'header':
        return (
          <h2 key={index} className={`${baseClasses} text-xl font-bold text-slate-800 dark:text-white font-fredoka`}>
            {element.enhancedContent}
            {element.slideReference && (
              <span className="ml-2 text-sm font-normal text-indigo-500 dark:text-indigo-400">
                ({element.slideReference})
              </span>
            )}
          </h2>
        );

      case 'subheader':
        return (
          <h3 key={index} className={`${baseClasses} text-lg font-semibold text-slate-700 dark:text-slate-200`}>
            {element.enhancedContent}
          </h3>
        );

      case 'paragraph':
      case 'instruction':
        return (
          <p key={index} className={`${baseClasses} text-slate-600 dark:text-slate-300 leading-relaxed`}>
            {element.enhancedContent}
            {element.slideReference && (
              <span className="ml-1 text-indigo-500 dark:text-indigo-400 text-sm">
                ({element.slideReference})
              </span>
            )}
          </p>
        );

      case 'question':
        return (
          <div key={index} className={`${baseClasses} pl-4 border-l-4 border-pink-400 dark:border-pink-600 bg-pink-50 dark:bg-pink-900/20 p-3 rounded-r-lg`}>
            <p className="text-slate-700 dark:text-slate-200 font-medium">{element.enhancedContent}</p>
            {element.slideReference && (
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">{element.slideReference}</p>
            )}
          </div>
        );

      case 'list':
        return (
          <ul key={index} className={`${baseClasses} list-disc pl-6 space-y-1 text-slate-600 dark:text-slate-300`}>
            {element.children?.map((item, i) => (
              <li key={i}>{item}</li>
            )) || <li>{element.enhancedContent}</li>}
          </ul>
        );

      case 'table':
        if (element.tableData) {
          return (
            <div key={index} className={`${baseClasses} overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700`}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    {element.tableData.headers.map((header, i) => (
                      <th key={i} className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {element.tableData.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={index} className={`${baseClasses} text-slate-500 italic`}>
            [Table: {element.enhancedContent}]
          </p>
        );

      case 'diagram':
      case 'image':
        return (
          <div key={index} className={`${baseClasses} p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-center`}>
            <p className="text-slate-500 dark:text-slate-400 italic">
              [Original {element.type}: {element.enhancedContent}]
            </p>
            {element.visualContent && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Visual content preserved from original
              </p>
            )}
          </div>
        );

      case 'blank-space':
        return (
          <div key={index} className={`${baseClasses} h-8 border-b-2 border-dotted border-slate-300 dark:border-slate-600`} />
        );

      case 'answer':
        return (
          <div key={index} className={`${baseClasses} pl-4 border-l-4 border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-r-lg`}>
            <p className="text-slate-700 dark:text-slate-200">{element.enhancedContent}</p>
          </div>
        );

      default:
        return (
          <p key={index} className={`${baseClasses} text-slate-600 dark:text-slate-300`}>
            {element.enhancedContent}
          </p>
        );
    }
  };

  // Render answer key item
  const renderAnswerKeyItem = (item: AnswerKeyItem, index: number) => {
    return (
      <div key={index} className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{item.questionRef}</p>
        {item.type === 'closed' && item.answer && (
          <p className="text-green-600 dark:text-green-400">
            <span className="font-medium">Answer:</span> {item.answer}
          </p>
        )}
        {item.type === 'open-ended' && item.rubric && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Marking Criteria:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {item.rubric.criteria.map((criterion, i) => (
                <li key={i}>{criterion}</li>
              ))}
            </ul>
            {item.rubric.exemplar && (
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Example Answer:</p>
                <p className="text-sm text-green-600 dark:text-green-400">{item.rubric.exemplar}</p>
              </div>
            )}
            {item.rubric.commonMistakes && item.rubric.commonMistakes.length > 0 && (
              <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Watch for:</p>
                <ul className="list-disc pl-4 text-sm text-amber-600 dark:text-amber-400">
                  {item.rubric.commonMistakes.map((mistake, i) => (
                    <li key={i}>{mistake}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Configuration Section (idle state)
  if (enhancementState.status === 'idle') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka mb-3">
            Enhance this resource
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            <span className="font-medium text-slate-700 dark:text-slate-200">{resource.filename}</span> will be enhanced with three differentiation levels aligned to your slides.
          </p>
          <div className="space-y-3">
            <Button onClick={handleEnhance} className="w-full">
              Enhance Resource
            </Button>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Creates Simple, Standard, and Detailed versions plus answer key
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Progress Section (enhancing state)
  if (enhancementState.status === 'enhancing' || enhancementState.status === 'analyzing') {
    const progress = enhancementState.progress;
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="max-w-md w-full">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka mb-3">
            Generating enhanced versions...
          </h2>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(progress, 10)}%` }}
            />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Creating three differentiation levels aligned to your slides...
          </p>
          <Button variant="secondary" onClick={handleCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Error Section
  if (enhancementState.status === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka mb-3">
            Enhancement failed
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {enhancementState.error}
          </p>
          <Button onClick={handleTryAgain} className="w-full">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Cancelled Section
  if (enhancementState.status === 'cancelled') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka mb-3">
            Enhancement cancelled
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            The enhancement process was stopped.
          </p>
          <Button onClick={handleTryAgain} className="w-full">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Results Section (complete state)
  if (enhancementState.status === 'complete' && result) {
    const selectedVersion = result.versions[selectedLevel];
    const answerKeys = result.answerKeys;

    // Get answer key items for current level or unified
    const getAnswerKeyItems = () => {
      if (answerKeys.structure === 'unified') {
        return answerKeys.keys[0]?.items || [];
      }
      const levelKey = answerKeys.keys.find(k => k.level === selectedLevel);
      return levelKey?.items || answerKeys.keys[0]?.items || [];
    };

    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header with matched slides */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white font-fredoka mb-3">
            Enhanced: {resource.filename}
          </h2>

          {/* Matched Slides */}
          {result.slideMatches.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Matched Slides
              </p>
              <div className="flex flex-wrap gap-2">
                {result.slideMatches.map((match: SlideMatch, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">
                      Slide {match.slideIndex + 1}: {match.slideTitle}
                    </span>
                    {renderRelevanceBadge(match.relevanceScore)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Differentiation Tabs */}
          <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
            {(['simple', 'standard', 'detailed'] as DifferentiationLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedLevel === level
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>

          {/* Slide alignment note for selected level */}
          <p className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            {selectedVersion.slideAlignmentNote}
          </p>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Version title */}
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white font-fredoka mb-6">
              {selectedVersion.title}
            </h1>

            {/* Elements */}
            <div className="space-y-2">
              {selectedVersion.elements.map((element, index) =>
                renderElement(element, index)
              )}
            </div>

            {/* Answer Key Section */}
            {answerKeys.keys.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setShowAnswerKey(!showAnswerKey)}
                  className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${showAnswerKey ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {showAnswerKey ? 'Hide Answer Key' : 'Show Answer Key'}
                </button>

                {showAnswerKey && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-300 font-fredoka mb-4">
                      Answer Key
                      {answerKeys.structure === 'per-level' && (
                        <span className="ml-2 text-sm font-normal">({selectedLevel})</span>
                      )}
                    </h3>
                    <div className="space-y-1">
                      {getAnswerKeyItems().map((item, index) =>
                        renderAnswerKeyItem(item, index)
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Regenerate button */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <Button variant="secondary" onClick={handleEnhance} className="w-full">
            Regenerate Enhancement
          </Button>
        </div>
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  return null;
};

export default EnhancementPanel;
