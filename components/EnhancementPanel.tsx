import React, { useState, useRef, useReducer, useEffect, useCallback } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
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
import { exportEnhancedResource, ExportProgress } from '../services/exportService';
import Button from './Button';

interface EnhancementPanelProps {
  resource: UploadedResource;
  analysis: DocumentAnalysis;
  slides: Slide[];
  provider: AIProviderInterface;
  onError: (title: string, message: string) => void;
  // Optional callback to notify parent of state changes for persistence
  onStateChange?: (state: { result: EnhancementResult | null; editState: EditState }) => void;
  // Optional initial state for restoring from saved data
  initialResult?: EnhancementResult;
  initialEditState?: EditState;
}

type DifferentiationLevel = 'simple' | 'standard' | 'detailed';

const defaultEditState: EditState = {
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
      return defaultEditState;
    default:
      return state;
  }
}

const EnhancementPanel: React.FC<EnhancementPanelProps> = ({
  resource,
  analysis,
  slides,
  provider,
  onError,
  onStateChange,
  initialResult,
  initialEditState: initialEditStateProp
}) => {
  // State management - use initial values if provided (for restoration from saved data)
  const [enhancementState, setEnhancementState] = useState<EnhancementState>(
    initialResult ? { status: 'complete' } : { status: 'idle' }
  );
  const [result, setResult] = useState<EnhancementResult | null>(initialResult ?? null);
  const [selectedLevel, setSelectedLevel] = useState<DifferentiationLevel>('standard');
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [regeneratingPosition, setRegeneratingPosition] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [editState, dispatch] = useReducer(editReducer, initialEditStateProp ?? defaultEditState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Store onStateChange in a ref to avoid triggering useEffect when callback identity changes
  // This is a React pattern for stable callbacks that shouldn't cause re-renders
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  // When entering diff mode, exit edit mode (mutually exclusive)
  useEffect(() => {
    if (showDiff && isEditMode) {
      setIsEditMode(false);
    }
  }, [showDiff, isEditMode]);

  // Notify parent of state changes for persistence
  // Uses ref to avoid infinite loop: onStateChange changes identity on parent re-render,
  // but we only want to fire this effect when result or editState actually change.
  useEffect(() => {
    if (onStateChangeRef.current) {
      onStateChangeRef.current({ result, editState });
    }
  }, [result, editState]);

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

  const handleExport = async () => {
    if (!result) return;

    setIsExporting(true);
    setExportProgress(null);

    try {
      await exportEnhancedResource(
        result,
        editState,
        analysis.title || resource.filename,
        setExportProgress
      );
    } catch (error) {
      onError('Export Failed', (error as Error).message);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const hasAnyEdits = () => {
    return editState.edits.simple.size > 0 ||
           editState.edits.standard.size > 0 ||
           editState.edits.detailed.size > 0;
  };

  const regenerateElement = async (element: EnhancedElement) => {
    if (regeneratingPosition !== null) return; // Already regenerating

    setRegeneratingPosition(element.position);

    try {
      // Build a focused prompt for single element regeneration
      const elementPrompt = `Regenerate ONLY this single ${element.type} element for the ${selectedLevel.toUpperCase()} differentiation level.

ORIGINAL CONTENT:
${element.originalContent}

CURRENT ENHANCED CONTENT:
${element.enhancedContent}

CONTEXT: This is from a ${analysis.documentType} at grade level ${slides.length > 0 ? 'aligned to lesson slides' : 'standalone'}.

DIFFERENTIATION LEVEL: ${selectedLevel}
${selectedLevel === 'simple' ? '- Shorter sentences (max 15 words)\n- Year 4 vocabulary (ages 8-9)\n- Clear, concrete language' : ''}
${selectedLevel === 'standard' ? '- Clear formatting\n- Year 6 vocabulary (ages 10-11)\n- Echo slide terminology' : ''}
${selectedLevel === 'detailed' ? '- Add depth and reasoning prompts\n- Year 7-8 vocabulary (ages 11-13)\n- Include scaffolding hints' : ''}

RULES:
- Preserve all factual information
- Keep the same element type (${element.type})
- Return ONLY the regenerated content text, nothing else
- Do NOT include element type labels or formatting markers

Regenerate the content now:`;

      // Use the provider directly for a quick single-element call
      const response = await provider.generateSlides(
        elementPrompt,
        undefined, // No abort signal for quick calls
        undefined  // No progress callback
      );

      // Extract the regenerated content from response
      // The response will be raw text since we asked for just the content
      const regeneratedContent = response.slides?.[0]?.content?.[0] ||
                                response.slides?.[0]?.speakerNotes ||
                                element.enhancedContent;

      // Clean up the response (remove any accidental markers)
      const cleanContent = regeneratedContent
        .replace(/^(HEADER|PARAGRAPH|QUESTION|INSTRUCTION|SUBHEADER|ANSWER|LIST):?\s*/i, '')
        .trim();

      // Update the result with regenerated content
      if (result) {
        const updatedResult = { ...result };
        const levelVersion = updatedResult.versions[selectedLevel];
        const elementIndex = levelVersion.elements.findIndex(e => e.position === element.position);

        if (elementIndex !== -1) {
          levelVersion.elements[elementIndex] = {
            ...levelVersion.elements[elementIndex],
            enhancedContent: cleanContent
          };
          setResult(updatedResult);
        }
      }

      // Clear any edit for this element since we have fresh AI content
      dispatch({ type: 'REVERT_ELEMENT', level: selectedLevel, position: element.position });

    } catch (error) {
      onError('Regeneration Failed', `Could not regenerate element: ${(error as Error).message}`);
    } finally {
      setRegeneratingPosition(null);
    }
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

  // Render element with diff view (showing original vs enhanced)
  const renderElementWithDiff = (element: EnhancedElement, index: number) => {
    const baseClasses = 'mb-4';

    // Non-text elements don't need diff view
    if (['diagram', 'image', 'blank-space'].includes(element.type)) {
      return renderElement(element, index);
    }

    // Tables - show simple text comparison for now
    if (element.type === 'table') {
      return renderElement(element, index);
    }

    // Get content to compare
    const originalContent = element.originalContent;
    const enhancedContent = editState.edits[selectedLevel].get(element.position) ?? element.enhancedContent;

    // If no changes, show normal element
    if (originalContent === enhancedContent) {
      return (
        <div key={index} className={`${baseClasses} text-slate-500 dark:text-slate-400 italic`}>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded mr-2">Unchanged</span>
          {enhancedContent}
        </div>
      );
    }

    // For lists, join children for comparison
    const originalText = element.type === 'list' && element.children
      ? element.children.join('\n')
      : originalContent;
    const enhancedText = element.type === 'list'
      ? (editState.edits[selectedLevel].get(element.position) ?? element.children?.join('\n') ?? element.enhancedContent)
      : enhancedContent;

    return (
      <div key={index} className={`${baseClasses} rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700`}>
        <div className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1 font-medium text-slate-600 dark:text-slate-400 capitalize">
          {element.type}
          {element.slideReference && (
            <span className="ml-2 text-indigo-500 dark:text-indigo-400">({element.slideReference})</span>
          )}
        </div>
        <ReactDiffViewer
          oldValue={originalText}
          newValue={enhancedText}
          splitView={false}
          compareMethod={DiffMethod.WORDS}
          hideLineNumbers={true}
          showDiffOnly={false}
          useDarkTheme={document.documentElement.classList.contains('dark')}
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
    );
  };

  // Render a single enhanced element
  const renderElement = (element: EnhancedElement, index: number) => {
    const baseClasses = 'mb-4';
    const editedContent = editState.edits[selectedLevel].get(element.position);
    const displayContent = editedContent ?? element.enhancedContent;
    const isEdited = editedContent !== undefined;

    // Editable wrapper for text elements
    const editableContent = (content: string, className: string = '') => {
      if (!isEditMode) {
        return <span>{content}</span>;
      }
      return (
        <div
          role="textbox"
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          aria-label={`Edit ${element.type}`}
          className={`outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded px-1 -mx-1 ${
            isEdited ? 'bg-amber-50 dark:bg-amber-900/20' : ''
          }`}
          onBlur={(e) => {
            const newContent = e.currentTarget.textContent || '';
            if (newContent !== element.enhancedContent) {
              dispatch({
                type: 'EDIT_ELEMENT',
                level: selectedLevel,
                position: element.position,
                content: newContent
              });
            }
          }}
          onKeyDown={(e) => {
            // Prevent Enter from creating new elements
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          onPaste={(e) => {
            // Strip formatting, paste plain text only
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
          }}
        >
          {content}
        </div>
      );
    };

    // Revert and regenerate buttons for edit mode
    const renderEditControls = () => {
      if (!isEditMode || ['diagram', 'image', 'blank-space', 'table'].includes(element.type)) return null;

      return (
        <div className="flex items-center gap-2 mt-1">
          {isEdited && (
            <button
              onClick={() => dispatch({ type: 'REVERT_ELEMENT', level: selectedLevel, position: element.position })}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              title="Revert to AI version"
            >
              <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="ml-1">Revert</span>
            </button>
          )}
          <button
            onClick={() => regenerateElement(element)}
            disabled={regeneratingPosition !== null}
            className={`text-xs flex items-center gap-1 ${
              regeneratingPosition === element.position
                ? 'text-indigo-500 dark:text-indigo-400'
                : 'text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400'
            }`}
            title="Regenerate this element with AI"
          >
            {regeneratingPosition === element.position ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>{regeneratingPosition === element.position ? 'Regenerating...' : 'Regenerate'}</span>
          </button>
        </div>
      );
    };

    switch (element.type) {
      case 'header':
        return (
          <div key={index} className={baseClasses}>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka">
              {editableContent(displayContent)}
              {element.slideReference && !isEditMode && (
                <span className="ml-2 text-sm font-normal text-indigo-500 dark:text-indigo-400">
                  ({element.slideReference})
                </span>
              )}
            </h2>
            {renderEditControls()}
          </div>
        );

      case 'subheader':
        return (
          <div key={index} className={baseClasses}>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              {editableContent(displayContent)}
            </h3>
            {renderEditControls()}
          </div>
        );

      case 'paragraph':
      case 'instruction':
        return (
          <div key={index} className={baseClasses}>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {editableContent(displayContent)}
              {element.slideReference && !isEditMode && (
                <span className="ml-1 text-indigo-500 dark:text-indigo-400 text-sm">
                  ({element.slideReference})
                </span>
              )}
            </p>
            {renderEditControls()}
          </div>
        );

      case 'question':
        return (
          <div key={index} className={baseClasses}>
            <div className="pl-4 border-l-4 border-pink-400 dark:border-pink-600 bg-pink-50 dark:bg-pink-900/20 p-3 rounded-r-lg">
              <p className="text-slate-700 dark:text-slate-200 font-medium">
                {editableContent(displayContent)}
              </p>
              {element.slideReference && !isEditMode && (
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">{element.slideReference}</p>
              )}
            </div>
            {renderEditControls()}
          </div>
        );

      case 'list':
        if (!isEditMode) {
          return (
            <ul key={index} className={`${baseClasses} list-disc pl-6 space-y-1 text-slate-600 dark:text-slate-300`}>
              {element.children?.map((item, i) => (
                <li key={i}>{item}</li>
              )) || <li>{element.enhancedContent}</li>}
            </ul>
          );
        }

        // In edit mode, show as editable text block (one item per line)
        const listContent = editedContent ?? (element.children?.join('\n') || element.enhancedContent);
        return (
          <div key={index} className={baseClasses}>
            <div
              role="textbox"
              contentEditable="plaintext-only"
              suppressContentEditableWarning
              aria-label="Edit list items (one per line)"
              aria-multiline="true"
              className={`list-disc pl-6 space-y-1 text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded px-1 -mx-1 whitespace-pre-wrap ${
                isEdited ? 'bg-amber-50 dark:bg-amber-900/20' : ''
              }`}
              onBlur={(e) => {
                const newContent = e.currentTarget.textContent || '';
                const originalContent = element.children?.join('\n') || element.enhancedContent;
                if (newContent !== originalContent) {
                  dispatch({
                    type: 'EDIT_ELEMENT',
                    level: selectedLevel,
                    position: element.position,
                    content: newContent
                  });
                }
              }}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
              }}
            >
              {listContent}
            </div>
            <p className="text-xs text-slate-400 mt-1">One item per line</p>
            {renderEditControls()}
          </div>
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
          <div key={index} className={baseClasses}>
            <div className="pl-4 border-l-4 border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-r-lg">
              <p className="text-slate-700 dark:text-slate-200">
                {editableContent(displayContent)}
              </p>
            </div>
            {renderEditControls()}
          </div>
        );

      default:
        return (
          <div key={index} className={baseClasses}>
            <p className="text-slate-600 dark:text-slate-300">
              {editableContent(displayContent)}
            </p>
            {renderEditControls()}
          </div>
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

          {/* Edit Mode Toggle and Show Changes */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isEditMode
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {isEditMode ? 'Editing' : 'Edit'}
              </button>

              <button
                onClick={() => setShowDiff(!showDiff)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showDiff
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {showDiff ? 'Showing Changes' : 'Show Changes'}
              </button>
            </div>

            {/* Show Discard button when edits exist */}
            {isEditMode && hasAnyEdits() && (
              <button
                onClick={() => dispatch({ type: 'DISCARD_ALL' })}
                className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
              >
                Discard all changes
              </button>
            )}
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

            {/* Diff explanation */}
            {showDiff && (
              <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium">Reading the diff:</span>{' '}
                <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1 rounded">Red/strikethrough</span> = original text removed,{' '}
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1 rounded">Green</span> = new text added
              </div>
            )}

            {/* Elements */}
            <div className="space-y-2">
              {selectedVersion.elements.map((element, index) =>
                showDiff
                  ? renderElementWithDiff(element, index)
                  : renderElement(element, index)
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

        {/* Footer with Export and Regenerate buttons */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex flex-row gap-3">
            {/* Export button - primary action */}
            <button
              onClick={handleExport}
              disabled={isExporting || regeneratingPosition !== null}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium text-sm transition-colors"
            >
              {isExporting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>
                    {exportProgress?.phase === 'generating'
                      ? `Generating PDFs... ${exportProgress.percent}%`
                      : `Bundling... ${exportProgress?.percent ?? 0}%`
                    }
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Export All Versions</span>
                </>
              )}
            </button>

            {/* Regenerate button - secondary action */}
            <Button
              variant="secondary"
              onClick={handleEnhance}
              className="flex-1"
              disabled={regeneratingPosition !== null || isExporting}
            >
              {regeneratingPosition !== null ? 'Regenerating...' : 'Regenerate'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  return null;
};

export default EnhancementPanel;
