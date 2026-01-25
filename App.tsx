
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Slide, AppState, SavedClass, StudentPair } from './types';
import { createAIProvider, AIProviderError, AIProviderInterface, GenerationInput, GenerationMode, AIErrorCode } from './services/aiProvider';
import { useSettings } from './hooks/useSettings';
import { useClassBank } from './hooks/useClassBank';
import { exportToPowerPoint } from './services/pptxService';
import { createCueFile, downloadPresentation, checkFileSize } from './services/saveService';
import { readCueFile } from './services/loadService';
import { useAutoSave, getAutoSave, getAutoSaveTimestamp, clearAutoSave, hasAutoSave, AutoSaveData } from './hooks/useAutoSave';
import { useDragDrop } from './hooks/useDragDrop';
import Button from './components/Button';
import SlideCard from './components/SlideCard';
import PresentationView from './components/PresentationView';
import ResourceHub from './components/ResourceHub';
import SettingsModal from './components/SettingsModal';
import EnableAIModal from './components/EnableAIModal';
import RecoveryModal from './components/RecoveryModal';
import ClassBankSaveModal from './components/ClassBankSaveModal';
import ClassBankDropdown from './components/ClassBankDropdown';
import ClassManagementModal from './components/ClassManagementModal';
import StudentListModal from './components/StudentListModal';
import { useToast, ToastContainer } from './components/Toast';
import useHashRoute from './hooks/useHashRoute';
import StudentView from './components/StudentView';

declare const pdfjsLib: any;

// Generate randomized student pairs with Fisher-Yates shuffle
// Handles odd numbers by creating one group of 3
function generatePairs(studentNames: string[]): StudentPair[] {
  if (studentNames.length < 2) {
    // Single student or empty: return as single group
    return studentNames.length === 1 ? [{ students: studentNames }] : [];
  }

  // Fisher-Yates shuffle
  const shuffled = [...studentNames];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const pairs: StudentPair[] = [];
  const isOdd = shuffled.length % 2 !== 0;

  // Create pairs of 2
  const pairEndIndex = isOdd ? shuffled.length - 3 : shuffled.length;
  for (let i = 0; i < pairEndIndex; i += 2) {
    pairs.push({ students: [shuffled[i], shuffled[i + 1]] });
  }

  // Handle last 3 (odd) or last 2 (even)
  if (isOdd) {
    pairs.push({ students: shuffled.slice(-3), isGroupOfThree: true });
  }

  return pairs;
}

// Sub-component for the insertion point with menu options
const InsertPoint = ({
  onClickBlank,
  onClickExemplar,
  onClickElaborate,
  onClickWorkTogether,
  onClickClassChallenge
}: {
  onClickBlank: () => void,
  onClickExemplar: () => void,
  onClickElaborate: () => void,
  onClickWorkTogether: () => void,
  onClickClassChallenge: () => void
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className="group/insert py-1 flex items-center justify-center relative -my-1 min-h-[1.5rem]"
            onMouseLeave={() => setIsOpen(false)}
        >
            <div className={`absolute left-4 right-4 h-px transition-colors z-0 ${isOpen ? 'bg-indigo-400 dark:bg-amber-500' : 'bg-transparent group-hover/insert:bg-indigo-300/50 dark:group-hover/insert:bg-amber-500/30'}`}></div>

            {!isOpen ? (
                <button
                    onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                    className="z-10 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-indigo-600 dark:hover:text-amber-400 hover:border-indigo-400 dark:hover:border-amber-400 shadow-sm flex items-center justify-center transition-all opacity-0 group-hover/insert:opacity-100 scale-75 group-hover/insert:scale-100 hover:shadow-md"
                    title="Insert Slide"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                </button>
            ) : (
                <div className="z-20 flex flex-col gap-1 animate-fade-in bg-white dark:bg-slate-800 border border-indigo-100 dark:border-amber-500/30 rounded-xl p-1.5 shadow-xl ring-4 ring-indigo-50 dark:ring-amber-500/10">
                    <button
                        onClick={(e) => { e.stopPropagation(); onClickBlank(); setIsOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-lg transition-colors"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Blank</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClickExemplar(); setIsOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 dark:bg-amber-500 hover:bg-indigo-700 dark:hover:bg-amber-400 text-white dark:text-slate-900 rounded-lg transition-colors shadow-sm"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Exemplar</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClickElaborate(); setIsOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Elaborate</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClickWorkTogether(); setIsOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Work Together</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClickClassChallenge(); setIsOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Class Challenge</span>
                    </button>
                </div>
            )}
        </div>
    );
};

function App() {
  // Hash-based routing for student view
  const route = useHashRoute();

  // If on student route, render StudentView directly (no other app chrome)
  if (route === '/student') {
    return <StudentView />;
  }

  // Settings and provider
  const [settings, , refreshSettings] = useSettings();
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [enableAIModal, setEnableAIModal] = useState<{ featureName: string } | null>(null);
  const [settingsAutoFocus, setSettingsAutoFocus] = useState(false);

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  // Recovery modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryData, setRecoveryData] = useState<AutoSaveData | null>(null);
  const [recoveryTimestamp, setRecoveryTimestamp] = useState<number>(0);

  // Save/load state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const loadFileInputRef = useRef<HTMLInputElement>(null);
  const [showFilenamePrompt, setShowFilenamePrompt] = useState(false);
  const [pendingSaveFilename, setPendingSaveFilename] = useState('');

  // Create provider instance (memoized to avoid recreation on every render)
  const provider = useMemo<AIProviderInterface | null>(() => {
    if (!settings.apiKey) return null;
    try {
      return createAIProvider({ provider: settings.provider, apiKey: settings.apiKey });
    } catch (e) {
      // OpenAI will throw here - show error
      if (e instanceof AIProviderError) {
        setErrorModal({ title: 'Provider Not Available', message: e.userMessage });
      }
      return null;
    }
  }, [settings.provider, settings.apiKey]);

  // Error handler callback for child components
  const handleComponentError = useCallback((title: string, message: string) => {
    setErrorModal({ title, message });
  }, []);

  // Handler for opening settings from EnableAIModal
  const handleOpenSettingsFromEnableModal = useCallback(() => {
    setEnableAIModal(null);  // Close enable modal first
    setSettingsAutoFocus(true);
    setShowSettings(true);
  }, []);

  // Handler for child components to request AI enablement
  const handleRequestAI = useCallback((featureName: string) => {
    setEnableAIModal({ featureName });
  }, []);

  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [lessonText, setLessonText] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [presentationStartIndex, setPresentationStartIndex] = useState(0);
  const [lessonTitle, setLessonTitle] = useState('New Lesson');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showResourceHub, setShowResourceHub] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [autoGenerateImages, setAutoGenerateImages] = useState(true);
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [studentGrades, setStudentGrades] = useState<import('./types').StudentWithGrade[]>([]);
  const [nameInput, setNameInput] = useState('');

  // Class Bank state
  const { classes, saveClass, deleteClass, renameClass, updateClassStudents, updateStudentGrade } = useClassBank();
  const [showSaveClassModal, setShowSaveClassModal] = useState(false);
  const [showLoadDropdown, setShowLoadDropdown] = useState(false);
  const [activeClassName, setActiveClassName] = useState<string | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showStudentListModal, setShowStudentListModal] = useState(false);
  const loadClassButtonRef = useRef<HTMLButtonElement>(null);

  // PDF handling state - Lesson Plan
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF handling state - Existing Presentation
  const [existingPptFile, setExistingPptFile] = useState<File | null>(null);
  const [isProcessingPpt, setIsProcessingPpt] = useState(false);
  const [existingPptImages, setExistingPptImages] = useState<string[]>([]);
  const [existingPptText, setExistingPptText] = useState('');
  const existingPptInputRef = useRef<HTMLInputElement>(null);

  // Derive upload mode from which files are uploaded
  type UploadMode = 'fresh' | 'refine' | 'blend' | 'none';

  const uploadMode = useMemo<UploadMode>(() => {
    const hasLesson = uploadedFile !== null || lessonText.trim() !== '';
    const hasPpt = existingPptFile !== null;

    if (hasLesson && hasPpt) return 'blend';
    if (hasPpt) return 'refine';
    if (hasLesson) return 'fresh';
    return 'none';
  }, [uploadedFile, lessonText, existingPptFile]);

  const activeSlide = slides[activeSlideIndex];

  // Shared PDF processor for both upload zones
  const processPdf = async (
    file: File,
    onProgress: (processing: boolean) => void,
    onComplete: (text: string, images: string[]) => void,
    onError: (errorMsg: string) => void
  ) => {
    onProgress(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

      let fullText = "";
      const images: string[] = [];
      const pagesToProcess = Math.min(pdf.numPages, 5);

      for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ') + "\n\n";

        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        images.push(canvas.toDataURL('image/jpeg', 0.8));
      }

      onComplete(fullText, images);
    } catch (err) {
      console.error("PDF Processing Error:", err);
      onError("Failed to analyze the PDF structure.");
    } finally {
      onProgress(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("Please upload a PDF document.");
      return;
    }

    setUploadedFile(file);
    setError(null);
    await processPdf(
      file,
      setIsProcessingFile,
      (text, images) => {
        setLessonText(text);
        setPageImages(images);
      },
      setError
    );
  };

  const handlePptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("Please upload a PDF document.");
      return;
    }

    setExistingPptFile(file);
    setError(null);
    await processPdf(
      file,
      setIsProcessingPpt,
      (text, images) => {
        setExistingPptText(text);
        setExistingPptImages(images);
      },
      setError
    );
  };

  const handleGenerate = async () => {
    if (!provider) {
      setEnableAIModal({ featureName: 'generate slides' });
      return;
    }

    // Validation: need at least one input source
    const hasLessonContent = lessonText.trim() || pageImages.length > 0;
    const hasPptContent = existingPptImages.length > 0;

    if (!hasLessonContent && !hasPptContent) return;

    setIsGenerating(true);
    setAppState(AppState.PROCESSING_TEXT);
    setError(null);

    try {
      // Build GenerationInput based on uploadMode
      const generationInput: GenerationInput = {
        lessonText: lessonText,
        lessonImages: pageImages.length > 0 ? pageImages : undefined,
        presentationText: existingPptText || undefined,
        presentationImages: existingPptImages.length > 0 ? existingPptImages : undefined,
        mode: uploadMode as GenerationMode, // Safe cast - we guard against 'none' above
      };

      const generatedSlides = await provider.generateLessonSlides(generationInput);
      setSlides(generatedSlides);
      setLessonTitle(generatedSlides[0]?.title || "New Lesson");
      setActiveSlideIndex(0);
      setAppState(AppState.EDITING);

      if (autoGenerateImages) {
        generatedSlides.forEach(async (s) => {
            setSlides(curr => curr.map(item => item.id === s.id ? {...item, isGeneratingImage: true} : item));
            const img = await provider.generateSlideImage(s.imagePrompt, s.layout);
            setSlides(curr => curr.map(item => item.id === s.id ? {...item, imageUrl: img, isGeneratingImage: false} : item));
        });
      }
    } catch (err) {
      if (err instanceof AIProviderError) {
        setErrorModal({ title: 'Generation Failed', message: err.userMessage });
      } else {
        setErrorModal({ title: 'Error', message: 'An unexpected error occurred.' });
      }
      setAppState(AppState.INPUT);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateSlide = useCallback((id: string, updates: Partial<Slide>) => {
    setSlides(prev => prev.map(s => {
      if (s.id !== id) return s;

      // Detect if content changed (invalidates verbosity cache)
      const contentChanged = updates.content !== undefined || updates.title !== undefined;

      // Special case: if only updating verbosityCache, preserve it
      const isOnlyCacheUpdate = Object.keys(updates).length === 1 && updates.verbosityCache !== undefined;

      return {
        ...s,
        ...updates,
        // Clear cache if content changed, unless this IS a cache update
        verbosityCache: contentChanged && !isOnlyCacheUpdate
          ? undefined
          : (updates.verbosityCache ?? s.verbosityCache),
      };
    }));
  }, []);

  const handleDeleteSlide = useCallback((id: string) => {
    setSlides(prev => {
      const newSlides = prev.filter(s => s.id !== id);
      if (activeSlideIndex >= newSlides.length) {
        setActiveSlideIndex(Math.max(0, newSlides.length - 1));
      }
      return newSlides;
    });
  }, [activeSlideIndex]);

  const handleReviseSlide = async (id: string, instruction: string) => {
    if (!provider) {
      setEnableAIModal({ featureName: 'refine this slide with AI' });
      return;
    }
    const target = slides.find(s => s.id === id);
    if (!target) return;
    handleUpdateSlide(id, { isGeneratingImage: true });

    const retryableErrors: AIErrorCode[] = ['NETWORK_ERROR', 'RATE_LIMIT', 'SERVER_ERROR'];
    const maxRetries = 2;
    let lastError: AIProviderError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const updates = await provider.reviseSlide(target, instruction);
        handleUpdateSlide(id, { ...updates, isGeneratingImage: false });

        // Image regeneration if imagePrompt changed
        if (updates.imagePrompt && updates.imagePrompt !== target.imagePrompt && autoGenerateImages) {
          const img = await provider.generateSlideImage(updates.imagePrompt, updates.layout || target.layout);
          handleUpdateSlide(id, { imageUrl: img });
        }
        return; // Success - exit function
      } catch (err) {
        if (err instanceof AIProviderError) {
          lastError = err;
          if (retryableErrors.includes(err.code) && attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
        }
        break; // Non-retryable error or retries exhausted
      }
    }

    // All retries failed or non-retryable error
    handleUpdateSlide(id, { isGeneratingImage: false });
    if (lastError) {
      addToast(
        lastError.userMessage,
        5000,
        'error',
        { label: 'Retry', onClick: () => handleReviseSlide(id, instruction) }
      );
    }
  };

  const handleInsertBlankSlide = (index: number) => {
    const blankSlide: Slide = {
      id: `blank-${Date.now()}`,
      title: "New Concept",
      content: ["Add your key points here...", "Use simple language for Year 6 students."],
      speakerNotes: "INTRO: Introduce the new concept.\n👉 STUDENT READS: 'Point 1'\nTEACHER ELABORATES: Explain the significance.",
      imagePrompt: "Minimalist educational illustration",
      layout: 'split',
      theme: 'default'
    };
    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, blankSlide);
    setSlides(newSlides);
    setActiveSlideIndex(index + 1);
  };

  const handleInsertExemplarSlide = async (index: number) => {
    if (!provider) {
      setErrorModal({ title: 'AI Not Configured', message: 'Please configure your AI provider in Settings.' });
      return;
    }

    const tempId = `temp-ex-${Date.now()}`;
    const tempSlide: Slide = {
      id: tempId,
      title: "Creating Exemplar...",
      content: ["Analyzing previous concepts...", "Designing worked example..."],
      speakerNotes: "",
      imagePrompt: "",
      isGeneratingImage: true,
      layout: 'split'
    };

    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, tempSlide);
    setSlides(newSlides);
    setActiveSlideIndex(index + 1);

    try {
      const prev = index >= 0 ? slides[index] : undefined;
      if (!prev) throw new Error("Need a previous slide for exemplar context.");

      const exemplar = await provider.generateExemplarSlide(lessonTitle, prev);
      setSlides(curr => curr.map(s => s.id === tempId ? { ...exemplar, id: tempId, isGeneratingImage: autoGenerateImages } : s));

      if (autoGenerateImages) {
        const img = await provider.generateSlideImage(exemplar.imagePrompt, exemplar.layout);
        setSlides(curr => curr.map(s => s.id === tempId ? { ...s, imageUrl: img, isGeneratingImage: false } : s));
      }
    } catch (err) {
      console.error("Exemplar error:", err);
      // Fallback to blank if exemplar fails
      setSlides(curr => curr.map(s => s.id === tempId ? { ...tempSlide, title: "Custom Slide", isGeneratingImage: false } : s));
      if (err instanceof AIProviderError) {
        setErrorModal({ title: 'Exemplar Generation Failed', message: err.userMessage });
      }
    }
  };

  const handleInsertElaborateSlide = async (index: number) => {
    if (!provider) {
      setErrorModal({ title: 'AI Not Configured', message: 'Please configure your AI provider in Settings.' });
      return;
    }

    // Source slide is the slide ABOVE the + button (what we're elaborating on)
    const source = index >= 0 ? slides[index] : undefined;
    if (!source) {
      setErrorModal({ title: 'Cannot Elaborate', message: 'Need a slide above to elaborate on.' });
      return;
    }

    const tempId = `temp-elab-${Date.now()}`;
    const tempSlide: Slide = {
      id: tempId,
      title: "Elaborating...",
      content: ["Expanding on the concept...", "Adding depth and examples..."],
      speakerNotes: "",
      imagePrompt: "",
      isGeneratingImage: true,
      layout: 'split'
    };

    // Insert temp slide after source
    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, tempSlide);
    setSlides(newSlides);
    setActiveSlideIndex(index + 1);

    try {
      const elaborate = await provider.generateElaborateSlide(lessonTitle, source, slides);
      setSlides(curr => curr.map(s => s.id === tempId ? { ...elaborate, id: tempId, isGeneratingImage: autoGenerateImages } : s));

      if (autoGenerateImages) {
        const img = await provider.generateSlideImage(elaborate.imagePrompt, elaborate.layout);
        setSlides(curr => curr.map(s => s.id === tempId ? { ...s, imageUrl: img, isGeneratingImage: false } : s));
      }
    } catch (err) {
      console.error("Elaborate error:", err);
      // Fallback to blank if elaborate fails
      setSlides(curr => curr.map(s => s.id === tempId ? { ...tempSlide, title: "New Slide", isGeneratingImage: false } : s));
      if (err instanceof AIProviderError) {
        setErrorModal({ title: 'Elaborate Generation Failed', message: err.userMessage });
      }
    }
  };

  const handleInsertWorkTogetherSlide = async (index: number) => {
    if (!provider) {
      setErrorModal({ title: 'AI Not Configured', message: 'Please configure your AI provider in Settings.' });
      return;
    }

    // Source slide is the slide ABOVE the + button (what we're creating activity for)
    const source = index >= 0 ? slides[index] : undefined;
    if (!source) {
      setErrorModal({ title: 'Cannot Create Activity', message: 'Need a slide above to create an activity for.' });
      return;
    }

    const tempId = `temp-work-${Date.now()}`;
    const tempSlide: Slide = {
      id: tempId,
      title: "Creating Activity...",
      content: ["Generating collaborative activity...", "Designing pair instructions..."],
      speakerNotes: "",
      imagePrompt: "",
      isGeneratingImage: true,
      layout: 'work-together'
    };

    // Insert temp slide after source
    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, tempSlide);
    setSlides(newSlides);
    setActiveSlideIndex(index + 1);

    try {
      const workTogether = await provider.generateWorkTogetherSlide(lessonTitle, source, slides);

      // Generate pairs from roster if available
      const pairs = studentNames.length >= 2 ? generatePairs(studentNames) : undefined;

      setSlides(curr => curr.map(s => s.id === tempId
        ? { ...workTogether, id: tempId, pairs, isGeneratingImage: autoGenerateImages }
        : s
      ));

      if (autoGenerateImages) {
        const img = await provider.generateSlideImage(workTogether.imagePrompt, workTogether.layout);
        setSlides(curr => curr.map(s => s.id === tempId ? { ...s, imageUrl: img, isGeneratingImage: false } : s));
      }
    } catch (err) {
      console.error("Work Together error:", err);
      // Fallback to blank if generation fails
      setSlides(curr => curr.map(s => s.id === tempId ? { ...tempSlide, title: "New Slide", isGeneratingImage: false } : s));
      if (err instanceof AIProviderError) {
        setErrorModal({ title: 'Activity Generation Failed', message: err.userMessage });
      }
    }
  };

  const handleInsertClassChallengeSlide = async (index: number) => {
    if (!provider) {
      setErrorModal({ title: 'AI Not Configured', message: 'Please configure your AI provider in Settings.' });
      return;
    }

    // Source slide is the slide ABOVE the + button (what we're creating challenge for)
    const source = index >= 0 ? slides[index] : undefined;
    if (!source) {
      setErrorModal({ title: 'Cannot Create Challenge', message: 'Need a slide above to create a challenge for.' });
      return;
    }

    const tempId = `temp-challenge-${Date.now()}`;
    const tempSlide: Slide = {
      id: tempId,
      title: "Creating Challenge...",
      content: ["Generating challenge prompt...", "Preparing facilitation tips..."],
      speakerNotes: "",
      imagePrompt: "",
      isGeneratingImage: true,
      layout: 'class-challenge'
    };

    // Insert temp slide after source
    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, tempSlide);
    setSlides(newSlides);
    setActiveSlideIndex(index + 1);

    try {
      const challenge = await provider.generateClassChallengeSlide(lessonTitle, source, slides);

      setSlides(curr => curr.map(s => s.id === tempId
        ? { ...challenge, id: tempId, contributions: [], isGeneratingImage: autoGenerateImages }
        : s
      ));

      if (autoGenerateImages) {
        const img = await provider.generateSlideImage(challenge.imagePrompt, challenge.layout);
        setSlides(curr => curr.map(s => s.id === tempId ? { ...s, imageUrl: img, isGeneratingImage: false } : s));
      }
    } catch (err) {
      console.error("Class Challenge error:", err);
      // Fallback to blank if generation fails
      setSlides(curr => curr.map(s => s.id === tempId ? { ...tempSlide, title: "New Slide", isGeneratingImage: false } : s));
      if (err instanceof AIProviderError) {
        setErrorModal({ title: 'Challenge Generation Failed', message: err.userMessage });
      }
    }
  };

  const handleShufflePairs = (slideId: string) => {
    if (studentNames.length < 2) return;

    const newPairs = generatePairs(studentNames);
    setSlides(curr => curr.map(s =>
      s.id === slideId ? { ...s, pairs: newPairs } : s
    ));
  };

  const handleAddNames = () => {
    const names = nameInput.split(/[,|\n]/).map(n => n.trim()).filter(n => n !== '');
    setStudentNames(prev => Array.from(new Set([...prev, ...names])));
    setNameInput('');
    setActiveClassName(null); // Clear active class when manually modifying students
  };

  // ============================================================================
  // Class Bank handlers
  // ============================================================================

  const handleSaveClassBank = (name: string) => {
    saveClass(name, studentNames);
    setShowSaveClassModal(false);
    addToast('Class saved!', 3000, 'success');
  };

  const handleLoadClassBank = (classData: SavedClass) => {
    // Check if current students are "dirty" (not from a loaded class)
    const hasUnsavedStudents = studentNames.length > 0 && activeClassName === null;
    if (hasUnsavedStudents) {
      if (!window.confirm('You have students not saved. Load anyway?')) {
        return;
      }
    }
    setStudentNames(classData.students);
    setStudentGrades(classData.studentData || []);
    setActiveClassName(classData.name);
    setShowLoadDropdown(false);
    addToast(`Loaded ${classData.name}`, 3000, 'success');
  };

  // Handle rename with active class sync
  const handleRenameClass = (classId: string, newName: string) => {
    // Find the class being renamed
    const targetClass = classes.find(c => c.id === classId);

    // If this is the currently active class, update activeClassName
    if (targetClass && targetClass.name === activeClassName) {
      setActiveClassName(newName);
    }

    renameClass(classId, newName);
  };

  // Handle student update
  const handleUpdateClassStudents = (classId: string, students: string[]) => {
    updateClassStudents(classId, students);
  };

  // Handle delete with toast undo
  const handleDeleteClass = (classId: string, className: string) => {
    // Store for potential undo
    const deletedClass = classes.find(c => c.id === classId);

    // Clear activeClassName if deleting the active class
    if (className === activeClassName) {
      setActiveClassName(null);
    }

    // Delete the class
    deleteClass(classId);

    // Show toast with undo option
    addToast(
      `Deleted "${className}"`,
      5000,
      'info',
      {
        label: 'Undo',
        onClick: () => {
          if (deletedClass) {
            // Re-save the class (will create with same data)
            saveClass(deletedClass.name, deletedClass.students);
            addToast(`Restored "${deletedClass.name}"`, 3000, 'success');
          }
        }
      }
    );
  };

  // Handle grade update - stores in local state (synced to class bank on save)
  const handleUpdateStudentGrade = (studentName: string, grade: import('./types').GradeLevel | null) => {
    setStudentGrades(prev => {
      const existing = prev.find(s => s.name === studentName);
      if (existing) {
        // Update existing
        return prev.map(s => s.name === studentName ? { ...s, grade } : s);
      } else {
        // Add new
        return [...prev, { name: studentName, grade }];
      }
    });

    // Also update class bank if a class is active
    if (activeClassName) {
      const activeClass = classes.find(c => c.name === activeClassName);
      if (activeClass) {
        updateStudentGrade(activeClass.id, studentName, grade);
      }
    }
  };

  const startPresentation = (fromIndex: number) => {
    setPresentationStartIndex(fromIndex);
    setAppState(AppState.PRESENTING);
  };

  // ============================================================================
  // Auto-save integration
  // ============================================================================

  // Auto-save while editing with slides
  const autoSaveData = useMemo<AutoSaveData | null>(() => {
    if (appState !== AppState.EDITING || slides.length === 0) return null;
    return { slides, studentNames, studentGrades, lessonText, lessonTitle };
  }, [appState, slides, studentNames, studentGrades, lessonText, lessonTitle]);

  useAutoSave(autoSaveData, appState === AppState.EDITING && slides.length > 0);

  // ============================================================================
  // Recovery check on mount
  // ============================================================================

  useEffect(() => {
    if (hasAutoSave()) {
      const data = getAutoSave();
      const timestamp = getAutoSaveTimestamp();
      if (data && timestamp) {
        setRecoveryData(data);
        setRecoveryTimestamp(timestamp);
        setShowRecoveryModal(true);
      }
    }
  }, []);

  const handleRecoveryRestore = useCallback(() => {
    if (recoveryData) {
      setSlides(recoveryData.slides);
      setStudentNames(recoveryData.studentNames);
      setStudentGrades(recoveryData.studentGrades || []);
      setLessonText(recoveryData.lessonText);
      setLessonTitle(recoveryData.lessonTitle);
      setAppState(AppState.EDITING);
      clearAutoSave();
    }
    setShowRecoveryModal(false);
    setRecoveryData(null);
  }, [recoveryData]);

  const handleRecoveryDiscard = useCallback(() => {
    clearAutoSave();
    setShowRecoveryModal(false);
    setRecoveryData(null);
  }, []);

  // ============================================================================
  // Save flow
  // ============================================================================

  const handleSaveClick = useCallback(() => {
    // Check file size first (use local studentGrades)
    const file = createCueFile(lessonTitle, slides, studentNames, lessonText, undefined, studentGrades);
    const sizeInfo = checkFileSize(file);

    if (sizeInfo.exceeds50MB) {
      addToast(`This presentation is over 50MB (${sizeInfo.sizeMB.toFixed(1)}MB). It may take longer to save and load.`, 5000, 'warning');
    }

    // Open filename prompt with lesson title as default
    setPendingSaveFilename(lessonTitle || 'New Lesson');
    setShowFilenamePrompt(true);
  }, [lessonTitle, slides, studentNames, lessonText, addToast, studentGrades]);

  const handleSaveConfirm = useCallback(() => {
    // Use local studentGrades
    const file = createCueFile(lessonTitle, slides, studentNames, lessonText, undefined, studentGrades);
    downloadPresentation(file, pendingSaveFilename);
    addToast('Presentation saved successfully!', 3000, 'success');
    setHasUnsavedChanges(false);
    setShowFilenamePrompt(false);
    setPendingSaveFilename('');
  }, [lessonTitle, slides, studentNames, lessonText, pendingSaveFilename, addToast, studentGrades]);

  const handleSaveCancel = useCallback(() => {
    setShowFilenamePrompt(false);
    setPendingSaveFilename('');
  }, []);

  // ============================================================================
  // Load flow
  // ============================================================================

  const handleLoadFile = useCallback(async (file: File) => {
    // Warn about unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Continue loading?');
      if (!confirmed) return;
    }

    try {
      const cueFile = await readCueFile(file);
      setSlides(cueFile.content.slides);
      const loadedStudents = cueFile.content.studentNames || [];
      setStudentNames(loadedStudents);
      setLessonText(cueFile.content.lessonText || '');
      setLessonTitle(cueFile.title);
      setAppState(AppState.EDITING);
      setActiveSlideIndex(0);
      clearAutoSave();
      setHasUnsavedChanges(false);

      // Restore grade data if present
      const loadedGrades = cueFile.content.studentGrades || [];
      setStudentGrades(loadedGrades);

      // Also save as class with grades if students present
      if (loadedGrades.length > 0 && loadedStudents.length > 0) {
        const className = cueFile.title || 'Imported Class';
        saveClass(className, loadedStudents, loadedGrades);
        setActiveClassName(className);
      }

      addToast('Presentation loaded successfully!', 3000, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load file.';
      addToast(message, 5000, 'error');
    }
  }, [hasUnsavedChanges, addToast, saveClass]);

  const handleLoadClick = useCallback(() => {
    loadFileInputRef.current?.click();
  }, []);

  const handleLoadInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLoadFile(file);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  }, [handleLoadFile]);

  // ============================================================================
  // Drag-drop integration
  // ============================================================================

  useDragDrop(
    handleLoadFile,
    !showSettings && !showResourceHub && appState !== AppState.PRESENTING && !showFilenamePrompt && !showRecoveryModal,
    (file) => addToast(`"${file.name}" is not a .cue or .pipi file. Only .cue and .pipi files can be loaded.`, 5000, 'error')
  );

  // ============================================================================
  // Unsaved changes tracking
  // ============================================================================

  // Track changes to mark as unsaved (skip initial render with ref)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Only track changes when in editing state
    if (appState === AppState.EDITING) {
      setHasUnsavedChanges(true);
    }
  }, [slides, studentNames, lessonText, lessonTitle, appState]);

  // beforeunload warning when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom message, show generic warning
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (appState === AppState.PRESENTING) {
    return (
      <PresentationView
        slides={slides}
        onExit={() => setAppState(AppState.EDITING)}
        studentNames={studentNames}
        studentData={studentGrades}
        initialSlideIndex={presentationStartIndex}
        provider={provider}
        onError={handleComponentError}
        onRequestAI={handleRequestAI}
        onUpdateSlide={handleUpdateSlide}
      />
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
    <div className="h-screen bg-violet-50/50 dark:bg-slate-950 font-poppins flex flex-col overflow-hidden text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* GLOBAL HEADER */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-50 shadow-sm relative transition-colors duration-300">
        <div className="flex items-center gap-2">
          {/* Whiteboard/Screen Icon */}
          <svg className="w-7 h-7 text-violet-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Screen frame */}
            <rect x="2" y="3" width="20" height="14" rx="2" />
            {/* Content lines */}
            <line x1="6" y1="7" x2="10" y2="7" />
            <line x1="6" y1="10" x2="14" y2="10" />
            <line x1="6" y1="13" x2="11" y2="13" />
            {/* Stand */}
            <line x1="12" y1="17" x2="12" y2="21" />
            <line x1="8" y1="21" x2="16" y2="21" />
          </svg>
          <h1 className="font-fredoka text-2xl font-bold text-violet-600 dark:text-amber-400 tracking-tight">Cue</h1>
        </div>
        
        <div className="flex items-center gap-4">
             {/* SETTINGS GEAR */}
            <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Settings"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

             {/* THEME TOGGLE */}
            <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Toggle Dark Mode"
            >
                {isDarkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
            </button>

            {appState === AppState.EDITING && (
            <div className="flex items-center gap-3">
                <Button
                   variant="secondary"
                   className="!py-1.5 !px-4 text-sm !border-pink-200 !text-pink-600 dark:!border-pink-900 dark:!text-pink-400 dark:hover:!bg-pink-900/20"
                   onClick={() => setShowResourceHub(true)}
                >
                    <span className="mr-1">🖨️</span> Resources
                </Button>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <Button variant="secondary" className="!py-1.5 !px-4 text-sm" onClick={handleLoadClick}>Load</Button>
                <Button variant="secondary" className="!py-1.5 !px-4 text-sm" onClick={handleSaveClick}>Save</Button>
                <Button variant="secondary" className="!py-1.5 !px-4 text-sm" onClick={() => exportToPowerPoint(slides, lessonTitle)}>Export PPTX</Button>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <Button variant="secondary" className="!py-1.5 !px-4 text-sm" onClick={() => startPresentation(activeSlideIndex)}>Present from current</Button>
                <Button className="!py-1.5 !px-4 text-sm" onClick={() => startPresentation(0)}>Present</Button>
            </div>
            )}

            {/* Hidden file input for load */}
            <input
              type="file"
              accept=".cue,.pipi"
              onChange={handleLoadInputChange}
              style={{ display: 'none' }}
              ref={loadFileInputRef}
            />
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {showResourceHub && (
            <ResourceHub
                lessonText={lessonText}
                slideContext={JSON.stringify(slides)}
                onClose={() => setShowResourceHub(false)}
                provider={provider}
                onError={handleComponentError}
                onRequestAI={handleRequestAI}
            />
        )}

        {showSettings && (
            <SettingsModal
              onClose={() => {
                setShowSettings(false);
                setSettingsAutoFocus(false);
                // Re-read settings from localStorage after modal closes
                // This ensures App.tsx picks up any changes saved by the modal
                refreshSettings();
              }}
              autoFocusApiKey={settingsAutoFocus}
            />
        )}

        {appState === AppState.INPUT && (
          <div className="flex-1 overflow-y-auto py-12 px-6 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
              {/* Landing Page Logo */}
              <div className="flex flex-col items-center mb-8 animate-fade-in">
                <svg className="w-24 h-24 text-violet-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {/* Screen frame */}
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  {/* Content lines */}
                  <line x1="6" y1="7" x2="10" y2="7" />
                  <line x1="6" y1="10" x2="14" y2="10" />
                  <line x1="6" y1="13" x2="11" y2="13" />
                  {/* Stand */}
                  <line x1="12" y1="17" x2="12" y2="21" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                </svg>
                <h2 className="font-fredoka text-6xl font-bold text-violet-600 dark:text-amber-400 mt-2">Cue</h2>
              </div>

              <div className="text-center mb-10 animate-fade-in">
                <h2 className="text-5xl font-fredoka font-bold text-slate-800 dark:text-white mb-4 drop-shadow-sm">Design Your Lesson</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg">Upload a document or paste notes. Gemini analyzes tables & charts visually.</p>
              </div>
              
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl dark:shadow-black/50 p-8 border border-slate-200 dark:border-slate-800 animate-fade-in relative z-10 transition-colors duration-300">

                {/* Dual Upload Zones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Lesson Plan PDF Upload (green theme) */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[180px] ${uploadedFile ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700' : 'border-slate-200 dark:border-slate-700 hover:border-green-400 dark:hover:border-green-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf"
                    />

                    {isProcessingFile ? (
                      <div className="flex flex-col items-center animate-pulse">
                        <div className="w-10 h-10 border-4 border-green-500 dark:border-green-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Analyzing...</p>
                      </div>
                    ) : uploadedFile ? (
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg mb-3">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-white text-sm truncate max-w-full px-2">{uploadedFile.name}</p>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">Lesson plan ready</p>
                        <button onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setPageImages([]); setLessonText(''); }} className="mt-2 p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-14 h-14 bg-green-50 dark:bg-green-900/30 text-green-500 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Lesson Plan PDF</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">AI creates fresh slides</p>
                      </div>
                    )}
                  </div>

                  {/* Existing Presentation PDF Upload (blue theme) */}
                  <div
                    onClick={() => existingPptInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[180px] ${existingPptFile ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <input
                      type="file"
                      ref={existingPptInputRef}
                      onChange={handlePptFileChange}
                      className="hidden"
                      accept=".pdf"
                    />

                    {isProcessingPpt ? (
                      <div className="flex flex-col items-center animate-pulse">
                        <div className="w-10 h-10 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Analyzing...</p>
                      </div>
                    ) : existingPptFile ? (
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg mb-3">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-white text-sm truncate max-w-full px-2">{existingPptFile.name}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Presentation ready</p>
                        <button onClick={(e) => { e.stopPropagation(); setExistingPptFile(null); setExistingPptImages([]); setExistingPptText(''); }} className="mt-2 p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Existing Presentation</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">PDF export from PowerPoint</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mode Indicator */}
                {uploadMode !== 'none' && (
                  <div className={`mb-6 p-4 rounded-xl border ${
                    uploadMode === 'fresh' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
                    uploadMode === 'refine' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' :
                    'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        uploadMode === 'fresh' ? 'bg-green-500 text-white' :
                        uploadMode === 'refine' ? 'bg-blue-500 text-white' :
                        'bg-purple-500 text-white'
                      }`}>
                        {uploadMode === 'fresh' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
                        {uploadMode === 'refine' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                        {uploadMode === 'blend' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${
                          uploadMode === 'fresh' ? 'text-green-700 dark:text-green-300' :
                          uploadMode === 'refine' ? 'text-blue-700 dark:text-blue-300' :
                          'text-purple-700 dark:text-purple-300'
                        }`}>
                          {uploadMode === 'fresh' && 'Fresh Generation'}
                          {uploadMode === 'refine' && 'Refine Mode'}
                          {uploadMode === 'blend' && 'Blend Mode'}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {uploadMode === 'fresh' && 'AI creates new slides from your lesson plan'}
                          {uploadMode === 'refine' && 'AI enhances your existing presentation'}
                          {uploadMode === 'blend' && 'AI combines lesson content with your slides'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative mb-6">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-slate-100 dark:bg-slate-800 -z-10"></div>
                    <span className="px-4 bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mx-auto block w-fit">Or paste text below</span>
                </div>

                <textarea 
                  value={lessonText}
                  onChange={(e) => setLessonText(e.target.value)}
                  placeholder="Paste additional notes or curriculum details here..."
                  className="w-full h-48 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border-0 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-amber-500/20 text-slate-700 dark:text-slate-300 text-lg transition-all mb-6 shadow-inner resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />

                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-8">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm ${autoGenerateImages ? 'bg-indigo-100 dark:bg-amber-900/40 text-indigo-600 dark:text-amber-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                            {autoGenerateImages ? '✨' : '🖼️'}
                        </div>
                        <div>
                            <p className="font-bold text-slate-700 dark:text-slate-300">Auto-generate AI Visuals</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">Enable to create unique artwork for every slide automatically.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={autoGenerateImages}
                        onChange={() => setAutoGenerateImages(!autoGenerateImages)}
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-amber-500"></div>
                    </label>
                </div>

                {error && <p className="mt-4 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100 mb-6">⚠️ {error}</p>}
                
                <div className="flex justify-center gap-4">
                  <Button
                    variant="secondary"
                    onClick={handleLoadClick}
                    className="px-8 py-4 text-lg"
                  >
                    Load Presentation
                  </Button>
                  <div className="relative">
                    <Button
                      onClick={handleGenerate}
                      className={`px-16 py-5 text-xl rounded-2xl shadow-indigo-100 dark:shadow-none ${!provider ? 'opacity-50' : ''}`}
                      isLoading={isGenerating}
                      disabled={uploadMode === 'none' || isGenerating}
                      title={!provider ? 'Add API key in Settings to enable' : undefined}
                    >
                      {uploadMode === 'refine' ? 'Refine Presentation' : uploadMode === 'blend' ? 'Enhance Slides' : 'Generate Slideshow'}
                    </Button>
                    {!provider && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-slate-500 dark:bg-slate-600 rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-4">
                  or drag a <span className="font-mono text-indigo-500 dark:text-amber-400">.cue</span> file anywhere to open
                </p>
              </div>
            </div>
          </div>
        )}

        {appState === AppState.PROCESSING_TEXT && (
           <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center px-6">
              <div className="w-20 h-20 relative mb-8">
                <div className="absolute inset-0 border-4 border-indigo-600 dark:border-amber-500 border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-4 border-4 border-amber-400 dark:border-indigo-400 border-b-transparent dark:border-b-transparent rounded-full animate-spin [animation-direction:reverse]"></div>
              </div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white font-fredoka">Deep Learning Architecture</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg max-w-md">
                Generating with {settings.provider === 'gemini' ? 'Gemini' :
                                 settings.provider === 'claude' ? 'Claude' : 'AI'}...
              </p>
              <p className="text-slate-400 dark:text-slate-500 mt-1 text-sm">Mapping pedagogical phases and interpreting visual data from your document.</p>

              <div className="mt-12 flex gap-4 overflow-hidden py-4 opacity-30">
                  {pageImages.map((img, i) => (
                      <img key={i} src={img} className="h-32 rounded-lg shadow-sm border border-slate-700 grayscale invert dark:invert-0" alt="Document context" />
                  ))}
              </div>
           </div>
        )}

        {appState === AppState.EDITING && (
          <div className="flex-1 flex flex-col overflow-hidden">
             {/* TOP BAR - Clean Edit Class Button */}
             <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center gap-4 shrink-0 transition-colors duration-300 relative z-10">
                {/* Edit Class Button */}
                <button
                  onClick={() => setShowStudentListModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-amber-400 border border-indigo-200 dark:border-slate-700 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span className="text-sm font-bold">Edit Class List</span>
                  {studentNames.length > 0 && (
                    <span className="text-xs bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded">
                      {studentNames.length}
                    </span>
                  )}
                  {activeClassName && (
                    <span className="text-[10px] bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 px-1.5 py-0.5 rounded font-medium">
                      {activeClassName}
                    </span>
                  )}
                </button>

                {/* Graded count hint */}
                {(() => {
                  const activeClass = activeClassName ? classes.find(c => c.name === activeClassName) : null;
                  const gradedCount = activeClass?.studentData?.filter(s => s.grade).length || 0;
                  if (gradedCount > 0) {
                    return (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {gradedCount} graded
                      </span>
                    );
                  }
                  return null;
                })()}
             </div>

             {/* MAIN WORKSPACE: Sidebar + Stage */}
             <div className="flex-1 flex overflow-hidden">
                {/* THUMBNAIL SIDEBAR */}
                <aside className="w-64 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto px-4 py-2 shrink-0 no-scrollbar transition-colors duration-300">
                    <div className="mb-4 pt-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Lesson Flow</label>
                        <input 
                          value={lessonTitle}
                          onChange={(e) => setLessonTitle(e.target.value)}
                          className="w-full bg-transparent font-fredoka font-bold text-slate-700 dark:text-slate-200 focus:outline-none border-b border-transparent focus:border-indigo-500 dark:focus:border-amber-500 truncate"
                        />
                    </div>

                    <div className="space-y-0.5">
                        <InsertPoint
                            onClickBlank={() => handleInsertBlankSlide(-1)}
                            onClickExemplar={() => handleInsertExemplarSlide(-1)}
                            onClickElaborate={() => handleInsertElaborateSlide(-1)}
                            onClickWorkTogether={() => handleInsertWorkTogetherSlide(-1)}
                            onClickClassChallenge={() => handleInsertClassChallengeSlide(-1)}
                        />
                        
                        {slides.map((slide, idx) => (
                           <React.Fragment key={slide.id}>
                               <button 
                                 onClick={() => setActiveSlideIndex(idx)}
                                 className={`w-full group text-left rounded-xl p-3 border transition-all relative ${activeSlideIndex === idx ? 'bg-white dark:bg-slate-800 border-indigo-600 dark:border-amber-500 shadow-sm ring-1 ring-indigo-100 dark:ring-amber-900/50 translate-x-1' : 'bg-white/40 dark:bg-slate-800/30 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                               >
                                  <div className="flex gap-3 items-start">
                                     <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeSlideIndex === idx ? 'bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900' : 'bg-slate-300 dark:bg-slate-700 text-white dark:text-slate-400'}`}>{idx + 1}</span>
                                     <div className="flex-1 min-w-0">
                                        <h4 className={`text-[11px] font-bold truncate ${activeSlideIndex === idx ? 'text-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{slide.title || 'Untitled Slide'}</h4>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{slide.content[0] || 'No content'}</p>
                                     </div>
                                  </div>
                                  
                                  {/* Thumbnail preview bar */}
                                  <div className="mt-2 h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                                     <div className={`h-full ${activeSlideIndex === idx ? 'bg-indigo-500 dark:bg-amber-500' : 'bg-indigo-400/30 dark:bg-slate-600'}`} style={{ width: slide.imageUrl ? '100%' : '30%' }}></div>
                                  </div>

                                  {/* Interactive Flag Toggle on Thumbnail */}
                                  <div 
                                      onClick={(e) => { e.stopPropagation(); handleUpdateSlide(slide.id, { hasQuestionFlag: !slide.hasQuestionFlag }); }}
                                      className={`absolute top-1 right-1 p-1 rounded-full transition-all cursor-pointer z-10 hover:scale-110 ${slide.hasQuestionFlag ? 'bg-amber-400 text-slate-900 shadow-md scale-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 scale-90 opacity-0 group-hover:opacity-100'}`}
                                      title="Toggle Question Flag"
                                  >
                                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  </div>
                               </button>
                               <InsertPoint
                                 onClickBlank={() => handleInsertBlankSlide(idx)}
                                 onClickExemplar={() => handleInsertExemplarSlide(idx)}
                                 onClickElaborate={() => handleInsertElaborateSlide(idx)}
                                 onClickWorkTogether={() => handleInsertWorkTogetherSlide(idx)}
                                 onClickClassChallenge={() => handleInsertClassChallengeSlide(idx)}
                               />
                           </React.Fragment>
                        ))}
                    </div>
                </aside>

                {/* EDITING STAGE */}
                <section className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 flex justify-center items-start transition-colors duration-300">
                    <div className="max-w-5xl w-full">
                        {activeSlide ? (
                           <div className="animate-fade-in">
                               <SlideCard
                                 slide={activeSlide}
                                 index={activeSlideIndex}
                                 onUpdate={handleUpdateSlide}
                                 onDelete={handleDeleteSlide}
                                 onRegenerateImage={async (id, p) => {
                                    if (!provider) {
                                      setEnableAIModal({ featureName: 'regenerate this image' });
                                      return;
                                    }
                                    handleUpdateSlide(id, {isGeneratingImage: true});
                                    const img = await provider.generateSlideImage(p, activeSlide.layout);
                                    handleUpdateSlide(id, {imageUrl: img, isGeneratingImage: false});
                                 }}
                                 onRevise={handleReviseSlide}
                                 onInsertAfter={() => handleInsertBlankSlide(activeSlideIndex)}
                                 isAIAvailable={provider !== null}
                                 onRequestAI={handleRequestAI}
                               />
                               <div className="mt-6 flex justify-between items-center text-slate-400 dark:text-slate-600 px-4">
                                   <div className="text-[10px] font-bold uppercase tracking-widest flex gap-4">
                                       <span>Words: {activeSlide.speakerNotes.split(' ').length}</span>
                                       <span>Visual: {activeSlide.layout}</span>
                                   </div>
                                   <div className="flex gap-2">
                                       <button 
                                         onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                                         disabled={activeSlideIndex === 0}
                                         className="p-2 hover:text-indigo-600 dark:hover:text-amber-500 disabled:opacity-30 transition-colors"
                                       >
                                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                       </button>
                                       <button 
                                         onClick={() => setActiveSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                                         disabled={activeSlideIndex === slides.length - 1}
                                         className="p-2 hover:text-indigo-600 dark:hover:text-amber-500 disabled:opacity-30 transition-colors"
                                       >
                                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                       </button>
                                   </div>
                               </div>
                           </div>
                        ) : (
                           <div className="h-[60vh] flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                               <div className="w-20 h-20 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl mb-4"></div>
                               <p className="font-fredoka text-xl text-slate-400 dark:text-slate-500">Select a slide or generate a lesson</p>
                           </div>
                        )}
                    </div>
                </section>
             </div>
          </div>
        )}
      </main>

      {/* Enable AI Modal */}
      {enableAIModal && (
        <EnableAIModal
          featureName={enableAIModal.featureName}
          onOpenSettings={handleOpenSettingsFromEnableModal}
        />
      )}

      {/* Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              {errorModal.title}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {errorModal.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setErrorModal(null); setShowSettings(true); }}
                className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-amber-400 hover:underline"
              >
                Open Settings
              </button>
              <button
                onClick={() => setErrorModal(null)}
                className="px-4 py-2 bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 rounded-lg font-medium hover:opacity-90"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filename Prompt Modal */}
      {showFilenamePrompt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 font-fredoka">
              Save Presentation
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Enter a filename for your presentation
            </p>
            <div className="flex items-center gap-2 mb-6">
              <input
                type="text"
                value={pendingSaveFilename}
                onChange={(e) => setPendingSaveFilename(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveConfirm();
                  if (e.key === 'Escape') handleSaveCancel();
                }}
                autoFocus
                className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-amber-500"
              />
              <span className="text-slate-400 dark:text-slate-500 text-sm">.cue</span>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleSaveCancel}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfirm}
                disabled={!pendingSaveFilename.trim()}
                className="px-4 py-2 bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Modal */}
      {showRecoveryModal && recoveryData && (
        <RecoveryModal
          savedTitle={recoveryData.lessonTitle}
          savedTimestamp={recoveryTimestamp}
          onRestore={handleRecoveryRestore}
          onDiscard={handleRecoveryDiscard}
        />
      )}

      {/* Class Bank Save Modal */}
      {showSaveClassModal && (
        <ClassBankSaveModal
          onSave={handleSaveClassBank}
          onClose={() => setShowSaveClassModal(false)}
          existingNames={classes.map(c => c.name)}
        />
      )}

      {/* Class Bank Management Modal */}
      {showManageModal && (
        <ClassManagementModal
          classes={classes}
          onClose={() => setShowManageModal(false)}
          onRename={handleRenameClass}
          onUpdateStudents={handleUpdateClassStudents}
          onDelete={handleDeleteClass}
          onUpdateGrade={updateStudentGrade}
          activeClassName={activeClassName}
        />
      )}

      {/* Student List Modal */}
      {showStudentListModal && (
        <StudentListModal
          studentNames={studentNames}
          studentData={studentGrades}
          onUpdateStudents={(students) => {
            setStudentNames(students);
            // Remove grades for students no longer in the list
            setStudentGrades(prev => prev.filter(sg => students.includes(sg.name)));
            // If we had an active class, also update the class bank
            if (activeClassName) {
              const activeClass = classes.find(c => c.name === activeClassName);
              if (activeClass) {
                updateClassStudents(activeClass.id, students);
              }
            }
          }}
          onUpdateGrade={handleUpdateStudentGrade}
          onClose={() => setShowStudentListModal(false)}
          classes={classes}
          onSaveClass={() => {
            setShowStudentListModal(false);
            setShowSaveClassModal(true);
          }}
          onLoadClass={(classData) => {
            handleLoadClassBank(classData);
          }}
          activeClassName={activeClassName}
          onManageClasses={() => {
            setShowStudentListModal(false);
            setShowManageModal(true);
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
    </div>
  );
}

export default App;
