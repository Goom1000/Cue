import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Slide, PresentationMessage, BROADCAST_CHANNEL_NAME, GameSyncState, GradeLevel, StudentWithGrade } from '../types';
import Button from './Button';
import { MarkdownText, SlideContentRenderer } from './SlideRenderers';
import { QuizQuestion } from '../services/geminiService';
import { AIProviderInterface, AIProviderError } from '../services/aiProvider';
import useBroadcastSync from '../hooks/useBroadcastSync';
import useWindowManagement from '../hooks/useWindowManagement';
import useKeyboardNavigation from '../hooks/useKeyboardNavigation';
import ManualPlacementGuide from './ManualPlacementGuide';
import ConnectionStatus from './ConnectionStatus';
import PermissionRecovery from './PermissionRecovery';
import NextSlidePreview from './NextSlidePreview';
import { useToast, ToastContainer } from './Toast';

// Fisher-Yates shuffle - unbiased O(n) randomization
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Targeted mode cycling state - tracks student order and progress
interface TargetedCyclingState {
  shuffledOrder: string[];     // All students with grades in random order
  currentIndex: number;        // Index of next student to ask
  askedStudents: Set<string>;  // For manual marking (voluntary answers)
}

// --- QUIZ GAME MODAL COMPONENT ---
const QuizOverlay: React.FC<{
    slides: Slide[];
    currentIndex: number;
    onClose: () => void;
    provider: AIProviderInterface | null;
    onError: (title: string, message: string) => void;
    onRequestAI: (featureName: string) => void;
    onGameStateChange: (state: GameSyncState | null) => void;
}> = ({ slides, currentIndex, onClose, provider, onError, onRequestAI, onGameStateChange }) => {
    const [mode, setMode] = useState<'setup' | 'loading' | 'play' | 'summary'>('setup');
    const [numQuestions, setNumQuestions] = useState(4);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [qIndex, setQIndex] = useState(0);
    const [reveal, setReveal] = useState(false);

    // Report game state changes to parent for broadcast
    useEffect(() => {
        // Only report syncable modes (not 'setup' which is teacher-only)
        if (mode === 'loading' || mode === 'play' || mode === 'summary') {
            onGameStateChange({
                mode,
                questions,
                currentQuestionIndex: qIndex,
                isAnswerRevealed: reveal
            });
        }
    }, [mode, questions, qIndex, reveal, onGameStateChange]);

    // Report null when closing (cleanup)
    useEffect(() => {
        return () => onGameStateChange(null);
    }, [onGameStateChange]);

    const handleStart = async () => {
        if (!provider) {
            onRequestAI('start the quiz game');
            onClose();
            return;
        }
        setMode('loading');
        try {
            const data = await provider.generateImpromptuQuiz(slides, currentIndex, numQuestions);
            setQuestions(data);
            setMode('play');
        } catch (e) {
            console.error(e);
            if (e instanceof AIProviderError) {
                onError('Quiz Generation Failed', e.userMessage);
            } else {
                onError('Error', 'Could not generate quiz. Please try again.');
            }
            onClose();
        }
    };

    const handleNext = () => {
        if (qIndex < questions.length - 1) {
            setQIndex(prev => prev + 1);
            setReveal(false);
        } else {
            setMode('summary');
        }
    };

    const renderShape = (idx: number) => {
        // 0: Triangle, 1: Diamond, 2: Circle, 3: Square
        const classes = "w-6 h-6 md:w-10 md:h-10 text-white/80";
        if (idx === 0) return <svg className={classes} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>;
        if (idx === 1) return <svg className={classes} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l10 10-10 10L2 12 12 2z"/></svg>;
        if (idx === 2) return <svg className={classes} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>;
        return <svg className={classes} viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18"/></svg>;
    };

    const bgColors = [
        "bg-red-600 border-red-800", // Triangle
        "bg-blue-600 border-blue-800", // Diamond
        "bg-amber-500 border-amber-700", // Circle
        "bg-green-600 border-green-800"  // Square
    ];

    return (
        <div className="absolute inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in font-poppins text-white">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {mode === 'setup' && (
                <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl text-center border-4 border-indigo-500">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
                        🎮
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 font-fredoka uppercase tracking-wide">Game Time!</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">Generate a quick quiz based on what the students have learned so far.</p>
                    
                    <div className="mb-8">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Number of Questions</label>
                        <div className="flex justify-center gap-3">
                            {[3, 5, 8].map(n => (
                                <button 
                                    key={n}
                                    onClick={() => setNumQuestions(n)}
                                    className={`w-16 h-12 rounded-xl font-bold text-lg border-b-4 active:border-b-0 active:translate-y-1 transition-all ${numQuestions === n ? 'bg-indigo-600 text-white border-indigo-800' : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-900'}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleStart}
                        className="w-full py-4 bg-green-500 hover:bg-green-400 text-white font-black text-xl rounded-2xl border-b-[6px] border-green-700 active:border-b-0 active:translate-y-1.5 transition-all shadow-xl uppercase tracking-wider"
                    >
                        Start Quiz
                    </button>
                </div>
            )}

            {mode === 'loading' && (
                 <div className="text-center">
                     <div className="relative w-24 h-24 mx-auto mb-8">
                         <div className="absolute inset-0 border-8 border-white/20 rounded-full"></div>
                         <div className="absolute inset-0 border-8 border-t-indigo-500 border-l-transparent border-r-transparent border-b-transparent rounded-full animate-spin"></div>
                         <div className="absolute inset-4 bg-indigo-600 rounded-full flex items-center justify-center text-3xl animate-pulse">🤖</div>
                     </div>
                     <h2 className="text-3xl font-bold font-fredoka animate-pulse">Creating Challenge...</h2>
                     <p className="text-indigo-200 mt-2">Analyzing slides and preparing questions</p>
                 </div>
            )}

            {mode === 'play' && questions.length > 0 && (
                <div className="w-full max-w-6xl h-full flex flex-col justify-between py-6">
                    <div className="text-center mb-6">
                         <span className="inline-block px-4 py-1 bg-white/10 rounded-full text-sm font-bold uppercase tracking-widest mb-4">Question {qIndex + 1} of {questions.length}</span>
                         <div className="bg-white text-slate-900 p-8 md:p-12 rounded-3xl shadow-2xl text-2xl md:text-4xl font-bold leading-tight min-h-[200px] flex items-center justify-center border-b-8 border-slate-200">
                             {questions[qIndex].question}
                         </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:gap-6 flex-1 min-h-0">
                        {questions[qIndex].options.map((opt, idx) => {
                            const isCorrect = idx === questions[qIndex].correctAnswerIndex;
                            const isDimmed = reveal && !isCorrect;

                            return (
                                <div 
                                    key={idx}
                                    className={`
                                        relative rounded-2xl p-6 md:p-8 flex items-center shadow-lg border-b-8 transition-all duration-500
                                        ${bgColors[idx]}
                                        ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100'}
                                    `}
                                >
                                    <div className="absolute top-4 left-4 opacity-50">{renderShape(idx)}</div>
                                    <span className="text-xl md:text-3xl font-bold text-white pl-12 md:pl-16 drop-shadow-md">{opt}</span>
                                    {reveal && isCorrect && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-green-600 p-2 rounded-full shadow-lg">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 flex justify-center gap-4">
                        {!reveal ? (
                             <button 
                                onClick={() => setReveal(true)}
                                className="px-8 py-3 bg-white text-indigo-900 font-bold text-xl rounded-full shadow-lg hover:scale-105 transition-transform"
                             >
                                Reveal Answer
                             </button>
                        ) : (
                            <div className="flex items-center gap-6 animate-fade-in w-full max-w-4xl">
                                <div className="flex-1 bg-indigo-900/50 p-4 rounded-xl border border-indigo-500/30">
                                    <span className="text-xs font-bold text-indigo-300 uppercase block mb-1">Explanation</span>
                                    <p className="text-lg">{questions[qIndex].explanation}</p>
                                </div>
                                <button 
                                    onClick={handleNext}
                                    className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xl rounded-2xl border-b-4 border-indigo-700 active:translate-y-1 active:border-b-0 transition-all shrink-0"
                                >
                                    Next Question ➔
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {mode === 'summary' && (
                <div className="text-center animate-fade-in">
                    <div className="text-8xl mb-6 animate-bounce">🏆</div>
                    <h2 className="text-5xl font-black font-fredoka mb-4">Quiz Complete!</h2>
                    <p className="text-2xl text-indigo-200 mb-10">Great job reviewing the lesson.</p>
                    <button 
                        onClick={onClose}
                        className="px-10 py-4 bg-white text-indigo-900 font-bold text-xl rounded-2xl shadow-xl hover:scale-105 transition-transform"
                    >
                        Back to Lesson
                    </button>
                </div>
            )}
        </div>
    );
};

interface PresentationViewProps {
  slides: Slide[];
  onExit: () => void;
  studentNames: string[];
  initialSlideIndex?: number;
  provider: AIProviderInterface | null;
  onError: (title: string, message: string) => void;
  onRequestAI: (featureName: string) => void;
}

const PresentationView: React.FC<PresentationViewProps> = ({ slides, onExit, studentNames, initialSlideIndex = 0, provider, onError, onRequestAI }) => {
  const isAIAvailable = provider !== null;
  const [currentIndex, setCurrentIndex] = useState(initialSlideIndex);
  const [visibleBullets, setVisibleBullets] = useState(0);
  const [showFullScript, setShowFullScript] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'row' | 'col'>('row');
  const [showPreview, setShowPreview] = useState(false);

  // Game/Quiz State
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [gameState, setGameState] = useState<GameSyncState | null>(null);
  const gameWasOpenRef = useRef(false);

  // Question Generation State
  const [quickQuestion, setQuickQuestion] = useState<{
    question: string;
    answer: string;
    level: string;
  } | null>(null);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);

  // BroadcastChannel sync with heartbeat enabled for connection monitoring
  const { lastMessage, postMessage, isConnected } = useBroadcastSync<PresentationMessage>(
    BROADCAST_CHANNEL_NAME,
    { enableHeartbeat: true }
  );
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);


  // Toast notifications for reconnection feedback
  const { toasts, removeToast } = useToast();

  // Window Management for display targeting
  const {
    isSupported,
    hasMultipleScreens,
    permissionState,
    secondaryScreen,
    requestPermission,
    isLoading
  } = useWindowManagement();

  // Helper function for permission-aware button label
  const getLaunchButtonLabel = (): string => {
    if (isLoading) return 'Checking displays...';
    if (isConnected) return 'Student Active';
    if (permissionState === 'granted') return 'Launch → External Display';
    return 'Launch Student View';
  };

  const currentSlide = slides[currentIndex];
  const totalBullets = currentSlide.content.length;

  // Clear question when slide changes
  useEffect(() => {
      setQuickQuestion(null);
  }, [currentIndex]);

  // Handle incoming messages (student requesting state)
  useEffect(() => {
    if (lastMessage?.type === 'STATE_REQUEST') {
      // Student connected, send current state
      postMessage({
        type: 'STATE_UPDATE',
        payload: { currentIndex, visibleBullets, slides }
      });
      // If game is active, also send game state
      if (gameState) {
        postMessage({
          type: 'GAME_STATE_UPDATE',
          payload: gameState
        });
      }
    }
  }, [lastMessage, currentIndex, visibleBullets, slides, postMessage, gameState]);

  // Broadcast state changes to student window
  useEffect(() => {
    postMessage({
      type: 'STATE_UPDATE',
      payload: { currentIndex, visibleBullets, slides }
    });
  }, [currentIndex, visibleBullets, slides, postMessage]);

  // Broadcast game state changes to student window
  useEffect(() => {
    if (gameState) {
      gameWasOpenRef.current = true;
      postMessage({
        type: 'GAME_STATE_UPDATE',
        payload: gameState
      });
    } else if (gameWasOpenRef.current) {
      postMessage({ type: 'GAME_CLOSE' });
      gameWasOpenRef.current = false;
    }
  }, [gameState, postMessage]);

  // Track connection state for potential future use
  const prevConnectedRef = useRef<boolean | null>(null);
  useEffect(() => {
    prevConnectedRef.current = isConnected;
  }, [isConnected]);


  // Calculate next slide for preview
  const nextSlide = slides[currentIndex + 1] || null;

  // Close student window via broadcast
  const handleCloseStudent = useCallback(() => {
    postMessage({ type: 'CLOSE_STUDENT' });
  }, [postMessage]);

  const handleGenerateQuestion = async (level: 'A' | 'B' | 'C' | 'D' | 'E') => {
      if (!provider) {
          onRequestAI(`generate a Grade ${level} question`);
          return;
      }
      setIsGeneratingQuestion(true);
      try {
          const result = await provider.generateQuestionWithAnswer(currentSlide.title, currentSlide.content, level);
          setQuickQuestion({ question: result.question, answer: result.answer, level: `Grade ${level}` });
      } catch (err) {
          if (err instanceof AIProviderError) {
              onError('Question Generation Failed', err.userMessage);
          } else {
              onError('Error', 'Could not generate question. Please try again.');
          }
      } finally {
          setIsGeneratingQuestion(false);
      }
  };

  // --- Student Assignment Logic ---
  const studentAssignments = useMemo(() => {
    if (studentNames.length === 0) return {};

    const slots: { slideIdx: number, segIdx: number }[] = [];
    slides.forEach((slide, sIdx) => {
      const segments = (slide.speakerNotes || "").split('👉');
      segments.forEach((seg, segIdx) => {
        if (seg.match(/STUDENT\s*READS?:?/gi) || segIdx > 0) {
          slots.push({ slideIdx: sIdx, segIdx: segIdx });
        }
      });
      
      const contentLen = slide.content.length;
      for (let i = 1; i <= contentLen; i++) {
          if (!slots.some(s => s.slideIdx === sIdx && s.segIdx === i)) {
              slots.push({ slideIdx: sIdx, segIdx: i });
          }
      }
    });

    if (slots.length === 0) return {};

    const sequence: string[] = [];
    const pool = [...studentNames];
    
    const shuffle = (arr: string[]) => {
      const newArr = [...arr];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      return newArr;
    };

    while (sequence.length < slots.length) {
      let round = shuffle(pool);
      if (sequence.length > 0 && pool.length > 1 && round[0] === sequence[sequence.length - 1]) {
         [round[0], round[round.length - 1]] = [round[round.length - 1], round[0]];
      }
      sequence.push(...round);
    }

    const map: Record<string, string> = {};
    slots.sort((a,b) => a.slideIdx !== b.slideIdx ? a.slideIdx - b.slideIdx : a.segIdx - b.segIdx);
    slots.forEach((slot, i) => {
      map[`${slot.slideIdx}-${slot.segIdx}`] = sequence[i];
    });
    return map;
  }, [slides, studentNames]);

  const currentScriptSegment = useMemo(() => {
      const rawScript = currentSlide.speakerNotes || "";
      const segments = rawScript.split('👉');
      
      if (showFullScript) return rawScript || "No notes available.";

      // INTRO
      if (visibleBullets === 0) {
           let intro = segments[0] || "";
           intro = intro.replace(/👉/g, '').trim();
           if (!intro) intro = "INTRO: Let's start by looking at " + currentSlide.title;
           if (!intro.toUpperCase().startsWith('INTRO:')) intro = "INTRO: " + intro;
           return intro;
      }

      // BULLET POINT
      const bulletIndex = visibleBullets - 1;
      const bulletText = (currentSlide.content[bulletIndex] || "").replace(/^\s*[\-\•\*\.]+\s*/, '');
      
      // Get AI Note (Teacher part)
      let aiNote = segments[visibleBullets] || "Let's discuss this further.";
      aiNote = aiNote.replace(/👉/g, '').trim();

      // Clean AI Note: Remove potential "Student Reads" hallucinations and strictly isolate Teacher Elaborates
      aiNote = aiNote.replace(/STUDENT READS?:?.*?(TEACHER ELABORATES?:?|$)/is, '$1').trim();
      aiNote = aiNote.replace(/TEACHER ELABORATES?:?/gi, '').trim();
      aiNote = aiNote.replace(/STUDENT READS?:?/gi, '').trim(); 

      // Determine Student Name
      const nameKey = `${currentIndex}-${visibleBullets}`;
      const studentName = studentAssignments[nameKey] ? studentAssignments[nameKey].toUpperCase() : "STUDENT";

      return `${studentName} READS:\n"${bulletText}"\n\nTEACHER ELABORATES:\n${aiNote}`;

  }, [currentSlide.speakerNotes, visibleBullets, showFullScript, studentAssignments, currentIndex, currentSlide.content, currentSlide.title]);

  const handleNext = () => {
    if (visibleBullets < totalBullets) setVisibleBullets(prev => prev + 1);
    else if (currentIndex < slides.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setVisibleBullets(0);
    }
  };

  const handlePrev = () => {
    if (visibleBullets > 0) setVisibleBullets(prev => prev - 1);
    else if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        setVisibleBullets(slides[currentIndex - 1].content.length);
    }
  };

  // Keyboard navigation with presenter remote support
  // Note: Escape closes student window (not exits presentation) per CONTEXT.md
  useKeyboardNavigation({
    onNext: handleNext,
    onPrev: handlePrev,
    onEscape: handleCloseStudent,
  });

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col text-white font-poppins h-screen w-screen overflow-hidden">
      
      {/* HEADER */}
      <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shadow-md z-50 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
              <span className="text-slate-400 font-mono text-xs">{currentIndex + 1}/{slides.length}</span>
              <h1 className="font-poppins font-semibold text-sm truncate tracking-tight">{currentSlide.title}</h1>
          </div>
          <div className="flex items-center gap-2">
               {/* Next Slide Preview Toggle */}
               <NextSlidePreview
                 nextSlide={nextSlide}
                 isVisible={showPreview}
                 onToggle={() => setShowPreview(prev => !prev)}
                 slides={slides}
               />

               {/* QUIZ BUTTON */}
               <div className="relative">
                 <button
                     onClick={() => setIsQuizModalOpen(true)}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 flex items-center gap-2 ${!isAIAvailable ? 'opacity-50' : ''}`}
                     title={!isAIAvailable ? 'Add API key in Settings to enable' : undefined}
                 >
                     <span>🎮</span> Game Mode
                 </button>
                 {!isAIAvailable && (
                   <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-500 rounded-full flex items-center justify-center">
                     <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                     </svg>
                   </span>
                 )}
               </div>

               <Button variant="ghost-dim" onClick={() => setLayoutMode(prev => prev === 'row' ? 'col' : 'row')} className="!px-3 !py-1 text-xs">
                   {layoutMode === 'row' ? 'Layout: Side' : 'Layout: Stack'}
               </Button>

               {/* Connection Status */}
               <ConnectionStatus isConnected={isConnected} />

               <button
                 onClick={() => {
                   // MUST be synchronous - no async/await before window.open
                   // This preserves user activation context to avoid popup blockers
                   const url = `${window.location.origin}${window.location.pathname}#/student`;

                   // Use pre-cached coordinates from hook (no async!)
                   // popup=yes forces a new window instead of a tab
                   let features = 'popup=yes,width=1280,height=720';
                   if (secondaryScreen) {
                     features = `popup=yes,left=${secondaryScreen.left},top=${secondaryScreen.top},` +
                                `width=${secondaryScreen.width},height=${secondaryScreen.height}`;
                   }

                   const studentWindow = window.open(url, 'pipi-student', features);

                   // Fallback: explicitly move window to target screen
                   // Some browsers ignore position in window.open features
                   if (studentWindow && secondaryScreen) {
                     try {
                       studentWindow.moveTo(secondaryScreen.left, secondaryScreen.top);
                       studentWindow.resizeTo(secondaryScreen.width, secondaryScreen.height);
                     } catch {
                       // moveTo may fail in some browsers - position from features is primary
                     }
                   }

                   // Check if popup was blocked
                   if (!studentWindow || studentWindow.closed || typeof studentWindow.closed === 'undefined') {
                     setPopupBlocked(true);
                   } else {
                     setPopupBlocked(false);
                     // Note: We don't need to track the window reference for communication
                     // BroadcastChannel handles all sync - the window is fire-and-forget
                     // Connection state is now derived from heartbeat acknowledgments

                    }
                 }}
                 disabled={isLoading || isConnected}
                 className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border flex items-center ${
                   isLoading
                     ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-wait'
                     : isConnected
                       ? 'bg-green-900/40 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)] cursor-not-allowed'
                       : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600'
                 }`}
               >
                 {permissionState === 'denied' && !isLoading && !isConnected && (
                   <svg
                     className="w-4 h-4 text-amber-400 mr-1"
                     fill="currentColor"
                     viewBox="0 0 20 20"
                   >
                     <path
                       fillRule="evenodd"
                       d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                       clipRule="evenodd"
                     />
                   </svg>
                 )}
                 {getLaunchButtonLabel()}
               </button>
               {/* Permission request link - only when prompt state and multi-screen */}
               {!isLoading && permissionState === 'prompt' && hasMultipleScreens && !isConnected && (
                 <button
                   onClick={requestPermission}
                   className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors ml-2"
                 >
                   Enable auto-placement
                 </button>
               )}
               {/* Recovery text - only when denied state and multi-screen */}
               {!isLoading && permissionState === 'denied' && hasMultipleScreens && !isConnected && (
                 <span className="text-xs text-slate-400 ml-2">
                   Permission denied.{' '}
                   <button
                     onClick={() => setShowRecoveryModal(true)}
                     className="text-amber-400 hover:text-amber-300 underline"
                   >
                     Learn how to reset
                   </button>
                 </span>
               )}

               {/* Manual Guide - shown for non-Chromium OR permission denied (but NOT when popup blocked) */}
               {!isLoading && hasMultipleScreens && (!isSupported || permissionState === 'denied') && !isConnected && !popupBlocked && (
                 <ManualPlacementGuide
                   studentUrl={`${window.location.origin}${window.location.pathname}#/student`}
                 />
               )}

               {popupBlocked && (
                 <div className="fixed top-16 right-4 z-50 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-xl max-w-sm animate-fade-in">
                   <div className="flex items-start gap-3">
                     <div className="text-amber-600 text-xl">!</div>
                     <div>
                       <h3 className="font-bold text-amber-800 text-sm">Popup Blocked</h3>
                       <p className="text-amber-700 text-xs mt-1">
                         Your browser blocked the student window.
                       </p>
                       <p className="text-amber-700 text-xs mt-2 font-medium">
                         Open this URL on the projector:
                       </p>
                       <code className="block bg-white px-2 py-1 rounded mt-1 text-xs font-mono text-amber-900 break-all">
                         {window.location.origin}{window.location.pathname}#/student
                       </code>
                       <div className="flex gap-2 mt-3">
                         <button
                           onClick={() => {
                             navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/student`);
                           }}
                           className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700"
                         >
                           Copy URL
                         </button>
                         <button
                           onClick={() => setPopupBlocked(false)}
                           className="px-3 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium hover:bg-amber-200"
                         >
                           Dismiss
                         </button>
                       </div>
                     </div>
                   </div>
                 </div>
               )}
               <Button variant="danger" onClick={onExit} title="Exit presentation" className="!py-1.5 !px-3 !text-xs">Exit</Button>
          </div>
      </div>

      {/* QUIZ OVERLAY PORTAL */}
      {isQuizModalOpen && createPortal(
          <QuizOverlay
              slides={slides}
              currentIndex={currentIndex}
              onClose={() => setIsQuizModalOpen(false)}
              provider={provider}
              onError={onError}
              onRequestAI={onRequestAI}
              onGameStateChange={setGameState}
          />,
          document.body
      )}

      <div className={`flex-1 flex overflow-hidden min-h-0 ${layoutMode === 'col' ? 'flex-col' : 'flex-row'}`}>
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
               <SlideContentRenderer slide={currentSlide} visibleBullets={visibleBullets} />
          </div>

          <div className={`bg-slate-900 border-slate-700 flex flex-col shadow-2xl z-40 shrink-0 transition-all duration-300 ${layoutMode === 'col' ? 'h-80 border-t w-full' : 'w-96 border-l h-full'}`}>
               <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center shrink-0">
                   <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Presenter Console</span>
                       <button onClick={() => setShowFullScript(!showFullScript)} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors uppercase font-bold tracking-tighter">
                           {showFullScript ? 'Close Full Script' : 'Full Script'}
                       </button>
                   </div>
                   <div className="flex gap-1.5">
                      <div className={`w-2 h-2 rounded-full border border-slate-600 ${visibleBullets === 0 ? 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]' : 'bg-slate-700'}`} />
                      {currentSlide.content.map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full border border-slate-600 transition-colors ${i + 1 <= visibleBullets ? 'bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'bg-slate-700'}`} />
                      ))}
                   </div>
               </div>

               <div className="flex-1 overflow-y-auto p-6 bg-[#0f172a] min-h-0 relative">
                   {currentSlide.hasQuestionFlag && (
                        <div className="mb-8 bg-amber-500 text-slate-900 rounded-xl p-4 shadow-[0_0_25px_rgba(245,158,11,0.3)] flex items-center gap-4 animate-fade-in border-2 border-amber-400">
                             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm animate-[pulse_2s_infinite]">
                                 <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                             </div>
                             <div>
                                 <h3 className="font-black uppercase tracking-widest text-sm">Question Focus Slide</h3>
                                 <p className="font-medium text-amber-900 text-sm leading-tight">Use the buttons below to check understanding before moving on.</p>
                             </div>
                        </div>
                   )}

                   <div className="text-xl md:text-2xl leading-relaxed font-sans text-slate-100 animate-fade-in whitespace-pre-wrap">
                       <MarkdownText text={currentScriptSegment} />
                   </div>
               </div>
               
               <div className="p-5 bg-slate-800 border-t border-slate-700 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
                   <button onClick={handleNext} title="Next (Right Arrow, Page Down, or Space)" className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 group">
                        {visibleBullets < totalBullets ? (
                          <><span>Reveal Point</span><span className="group-hover:translate-x-1 transition-transform">✨</span></>
                        ) : (
                          currentIndex === slides.length - 1 ? 'End Presentation' : <><span>Next Slide</span><span className="group-hover:translate-x-1 transition-transform">➔</span></>
                        )}
                   </button>
                   
                   {/* Differentiated Question Buttons - HIGHLIGHTED IF FLAGGED */}
                   <div className={`grid grid-cols-5 gap-2 mt-3 p-2 rounded-xl transition-all ${currentSlide.hasQuestionFlag ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : ''}`}>
                       {currentSlide.hasQuestionFlag && (
                           <div className="col-span-5 text-[10px] font-bold text-amber-500 uppercase tracking-widest text-center mb-1">
                               ⚡ Question Time ⚡
                           </div>
                       )}
                       <div className="relative">
                         <button
                           onClick={() => handleGenerateQuestion('A')}
                           className={`w-full bg-rose-800/50 hover:bg-rose-700 text-rose-200 border border-rose-700/50 rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${!isAIAvailable ? 'opacity-50' : ''}`}
                           title={!isAIAvailable ? 'Add API key in Settings to enable' : undefined}
                         >
                           A
                         </button>
                         {!isAIAvailable && (
                           <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-slate-500 rounded-full flex items-center justify-center">
                             <svg className="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                             </svg>
                           </span>
                         )}
                       </div>
                       <div className="relative">
                         <button
                           onClick={() => handleGenerateQuestion('B')}
                           className={`w-full bg-orange-800/50 hover:bg-orange-700 text-orange-200 border border-orange-700/50 rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${!isAIAvailable ? 'opacity-50' : ''}`}
                           title={!isAIAvailable ? 'Add API key in Settings to enable' : undefined}
                         >
                           B
                         </button>
                         {!isAIAvailable && (
                           <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-slate-500 rounded-full flex items-center justify-center">
                             <svg className="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                             </svg>
                           </span>
                         )}
                       </div>
                       <div className="relative">
                         <button
                           onClick={() => handleGenerateQuestion('C')}
                           className={`w-full bg-amber-800/50 hover:bg-amber-700 text-amber-200 border border-amber-700/50 rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${!isAIAvailable ? 'opacity-50' : ''}`}
                           title={!isAIAvailable ? 'Add API key in Settings to enable' : undefined}
                         >
                           C
                         </button>
                         {!isAIAvailable && (
                           <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-slate-500 rounded-full flex items-center justify-center">
                             <svg className="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                             </svg>
                           </span>
                         )}
                       </div>
                       <div className="relative">
                         <button
                           onClick={() => handleGenerateQuestion('D')}
                           className={`w-full bg-green-800/50 hover:bg-green-700 text-green-200 border border-green-700/50 rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${!isAIAvailable ? 'opacity-50' : ''}`}
                           title={!isAIAvailable ? 'Add API key in Settings to enable' : undefined}
                         >
                           D
                         </button>
                         {!isAIAvailable && (
                           <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-slate-500 rounded-full flex items-center justify-center">
                             <svg className="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                             </svg>
                           </span>
                         )}
                       </div>
                       <div className="relative">
                         <button
                           onClick={() => handleGenerateQuestion('E')}
                           className={`w-full bg-emerald-800/50 hover:bg-emerald-700 text-emerald-200 border border-emerald-700/50 rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${!isAIAvailable ? 'opacity-50' : ''}`}
                           title={!isAIAvailable ? 'Add API key in Settings to enable' : undefined}
                         >
                           E
                         </button>
                         {!isAIAvailable && (
                           <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-slate-500 rounded-full flex items-center justify-center">
                             <svg className="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                             </svg>
                           </span>
                         )}
                       </div>
                   </div>
                   
                   {/* Generated Question Display (Now underneath buttons) */}
                   {isGeneratingQuestion && (
                        <div className="mt-3 p-3 flex items-center gap-3 text-indigo-300 animate-pulse bg-slate-700/50 rounded-xl border border-slate-600">
                            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold uppercase">Generating Question...</span>
                        </div>
                   )}

                   {quickQuestion && (
                        <div className="mt-3 bg-slate-700 rounded-xl p-3 border border-slate-600 shadow-lg animate-fade-in relative group">
                            <div className="flex justify-between items-start mb-1">
                                {(() => {
                                  const levelColors: Record<string, string> = {
                                    'Grade A': 'bg-rose-900 text-rose-300',
                                    'Grade B': 'bg-orange-900 text-orange-300',
                                    'Grade C': 'bg-amber-900 text-amber-300',
                                    'Grade D': 'bg-green-900 text-green-300',
                                    'Grade E': 'bg-emerald-900 text-emerald-300',
                                  };
                                  return (
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${levelColors[quickQuestion.level] || 'bg-slate-700 text-slate-300'}`}>
                                      {quickQuestion.level}
                                    </span>
                                  );
                                })()}
                                <button onClick={() => setQuickQuestion(null)} className="text-slate-400 hover:text-white">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Question */}
                            <p className="text-sm font-medium text-white leading-relaxed">
                              Q: "{quickQuestion.question}"
                            </p>

                            {/* Expected Answer - Teacher Only */}
                            <div className="border-t border-slate-600 pt-2 mt-2">
                              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">
                                Expected Answer
                              </span>
                              <p className="text-sm text-slate-300 leading-relaxed">
                                <MarkdownText text={quickQuestion.answer} />
                              </p>
                            </div>
                        </div>
                   )}

                   <div className="flex justify-between mt-4 border-t border-slate-700/50 pt-3">
                       <button onClick={handlePrev} title="Previous (Left Arrow or Page Up)" className="text-slate-400 hover:text-white text-xs font-medium px-3 py-1 bg-slate-700/50 rounded-lg transition-colors border border-transparent hover:border-slate-600">← Back</button>
                       <span className="text-[11px] font-medium text-slate-500 max-w-[180px] truncate text-right py-1">
                           {visibleBullets < totalBullets ? 'Next: ' + currentSlide.content[visibleBullets] : 'Ready for next slide'}
                       </span>
                   </div>
               </div>
          </div>
      </div>

      {/* Toast notifications for reconnection feedback */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Permission Recovery Modal */}
      {showRecoveryModal && (
        <PermissionRecovery onClose={() => setShowRecoveryModal(false)} />
      )}
    </div>
  );
};

export default PresentationView;
