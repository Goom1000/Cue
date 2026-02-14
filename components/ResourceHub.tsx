
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LessonResource, UploadedResource, UploadValidationError, DocumentAnalysis, Slide, EnhancedResourceState, EnhancementResult, EditState } from '../types';
import Button from './Button';
import { AIProviderInterface, AIProviderError } from '../services/aiProvider';
import UploadPanel from './UploadPanel';
import EnhancementPanel from './EnhancementPanel';
import { analyzeUploadedDocument } from '../services/documentAnalysis/documentAnalysisService';
import { serializeEditState } from '../services/saveService';
import { deserializeEditState } from '../services/loadService';

interface ResourceHubProps {
  lessonText: string;
  slideContext: string; // Stringified slides for context
  slides: Slide[]; // Structured slides for enhancement context
  onClose: () => void;
  provider: AIProviderInterface | null;
  onError: (title: string, message: string) => void;
  onRequestAI: (featureName: string) => void;
  // Persistence props for save/load
  enhancedResourceStates?: EnhancedResourceState[];
  onEnhancedResourcesChange?: (states: EnhancedResourceState[]) => void;
  // Pre-populate with supplementary resources from landing page
  supplementaryResources?: UploadedResource[];
}

const ResourceHub: React.FC<ResourceHubProps> = ({
  lessonText,
  slideContext,
  slides,
  onClose,
  provider,
  onError,
  onRequestAI,
  enhancedResourceStates = [],
  onEnhancedResourcesChange,
  supplementaryResources = []
}) => {
  const isAIAvailable = provider !== null;
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedResource, setSelectedResource] = useState<LessonResource | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Upload state for teacher-provided resources
  const [uploadedResources, setUploadedResources] = useState<UploadedResource[]>([]);

  // Enhancement flow state
  const [selectedUploadedResource, setSelectedUploadedResource] = useState<UploadedResource | null>(null);
  const [resourceAnalysis, setResourceAnalysis] = useState<Map<string, DocumentAnalysis>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Enhancement state tracking per resource (for persistence)
  const [enhancementStates, setEnhancementStates] = useState<Map<string, { result: EnhancementResult | null; editState: EditState }>>(new Map());

  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Refs to access latest state values in callbacks without causing dependency changes
  // This prevents infinite re-render loops when callbacks need to read current state
  const uploadedResourcesRef = useRef(uploadedResources);
  const resourceAnalysisRef = useRef(resourceAnalysis);
  const onEnhancedResourcesChangeRef = useRef(onEnhancedResourcesChange);
  useEffect(() => { uploadedResourcesRef.current = uploadedResources; }, [uploadedResources]);
  useEffect(() => { resourceAnalysisRef.current = resourceAnalysis; }, [resourceAnalysis]);
  useEffect(() => { onEnhancedResourcesChangeRef.current = onEnhancedResourcesChange; }, [onEnhancedResourcesChange]);

  // Restore enhanced resources on mount
  useEffect(() => {
    if (enhancedResourceStates.length > 0) {
      // Restore uploadedResources
      const restoredUploads = enhancedResourceStates.map(state => state.originalResource);
      setUploadedResources(restoredUploads);

      // Restore analysis cache
      const analysisMap = new Map<string, DocumentAnalysis>();
      enhancedResourceStates.forEach(state => {
        analysisMap.set(state.resourceId, state.analysis);
      });
      setResourceAnalysis(analysisMap);

      // Restore enhancement states
      const statesMap = new Map<string, { result: EnhancementResult | null; editState: EditState }>();
      enhancedResourceStates.forEach(state => {
        const editState = deserializeEditState(state.editOverlays);
        statesMap.set(state.resourceId, { result: state.enhancementResult, editState });
      });
      setEnhancementStates(statesMap);
    }

    // Pre-populate with supplementary resources from landing page (RES-06)
    if (supplementaryResources.length > 0) {
      setUploadedResources(prev => {
        // Deduplicate by resource ID -- enhancedResourceStates may overlap
        const existingIds = new Set(prev.map(r => r.id));
        const newResources = supplementaryResources.filter(r => !existingIds.has(r.id));
        return newResources.length > 0 ? [...prev, ...newResources] : prev;
      });
    }
  }, []); // Only run on mount - enhancedResourceStates is initial data

  // Handler for EnhancementPanel state changes
  // Uses refs instead of state dependencies to maintain stable callback identity
  // and prevent infinite re-render loops
  const handleEnhancementStateChange = useCallback((resourceId: string, state: { result: EnhancementResult | null; editState: EditState }) => {
    // Update local enhancement states
    setEnhancementStates(prev => {
      const next = new Map<string, { result: EnhancementResult | null; editState: EditState }>(prev);
      next.set(resourceId, state);
      return next;
    });

    // Notify parent of changes for persistence
    // Done outside setState to avoid "Cannot update App while rendering ResourceHub" error
    // Uses refs to access current state without creating callback dependencies
    if (state.result) {
      const uploadedResources = uploadedResourcesRef.current;
      const resourceAnalysis = resourceAnalysisRef.current;
      const onEnhancedResourcesChange = onEnhancedResourcesChangeRef.current;

      if (!onEnhancedResourcesChange) return;

      const resource = uploadedResources.find(r => r.id === resourceId);
      const analysis = resourceAnalysis.get(resourceId);

      if (resource && analysis) {
        // Schedule parent update for after render completes using requestAnimationFrame
        // to ensure we're fully out of the React render cycle
        requestAnimationFrame(() => {
          // Re-read enhancementStates to get the latest value after setState
          setEnhancementStates(currentStates => {
            const allStates: EnhancedResourceState[] = [];
            currentStates.forEach((s, id) => {
              if (s.result) {
                const res = uploadedResourcesRef.current.find(r => r.id === id);
                const ana = resourceAnalysisRef.current.get(id);
                if (res && ana) {
                  allStates.push({
                    resourceId: id,
                    originalResource: res,
                    analysis: ana,
                    enhancementResult: s.result,
                    editOverlays: serializeEditState(s.editState.edits),
                    enhancedAt: new Date().toISOString()
                  });
                }
              }
            });
            // Call parent update
            onEnhancedResourcesChangeRef.current?.(allStates);
            // Return unchanged state - we're just reading
            return currentStates;
          });
        });
      }
    }
  }, []); // No dependencies - uses refs for all state access

  // Trigger analysis when an uploaded resource is selected
  useEffect(() => {
    if (!selectedUploadedResource || !provider) return;
    if (resourceAnalysis.has(selectedUploadedResource.id)) return;

    const analyzeResource = async () => {
      setIsAnalyzing(true);
      try {
        // Note: originalFile not available after upload, but content is preserved
        // Analysis service handles this (uses content.images and content.text)
        const { analysis } = await analyzeUploadedDocument(
          selectedUploadedResource,
          provider
        );
        setResourceAnalysis(prev => new Map(prev).set(selectedUploadedResource.id, analysis));
      } catch (err) {
        onError('Analysis Failed', (err as Error).message);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeResource();
  }, [selectedUploadedResource, provider, resourceAnalysis, onError]);

  // Handle selecting an uploaded resource (clear generated resource selection)
  const handleSelectUploadedResource = (resource: UploadedResource) => {
    setSelectedUploadedResource(resource);
    setSelectedResource(null); // Clear generated resource selection
  };

  // Handle selecting a generated resource (clear uploaded resource selection)
  const handleSelectGeneratedResource = (resource: LessonResource) => {
    setSelectedResource(resource);
    setSelectedUploadedResource(null); // Clear uploaded resource selection
  };

  // Stable callback for EnhancementPanel state changes - prevents infinite re-render loop
  // by keeping the same function identity when selectedUploadedResource.id hasn't changed
  const handleSelectedResourceStateChange = useCallback(
    (state: { result: EnhancementResult | null; editState: EditState }) => {
      if (selectedUploadedResource) {
        handleEnhancementStateChange(selectedUploadedResource.id, state);
      }
    },
    [selectedUploadedResource?.id, handleEnhancementStateChange]
  );

  const handleUploadError = (error: UploadValidationError) => {
    // Use existing onError prop to show toast/modal
    onError('Upload Failed', error.message);
  };

  const handleGenerate = async () => {
    if (!isAIAvailable) {
      onRequestAI('generate classroom resources');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await provider.generateLessonResources(lessonText, slideContext);
      setResources(result);
      if (result.length > 0) setSelectedResource(result[0]);
      setHasGenerated(true);
    } catch (err) {
      console.error("Failed to generate resources", err);
      if (err instanceof AIProviderError) {
        onError('Resource Generation Failed', err.userMessage);
      } else {
        onError('Error', 'Could not generate resources. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const parseMarkdown = (text: string) => {
    let html = text || "";
    
    // Header Logic - Replace #, ##, ### with styled divs
    // Note: We use Tailwind classes inside the replacements for the print view compatibility
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-6 mb-3 font-fredoka text-slate-700 border-b-2 border-slate-100 pb-1">$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-8 mb-4 font-fredoka text-indigo-600">$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-8 mb-6 font-fredoka text-slate-900">$1</h1>');

    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Lists
    // Convert lines starting with - or * into list items, then wrap in UL
    // This regex looks for blocks of list items and wraps them
    html = html.replace(/((?:^\s*[\-\*] .+(?:\n|$))+)/gm, (match) => {
        const items = match.trim().split('\n').map(line => `<li>${line.replace(/^\s*[\-\*] /, '')}</li>`).join('');
        return `<ul class="list-disc pl-6 space-y-1 my-4 marker:text-pink-400">${items}</ul>`;
    });
    
    // Ordered Lists
    html = html.replace(/((?:^\s*\d+\. .+(?:\n|$))+)/gm, (match) => {
        const items = match.trim().split('\n').map(line => `<li>${line.replace(/^\s*\d+\. /, '')}</li>`).join('');
        return `<ol class="list-decimal pl-6 space-y-1 my-4 marker:text-indigo-500 font-bold text-slate-700">${items}</ol>`;
    });

    // Checkboxes [ ]
    html = html.replace(/\[ \]/g, '<span class="inline-block w-5 h-5 border-2 border-slate-300 rounded mr-2 align-middle bg-white shadow-sm"></span>');
    
    // Fill in the blanks _______
    html = html.replace(/_{3,}/g, '<span class="inline-block border-b-2 border-slate-300 min-w-[120px] h-6 mx-1 align-baseline"></span>');

    // Tables
    // Simple table parser for markdown tables |...|...|
    const tableRegex = /((?:^\|.+(?:\n|$))+)/gm;
    html = html.replace(tableRegex, (match) => {
        const rows = match.trim().split('\n');
        let tableHtml = '<div class="overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-sm"><table class="w-full text-left border-collapse">';
        
        rows.forEach((row, i) => {
            if (row.includes('---')) return; // skip separator row
            const cols = row.split('|').filter(c => c.trim() !== '');
            tableHtml += `<tr class="${i === 0 ? 'bg-indigo-50 text-indigo-900' : 'border-t border-slate-100'}">`;
            cols.forEach(col => {
                const tag = i === 0 ? 'th' : 'td';
                const cellClass = i === 0 ? 'p-3 font-bold' : 'p-3 text-sm';
                // Recursive parse for bolding inside cells
                let cellContent = col.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                tableHtml += `<${tag} class="${cellClass}">${cellContent}</${tag}>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</table></div>';
        return tableHtml;
    });

    // Line breaks for non-html blocks (paragraphs)
    // We wrap remaining plain text lines in <p> if they aren't tags
    html = html.split('\n\n').map(block => {
        if (block.trim().startsWith('<')) return block; // Already HTML
        return `<p class="mb-4 leading-relaxed text-slate-600">${block}</p>`;
    }).join('');

    return html;
  };

  const handlePrint = () => {
    if (!selectedResource) return;
    
    // Open a new window for printing to ensure clean output
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const parsedContent = parseMarkdown(selectedResource.content);
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${selectedResource.title}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Poppins', sans-serif; padding: 40px; background: #fff; }
            h1, h2, h3 { font-family: 'Fredoka', sans-serif; }
            @media print {
              body { padding: 0; -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="max-w-3xl mx-auto border-4 border-indigo-100 p-8 rounded-[40px] relative overflow-hidden">
             <!-- Decor Header -->
             <div class="flex items-start justify-between mb-8 border-b-4 border-indigo-50 pb-6">
                <div class="flex-1 pr-6">
                    <h1 class="text-4xl font-bold text-slate-800 mb-2">${selectedResource.title}</h1>
                    <div class="flex gap-3">
                        <span class="px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-xs font-bold uppercase tracking-wider border border-pink-200">${selectedResource.type}</span>
                        <span class="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-200">${selectedResource.targetAudience}</span>
                    </div>
                </div>
             </div>

             <!-- Content -->
             <div class="prose max-w-none text-slate-700">
                ${parsedContent}
             </div>

             <!-- Footer -->
             <div class="mt-12 pt-6 border-t-2 border-dashed border-slate-200 flex justify-between text-xs text-slate-400 font-bold uppercase tracking-widest">
                <span>Created with Cue</span>
                <span>Date: ________________</span>
             </div>
          </div>
          <script>
            // Auto print after images load (or delay slightly)
            window.onload = function() { setTimeout(() => window.print(), 500); }
          </script>
        </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  const handleDownload = () => {
    if (!selectedResource || !contentRef.current) return;

    const element = contentRef.current;
    
    // Store original styles
    const prevStyle = {
       boxShadow: element.style.boxShadow,
       border: element.style.border,
       borderRadius: element.style.borderRadius,
       width: element.style.width,
       maxWidth: element.style.maxWidth,
       color: element.style.color
    };

    // Apply PDF-friendly styles (Clean, flat, high contrast, A4 sizing)
    element.style.boxShadow = 'none';
    element.style.border = 'none';
    element.style.borderRadius = '0';
    element.style.width = '794px'; // Approx A4 width at 96 DPI
    element.style.maxWidth = 'none';
    element.style.color = '#000000'; // Force black for sharpness
    
    // Configure html2pdf options
    const opt = {
      margin:       0, // Use element padding for margins
      filename:     `${selectedResource.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        scrollY: 0,
        windowWidth: 794,
        ignoreElements: (el: Element) => el.hasAttribute('data-html2canvas-ignore') 
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const restore = () => {
        element.style.boxShadow = prevStyle.boxShadow;
        element.style.border = prevStyle.border;
        element.style.borderRadius = prevStyle.borderRadius;
        element.style.width = prevStyle.width;
        element.style.maxWidth = prevStyle.maxWidth;
        element.style.color = prevStyle.color;
    };

    if ((window as any).html2pdf) {
        (window as any).html2pdf().set(opt).from(element).save().then(restore).catch((e: any) => {
            console.error(e);
            restore();
        });
    } else {
        alert("PDF Generator is still loading. Please try again in a few seconds.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-pink-200 dark:shadow-none">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white font-fredoka">Classroom Resources</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Printable worksheets, guides, and checklists.</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar List */}
            <div className="w-80 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                {/* Upload Section */}
                <div className="mb-2">
                  <UploadPanel
                    resources={uploadedResources}
                    onResourcesChange={setUploadedResources}
                    onError={handleUploadError}
                    onResourceClick={handleSelectUploadedResource}
                    selectedResourceId={selectedUploadedResource?.id || null}
                    resourceAnalysisStatus={(() => {
                      const statusMap = new Map<string, 'analyzing' | 'complete'>();
                      // All resources with analysis complete
                      resourceAnalysis.forEach((_, id) => statusMap.set(id, 'complete'));
                      // Currently analyzing resource
                      if (isAnalyzing && selectedUploadedResource) {
                        statusMap.set(selectedUploadedResource.id, 'analyzing');
                      }
                      return statusMap;
                    })()}
                  />
                </div>

                {/* Divider when resources uploaded */}
                {uploadedResources.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
                )}

                {!hasGenerated ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-sm text-slate-300 dark:text-slate-600">
                             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">AI will analyze your slides to find referenced materials.</p>
                        <div className="relative">
                          <Button
                            onClick={handleGenerate}
                            isLoading={isGenerating}
                            className={`w-full ${!isAIAvailable ? 'opacity-50' : ''}`}
                            title={!isAIAvailable ? 'Add API key in Settings to enable' : undefined}
                          >
                            Generate Resources
                          </Button>
                          {!isAIAvailable && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-500 dark:bg-slate-600 rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </div>
                    </div>
                ) : (
                    <>
                        {resources.map((res) => (
                            <button
                                key={res.id}
                                onClick={() => handleSelectGeneratedResource(res)}
                                className={`text-left p-4 rounded-xl border transition-all ${selectedResource?.id === res.id ? 'bg-white dark:bg-slate-800 border-pink-500 shadow-md ring-1 ring-pink-100 dark:ring-pink-900' : 'bg-white dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                            >
                                <h4 className={`font-bold text-sm mb-1 ${selectedResource?.id === res.id ? 'text-pink-600 dark:text-pink-400' : 'text-slate-700 dark:text-slate-300'}`}>{res.title}</h4>
                                <div className="flex gap-2">
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{res.type}</span>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{res.targetAudience}</span>
                                </div>
                            </button>
                        ))}
                         <div className="relative mt-4">
                           <Button
                             onClick={handleGenerate}
                             variant="secondary"
                             isLoading={isGenerating}
                             className={`text-xs w-full ${!isAIAvailable ? 'opacity-50' : ''}`}
                             title={!isAIAvailable ? 'Add API key in Settings to enable' : undefined}
                           >
                             Regenerate
                           </Button>
                           {!isAIAvailable && (
                             <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-500 dark:bg-slate-600 rounded-full flex items-center justify-center">
                               <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                 <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                               </svg>
                             </span>
                           )}
                         </div>
                    </>
                )}
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
                {/* EnhancementPanel for uploaded resources with analysis complete */}
                {selectedUploadedResource && resourceAnalysis.has(selectedUploadedResource.id) && provider ? (
                    <EnhancementPanel
                      resource={selectedUploadedResource}
                      analysis={resourceAnalysis.get(selectedUploadedResource.id)!}
                      slides={slides}
                      provider={provider}
                      onError={onError}
                      onStateChange={handleSelectedResourceStateChange}
                      initialResult={enhancementStates.get(selectedUploadedResource.id)?.result ?? undefined}
                      initialEditState={enhancementStates.get(selectedUploadedResource.id)?.editState}
                    />
                ) : selectedUploadedResource && isAnalyzing ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-slate-400">Analyzing document...</p>
                      </div>
                    </div>
                ) : selectedUploadedResource && !provider ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center max-w-sm">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 font-fredoka mb-2">API Key Required</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Add your API key in Settings to enable document enhancement.</p>
                      </div>
                    </div>
                ) : selectedResource ? (
                    <div className="h-full p-8 overflow-y-auto">
                      <div
                          ref={contentRef}
                          className="max-w-3xl mx-auto bg-white min-h-[800px] shadow-xl rounded-[40px] p-12 text-slate-800 print-preview relative animate-fade-in border-4 border-indigo-50/50"
                      >
                          {/* Export Button (General) */}
                          <div className="absolute top-6 right-6 z-30" data-html2canvas-ignore>
                              <div className="relative">
                                  <button
                                      onClick={() => setShowExportMenu(!showExportMenu)}
                                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-lg font-bold text-sm"
                                  >
                                      <span>Export</span>
                                      <svg className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                  </button>

                                  {showExportMenu && (
                                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in flex flex-col z-40">
                                          <button
                                              onClick={() => { setShowExportMenu(false); handlePrint(); }}
                                              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm font-bold text-slate-700 transition-colors border-b border-slate-50 w-full"
                                          >
                                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                              Print Document
                                          </button>
                                          <button
                                              onClick={() => { setShowExportMenu(false); handleDownload(); }}
                                              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm font-bold text-slate-700 transition-colors w-full"
                                          >
                                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                              Download PDF
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>

                          {/* Document Header */}
                          <div className="mb-10 pb-8 border-b-4 border-indigo-50 flex items-start justify-between">
                               <div className="flex-1 pr-6 pt-4">
                                  <h1 className="text-4xl font-bold mb-3 font-fredoka text-slate-800">{selectedResource.title}</h1>
                                  <div className="flex gap-2">
                                      <span className="px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-xs font-bold uppercase tracking-wider">{selectedResource.type}</span>
                                      <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider">{selectedResource.targetAudience}</span>
                                  </div>
                               </div>
                          </div>

                          {/* Live Markdown Preview */}
                          <div
                              className="prose prose-slate max-w-none font-poppins prose-headings:font-fredoka prose-h1:text-3xl prose-h2:text-2xl prose-h2:text-indigo-600 prose-p:text-slate-600"
                              dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedResource.content) }}
                          />

                          {/* Footer */}
                           <div className="mt-16 pt-8 border-t-2 border-dashed border-slate-100 flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              <span>Teacher Resource • {new Date().getFullYear()}</span>
                              <span>Cue</span>
                           </div>
                      </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-600">
                        <p>Select a resource to preview</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceHub;
