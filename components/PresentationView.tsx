import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Slide, PresentationMessage, BROADCAST_CHANNEL_NAME, GameState, GameType, QuickQuizState, ActiveGameState, MillionaireState, TheChaseState, BeatTheChaserState, GradeLevel, StudentWithGrade } from '../types';
import Button from './Button';
import { MarkdownText, SlideContentRenderer } from './SlideRenderers';
import { QuizQuestion, generatePhoneAFriendHint } from '../services/geminiService';
import { AIProviderInterface, AIProviderError } from '../services/aiProvider';
import useBroadcastSync from '../hooks/useBroadcastSync';
import useWindowManagement from '../hooks/useWindowManagement';
import useKeyboardNavigation from '../hooks/useKeyboardNavigation';
import ManualPlacementGuide from './ManualPlacementGuide';
import ConnectionStatus from './ConnectionStatus';
import PermissionRecovery from './PermissionRecovery';
import NextSlidePreview from './NextSlidePreview';
import { useToast, ToastContainer } from './Toast';
import GameMenu from './games/GameMenu';
import GameContainer from './games/GameContainer';
import { MONEY_TREE_CONFIGS, getSafeHavenAmount } from './games/millionaire/millionaireConfig';

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

// Initialize shuffled cycling from students with grades
function initializeCycling(studentData: StudentWithGrade[]): TargetedCyclingState {
  const studentsWithGrades = studentData.filter(s => s.grade !== null);

  if (studentsWithGrades.length === 0) {
    return { shuffledOrder: [], currentIndex: 0, askedStudents: new Set() };
  }

  return {
    shuffledOrder: shuffleArray(studentsWithGrades.map(s => s.name)),
    currentIndex: 0,
    askedStudents: new Set(),
  };
}

// Get next student name and grade level for questioning
function getNextStudent(
  cyclingState: TargetedCyclingState,
  studentData: StudentWithGrade[]
): { name: string; grade: GradeLevel } | null {
  const { shuffledOrder, currentIndex } = cyclingState;

  if (shuffledOrder.length === 0 || currentIndex >= shuffledOrder.length) {
    return null;
  }

  const name = shuffledOrder[currentIndex];
  const student = studentData.find(s => s.name === name);

  return student && student.grade ? { name, grade: student.grade } : null;
}

// Advance cycling state, reshuffle when cycle complete
function advanceCycling(
  prev: TargetedCyclingState,
  studentData: StudentWithGrade[]
): TargetedCyclingState {
  const newIndex = prev.currentIndex + 1;

  // If all students asked, reshuffle and restart
  if (newIndex >= prev.shuffledOrder.length) {
    return initializeCycling(studentData);
  }

  return {
    ...prev,
    currentIndex: newIndex,
    askedStudents: new Set([...prev.askedStudents, prev.shuffledOrder[prev.currentIndex]]),
  };
}

interface PresentationViewProps {
  slides: Slide[];
  onExit: () => void;
  studentNames: string[];
  studentData: StudentWithGrade[];
  initialSlideIndex?: number;
  provider: AIProviderInterface | null;
  onError: (title: string, message: string) => void;
  onRequestAI: (featureName: string) => void;
}

const PresentationView: React.FC<PresentationViewProps> = ({ slides, onExit, studentNames, studentData, initialSlideIndex = 0, provider, onError, onRequestAI }) => {
  const isAIAvailable = provider !== null;
  const [currentIndex, setCurrentIndex] = useState(initialSlideIndex);
  const [visibleBullets, setVisibleBullets] = useState(0);
  const [showFullScript, setShowFullScript] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'row' | 'col'>('row');
  const [showPreview, setShowPreview] = useState(false);

  // Game/Quiz State
  const [activeGame, setActiveGame] = useState<ActiveGameState>(null);
  const [pendingGameType, setPendingGameType] = useState<GameType | null>(null);
  const gameWasOpenRef = useRef(false);
  const [showMillionaireSetup, setShowMillionaireSetup] = useState(false);
  const [lifelineLoading, setLifelineLoading] = useState<'phoneAFriend' | null>(null);

  // Question Generation State
  const [quickQuestion, setQuickQuestion] = useState<{
    question: string;
    answer: string;
    level: string;
    studentName?: string;  // For Targeted mode
  } | null>(null);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);

  // Targeting Mode State
  const [isTargetedMode, setIsTargetedMode] = useState(true); // Default to Targeted per CONTEXT.md
  const [cyclingState, setCyclingState] = useState<TargetedCyclingState>(() =>
    initializeCycling(studentData)
  );
  const [isCounterExpanded, setIsCounterExpanded] = useState(false);

  // Helper to manually mark student as asked (voluntary answers)
  const markStudentAsAsked = useCallback((studentName: string) => {
    setCyclingState(prev => ({
      ...prev,
      askedStudents: new Set([...prev.askedStudents, studentName]),
    }));
  }, []);

  // Derived state for mode availability
  const hasStudentsWithGrades = studentData.some(s => s.grade !== null);
  const canUseTargetedMode = studentData.length > 0 && hasStudentsWithGrades;

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
      // Clear student banner on student view when slide changes
      if (isTargetedMode) {
        postMessage({ type: 'STUDENT_CLEAR' });
      }
  }, [currentIndex, postMessage, isTargetedMode]);

  // Reset cycling state when slide changes (CYCL-04)
  useEffect(() => {
    setCyclingState(initializeCycling(studentData));
    setIsCounterExpanded(false);
  }, [currentIndex, studentData]);

  // Next student for Targeted mode preview
  const nextStudent = useMemo(() => {
    if (!isTargetedMode || !canUseTargetedMode) return null;
    return getNextStudent(cyclingState, studentData);
  }, [isTargetedMode, canUseTargetedMode, cyclingState, studentData]);

  // Handle incoming messages (student requesting state)
  useEffect(() => {
    if (lastMessage?.type === 'STATE_REQUEST') {
      // Student connected, send current state
      postMessage({
        type: 'STATE_UPDATE',
        payload: { currentIndex, visibleBullets, slides }
      });
      // If game is active, also send game state
      if (activeGame) {
        postMessage({
          type: 'GAME_STATE_UPDATE',
          payload: activeGame
        });
      }
    }
  }, [lastMessage, currentIndex, visibleBullets, slides, postMessage, activeGame]);

  // Broadcast state changes to student window
  useEffect(() => {
    postMessage({
      type: 'STATE_UPDATE',
      payload: { currentIndex, visibleBullets, slides }
    });
  }, [currentIndex, visibleBullets, slides, postMessage]);

  // Broadcast game state changes to student window
  useEffect(() => {
    if (activeGame) {
      gameWasOpenRef.current = true;
      postMessage({
        type: 'GAME_STATE_UPDATE',
        payload: activeGame
      });
    } else if (gameWasOpenRef.current) {
      postMessage({ type: 'GAME_CLOSE' });
      gameWasOpenRef.current = false;
    }
  }, [activeGame, postMessage]);

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

  // Game state factory functions
  const createQuickQuizState = useCallback((questions: QuizQuestion[]): QuickQuizState => ({
    gameType: 'quick-quiz',
    status: 'playing',
    questions,
    currentQuestionIndex: 0,
    isAnswerRevealed: false,
  }), []);

  const createMillionaireState = useCallback((
    questions: QuizQuestion[],
    questionCount: 3 | 5 | 10
  ): MillionaireState => {
    const config = MONEY_TREE_CONFIGS[questionCount];
    return {
      gameType: 'millionaire',
      status: 'playing',
      questions,
      currentQuestionIndex: 0,
      selectedOption: null,
      lifelines: {
        fiftyFifty: true,
        phoneAFriend: true,
        askTheAudience: true,
      },
      prizeLadder: config.prizes,
      currentPrize: 0,
      eliminatedOptions: [],
      audiencePoll: null,
      phoneHint: null,
      safeHavenAmount: 0,
      questionCount,
    };
  }, []);

  const createPlaceholderState = useCallback((gameType: GameType): GameState => {
    const base = {
      status: 'splash' as const,
      questions: [],
      currentQuestionIndex: 0,
    };
    switch (gameType) {
      case 'quick-quiz':
        return { ...base, gameType: 'quick-quiz', isAnswerRevealed: false };
      case 'millionaire':
        return { ...base, gameType: 'millionaire', selectedOption: null, lifelines: { fiftyFifty: true, phoneAFriend: true, askTheAudience: true }, prizeLadder: [], currentPrize: 0 };
      case 'the-chase':
        return { ...base, gameType: 'the-chase', chaserPosition: 0, contestantPosition: 0, isChasing: false };
      case 'beat-the-chaser':
        return { ...base, gameType: 'beat-the-chaser', contestantTime: 0, chaserTime: 0, activePlayer: 'contestant' };
    }
  }, []);

  // Launch Quick Quiz (async question generation)
  const launchQuickQuiz = useCallback(async () => {
    if (!provider) {
      onRequestAI('start the quiz game');
      setPendingGameType(null);
      return;
    }

    // Set loading state
    setActiveGame({
      gameType: 'quick-quiz',
      status: 'loading',
      questions: [],
      currentQuestionIndex: 0,
      isAnswerRevealed: false,
    });

    try {
      const questions = await provider.generateImpromptuQuiz(slides, currentIndex, 5);
      setActiveGame(createQuickQuizState(questions));
    } catch (e) {
      console.error(e);
      if (e instanceof AIProviderError) {
        onError('Quiz Generation Failed', e.userMessage);
      } else {
        onError('Error', 'Could not generate quiz. Please try again.');
      }
      setActiveGame(null);
    }
    setPendingGameType(null);
  }, [provider, slides, currentIndex, createQuickQuizState, onRequestAI, onError]);

  // Launch Millionaire (async question generation with question count)
  const launchMillionaire = useCallback(async (questionCount: 3 | 5 | 10) => {
    if (!provider) {
      onRequestAI('start the Millionaire game');
      return;
    }

    // Close setup modal
    setShowMillionaireSetup(false);

    // Set loading state with question count
    setActiveGame({
      gameType: 'millionaire',
      status: 'loading',
      questions: [],
      currentQuestionIndex: 0,
      selectedOption: null,
      lifelines: {
        fiftyFifty: true,
        phoneAFriend: true,
        askTheAudience: true,
      },
      prizeLadder: [],
      currentPrize: 0,
      eliminatedOptions: [],
      audiencePoll: null,
      phoneHint: null,
      safeHavenAmount: 0,
      questionCount,
    });

    try {
      const questions = await provider.generateImpromptuQuiz(slides, currentIndex, questionCount);
      setActiveGame(createMillionaireState(questions, questionCount));
    } catch (e) {
      console.error(e);
      if (e instanceof AIProviderError) {
        onError('Quiz Generation Failed', e.userMessage);
      } else {
        onError('Quiz Generation Failed', 'An unexpected error occurred');
      }
      setActiveGame(null);
    }
  }, [provider, slides, currentIndex, createMillionaireState, onRequestAI, onError]);

  // Game selection handler with confirmation dialog
  const handleSelectGame = useCallback((gameType: GameType) => {
    // If game is active and not finished, confirm switch
    if (activeGame && activeGame.status !== 'result') {
      const confirmed = window.confirm('A game is in progress. Switch to a different game?');
      if (!confirmed) return;
    }

    if (gameType === 'quick-quiz') {
      // Launch Quick Quiz - needs to generate questions first
      setPendingGameType('quick-quiz');
      launchQuickQuiz();
    } else if (gameType === 'millionaire') {
      // Show question count selection modal
      setShowMillionaireSetup(true);
    } else {
      // Launch placeholder game directly
      setActiveGame(createPlaceholderState(gameType));
    }
  }, [activeGame, launchQuickQuiz, createPlaceholderState]);

  // Game control handlers
  const handleRevealAnswer = useCallback(() => {
    if (activeGame?.gameType === 'quick-quiz') {
      setActiveGame(prev => prev ? { ...prev, isAnswerRevealed: true, status: 'reveal' as const } : null);
    }
  }, [activeGame]);

  const handleNextQuestion = useCallback(() => {
    if (activeGame?.gameType === 'quick-quiz') {
      const state = activeGame as QuickQuizState;
      if (state.currentQuestionIndex < state.questions.length - 1) {
        setActiveGame({
          ...state,
          currentQuestionIndex: state.currentQuestionIndex + 1,
          isAnswerRevealed: false,
          status: 'playing',
        });
      } else {
        setActiveGame({ ...state, status: 'result' });
      }
    }
  }, [activeGame]);

  const handleCloseGame = useCallback(() => {
    setActiveGame(null);
  }, []);

  const handleRestartGame = useCallback(() => {
    if (activeGame?.gameType === 'quick-quiz') {
      launchQuickQuiz();
    }
  }, [activeGame, launchQuickQuiz]);

  // Millionaire-specific control handlers
  const handleMillionaireSelectOption = useCallback((idx: number) => {
    if (activeGame?.gameType === 'millionaire' && activeGame.status === 'playing') {
      setActiveGame(prev => prev ? { ...prev, selectedOption: idx } : null);
    }
  }, [activeGame]);

  const handleMillionaireLockIn = useCallback(() => {
    if (activeGame?.gameType === 'millionaire' && activeGame.selectedOption !== null) {
      setActiveGame(prev => prev ? { ...prev, status: 'reveal' as const } : null);
    }
  }, [activeGame]);

  const handleMillionaireNext = useCallback(() => {
    if (activeGame?.gameType !== 'millionaire') return;
    const state = activeGame;
    const currentQuestion = state.questions[state.currentQuestionIndex];
    const isCorrect = state.selectedOption === currentQuestion.correctAnswerIndex;

    if (isCorrect) {
      // Advance to next question or victory
      if (state.currentQuestionIndex < state.questions.length - 1) {
        const config = MONEY_TREE_CONFIGS[state.questionCount];
        const newIndex = state.currentQuestionIndex + 1;
        setActiveGame({
          ...state,
          currentQuestionIndex: newIndex,
          selectedOption: null,
          status: 'playing',
          currentPrize: state.prizeLadder[state.currentQuestionIndex],
          safeHavenAmount: getSafeHavenAmount(newIndex, config),
          eliminatedOptions: [],
          audiencePoll: null,
          phoneHint: null,
        });
      } else {
        // Victory!
        setActiveGame({
          ...state,
          status: 'result',
          currentPrize: state.prizeLadder[state.currentQuestionIndex],
        });
      }
    } else {
      // Wrong answer - game over, fall to safe haven
      setActiveGame({
        ...state,
        status: 'result',
        currentPrize: state.safeHavenAmount,
      });
    }
  }, [activeGame]);

  const handleUseLifeline = useCallback(async (lifeline: 'fiftyFifty' | 'askTheAudience' | 'phoneAFriend') => {
    if (activeGame?.gameType !== 'millionaire') return;
    const state = activeGame;
    if (state.status !== 'playing') return;

    // Mark lifeline as used
    const updatedLifelines = {
      ...state.lifelines,
      [lifeline]: false,
    };

    if (lifeline === 'fiftyFifty') {
      // Randomly eliminate 2 of 3 wrong answers
      const currentQuestion = state.questions[state.currentQuestionIndex];
      const correctIndex = currentQuestion.correctAnswerIndex;
      const wrongIndices = [0, 1, 2, 3].filter(i => i !== correctIndex);
      const shuffled = wrongIndices.sort(() => Math.random() - 0.5);
      const eliminated = [shuffled[0], shuffled[1]];

      setActiveGame({
        ...state,
        lifelines: updatedLifelines,
        eliminatedOptions: eliminated,
      });

    } else if (lifeline === 'askTheAudience') {
      // Generate difficulty-based poll percentages
      const currentQuestion = state.questions[state.currentQuestionIndex];
      const correctIndex = currentQuestion.correctAnswerIndex;
      const questionProgress = state.currentQuestionIndex / state.questions.length;

      // Later questions = harder = more scattered votes
      const difficulty = questionProgress < 0.3 ? 'easy' : questionProgress < 0.7 ? 'medium' : 'hard';

      const correctRange = difficulty === 'easy' ? [60, 80]
        : difficulty === 'medium' ? [40, 55]
        : [25, 35];

      const correctPercent = Math.floor(
        Math.random() * (correctRange[1] - correctRange[0]) + correctRange[0]
      );
      let remaining = 100 - correctPercent;

      // Distribute remaining among wrong answers
      const wrongIndices = [0, 1, 2, 3].filter(i => i !== correctIndex);
      const percentages: [number, number, number, number] = [0, 0, 0, 0];
      percentages[correctIndex] = correctPercent;

      wrongIndices.forEach((idx, i) => {
        if (i === wrongIndices.length - 1) {
          percentages[idx] = remaining;
        } else {
          const portion = Math.floor(Math.random() * remaining * 0.6);
          percentages[idx] = portion;
          remaining -= portion;
        }
      });

      setActiveGame({
        ...state,
        lifelines: updatedLifelines,
        audiencePoll: percentages,
      });

    } else if (lifeline === 'phoneAFriend') {
      if (!provider) return;

      // Set loading state
      setActiveGame({
        ...state,
        lifelines: updatedLifelines,
      });
      setLifelineLoading('phoneAFriend');

      const currentQuestion = state.questions[state.currentQuestionIndex];
      try {
        const hint = await generatePhoneAFriendHint(
          provider.apiKey,
          currentQuestion.question,
          currentQuestion.options
        );

        setActiveGame(prev => {
          if (prev?.gameType !== 'millionaire') return prev;
          return { ...prev, phoneHint: hint };
        });
      } catch (e) {
        setActiveGame(prev => {
          if (prev?.gameType !== 'millionaire') return prev;
          return { ...prev, phoneHint: { confidence: 'low', response: "The line went dead! Try another lifeline." } };
        });
      } finally {
        setLifelineLoading(null);
      }
    }
  }, [activeGame, provider]);

  const handleGenerateQuestion = async (level: 'A' | 'B' | 'C' | 'D' | 'E', studentName?: string) => {
      if (!provider) {
          onRequestAI(`generate a Grade ${level} question`);
          return;
      }
      setIsGeneratingQuestion(true);
      try {
          const result = await provider.generateQuestionWithAnswer(currentSlide.title, currentSlide.content, level);
          setQuickQuestion({ question: result.question, answer: result.answer, level: `Grade ${level}`, studentName });
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

               {/* GAME MENU */}
               <div className="relative">
                 <GameMenu
                     onSelectGame={handleSelectGame}
                     disabled={!isAIAvailable && pendingGameType === null}
                 />
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

      {/* GAME MODAL */}
      {activeGame && createPortal(
          <div className="absolute inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center animate-crossfade-in font-poppins">
            {/* Close button */}
            <button
              onClick={handleCloseGame}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-50"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <GameContainer
              state={activeGame}
              onClose={handleCloseGame}
              onRevealAnswer={handleRevealAnswer}
              onNextQuestion={handleNextQuestion}
              onRestart={handleRestartGame}
              onMillionaireSelectOption={handleMillionaireSelectOption}
              onMillionaireLockIn={handleMillionaireLockIn}
              onMillionaireNext={handleMillionaireNext}
              onMillionaireUseLifeline={handleUseLifeline}
              isLifelineLoading={lifelineLoading}
            />
          </div>,
          document.body
      )}

      <div className={`flex-1 flex overflow-hidden min-h-0 ${layoutMode === 'col' ? 'flex-col' : 'flex-row'}`}>
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
               <SlideContentRenderer slide={currentSlide} visibleBullets={visibleBullets} />
          </div>

          <div className={`bg-slate-900 border-slate-700 flex flex-col shadow-2xl z-40 shrink-0 transition-all duration-300 ${layoutMode === 'col' ? 'h-80 border-t w-full' : 'w-96 border-l h-full'}`}>
               <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center shrink-0">
                   <div className="flex items-center gap-3">
                       <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Presenter Console</span>

                       {/* Mode Toggle */}
                       <div className="flex items-center gap-2">
                           <span className={`text-[10px] font-bold uppercase tracking-wider ${!isTargetedMode ? 'text-slate-300' : 'text-slate-500'}`}>Manual</span>
                           <label className="relative inline-flex items-center cursor-pointer">
                               <input
                                   type="checkbox"
                                   className="sr-only peer"
                                   checked={isTargetedMode}
                                   onChange={() => setIsTargetedMode(!isTargetedMode)}
                                   disabled={!canUseTargetedMode}
                               />
                               <div className={`w-9 h-5 rounded-full peer transition-colors ${
                                   canUseTargetedMode
                                       ? 'bg-slate-600 peer-checked:bg-amber-500 peer-focus:ring-2 peer-focus:ring-amber-500/50'
                                       : 'bg-slate-700 cursor-not-allowed'
                               } after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4`}></div>
                           </label>
                           <span className={`text-[10px] font-bold uppercase tracking-wider ${isTargetedMode && canUseTargetedMode ? 'text-amber-400' : 'text-slate-500'}`}>
                               Targeted
                           </span>
                           {!canUseTargetedMode && (
                               <span className="text-[9px] text-slate-500 italic" title="Load a class with grade assignments to use Targeted mode">
                                   (assign grades first)
                               </span>
                           )}
                       </div>

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
                   
                   {/* Question Buttons - Mode Dependent */}
                   {isTargetedMode && canUseTargetedMode ? (
                       /* Targeted Mode: Single Question Button with Student Preview */
                       <div className={`mt-3 p-3 rounded-xl transition-all ${currentSlide.hasQuestionFlag ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : 'bg-slate-700/50'}`}>
                           {currentSlide.hasQuestionFlag && (
                               <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest text-center mb-2">
                                   Question Time
                               </div>
                           )}

                           {nextStudent ? (
                               <div className="space-y-2">
                                   {/* Student Preview */}
                                   <div className="flex items-center justify-between">
                                       <div className="text-sm text-slate-300">
                                           <span className="text-slate-500">Next: </span>
                                           <span className="font-bold text-white">{nextStudent.name}</span>
                                           <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                               nextStudent.grade === 'A' ? 'bg-rose-900 text-rose-300' :
                                               nextStudent.grade === 'B' ? 'bg-orange-900 text-orange-300' :
                                               nextStudent.grade === 'C' ? 'bg-amber-900 text-amber-300' :
                                               nextStudent.grade === 'D' ? 'bg-green-900 text-green-300' :
                                               'bg-emerald-900 text-emerald-300'
                                           }`}>
                                               Grade {nextStudent.grade}
                                           </span>
                                       </div>
                                       <button
                                           onClick={() => setCyclingState(prev => advanceCycling(prev, studentData))}
                                           className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-600/50 hover:bg-slate-600 transition-colors"
                                           title="Skip this student (counts as asked)"
                                       >
                                           Skip
                                       </button>
                                   </div>

                                   {/* Question Button */}
                                   <div className="relative">
                                       <button
                                           onClick={() => {
                                               handleGenerateQuestion(nextStudent.grade, nextStudent.name);
                                               setCyclingState(prev => advanceCycling(prev, studentData));
                                               // Broadcast student selection to student view
                                               postMessage({ type: 'STUDENT_SELECT', payload: { studentName: nextStudent.name } });
                                           }}
                                           className={`w-full bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/50 rounded-lg py-3 text-sm font-bold uppercase tracking-wider transition-colors ${!isAIAvailable ? 'opacity-50' : ''}`}
                                           title={!isAIAvailable ? 'Add API key in Settings to enable' : `Generate question for ${nextStudent.name}`}
                                       >
                                           Question for {nextStudent.name}
                                       </button>
                                       {!isAIAvailable && (
                                           <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-slate-500 rounded-full flex items-center justify-center">
                                               <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                   <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                               </svg>
                                           </span>
                                       )}
                                   </div>

                                   {/* Progress Counter */}
                                   <div className="mt-3 border-t border-slate-600 pt-3">
                                       <button
                                           onClick={() => setIsCounterExpanded(!isCounterExpanded)}
                                           className="w-full text-left text-xs text-slate-400 hover:text-slate-300 flex items-center justify-between transition-colors"
                                       >
                                           <span>
                                               {cyclingState.currentIndex} of {cyclingState.shuffledOrder.length} students asked
                                           </span>
                                           <svg
                                               className={`w-4 h-4 transition-transform ${isCounterExpanded ? 'rotate-180' : ''}`}
                                               fill="none"
                                               stroke="currentColor"
                                               viewBox="0 0 24 24"
                                           >
                                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                           </svg>
                                       </button>

                                       {/* Expanded Student List */}
                                       {isCounterExpanded && (
                                           <div className="mt-2 p-2 bg-slate-800 rounded-lg max-h-40 overflow-y-auto space-y-1">
                                               {cyclingState.shuffledOrder.map((name, idx) => {
                                                   const isAsked = idx < cyclingState.currentIndex || cyclingState.askedStudents.has(name);
                                                   const student = studentData.find(s => s.name === name);
                                                   return (
                                                       <div
                                                           key={name}
                                                           className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-700/50"
                                                       >
                                                           <div className="flex items-center gap-2">
                                                               <span className={isAsked ? 'text-green-400' : 'text-slate-500'}>
                                                                   {isAsked ? '\u2713' : '\u25CB'}
                                                               </span>
                                                               <span className={isAsked ? 'text-slate-400' : 'text-white'}>
                                                                   {name}
                                                               </span>
                                                               {student?.grade && (
                                                                   <span className="text-[9px] text-slate-500">
                                                                       ({student.grade})
                                                                   </span>
                                                               )}
                                                           </div>
                                                           {!isAsked && (
                                                               <button
                                                                   onClick={(e) => {
                                                                       e.stopPropagation();
                                                                       markStudentAsAsked(name);
                                                                   }}
                                                                   className="text-[9px] text-slate-500 hover:text-amber-400 px-1.5 py-0.5 rounded hover:bg-slate-600"
                                                                   title="Mark as asked (answered voluntarily)"
                                                               >
                                                                   mark
                                                               </button>
                                                           )}
                                                       </div>
                                                   );
                                               })}
                                           </div>
                                       )}
                                   </div>
                               </div>
                           ) : (
                               <div className="text-center text-slate-500 text-sm py-2">
                                   No students with grades assigned
                               </div>
                           )}
                       </div>
                   ) : (
                       /* Manual Mode: 5 Difficulty Buttons (existing behavior) */
                       <div className={`grid grid-cols-5 gap-2 mt-3 p-2 rounded-xl transition-all ${currentSlide.hasQuestionFlag ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : ''}`}>
                           {currentSlide.hasQuestionFlag && (
                               <div className="col-span-5 text-[10px] font-bold text-amber-500 uppercase tracking-widest text-center mb-1">
                                   Question Time
                               </div>
                           )}
                           {(['A', 'B', 'C', 'D', 'E'] as const).map(grade => {
                               const colors = {
                                   A: 'bg-rose-800/50 hover:bg-rose-700 text-rose-200 border-rose-700/50',
                                   B: 'bg-orange-800/50 hover:bg-orange-700 text-orange-200 border-orange-700/50',
                                   C: 'bg-amber-800/50 hover:bg-amber-700 text-amber-200 border-amber-700/50',
                                   D: 'bg-green-800/50 hover:bg-green-700 text-green-200 border-green-700/50',
                                   E: 'bg-emerald-800/50 hover:bg-emerald-700 text-emerald-200 border-emerald-700/50',
                               };
                               return (
                                   <div key={grade} className="relative">
                                       <button
                                           onClick={() => handleGenerateQuestion(grade)}
                                           className={`w-full ${colors[grade]} border rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${!isAIAvailable ? 'opacity-50' : ''}`}
                                           title={!isAIAvailable ? 'Add API key in Settings to enable' : undefined}
                                       >
                                           {grade}
                                       </button>
                                       {!isAIAvailable && (
                                           <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-slate-500 rounded-full flex items-center justify-center">
                                               <svg className="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                   <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                               </svg>
                                           </span>
                                       )}
                                   </div>
                               );
                           })}
                       </div>
                   )}
                   
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
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${levelColors[quickQuestion.level] || 'bg-slate-700 text-slate-300'}`}>
                                        {quickQuestion.level}
                                      </span>
                                      {quickQuestion.studentName && (
                                        <span className="text-[10px] font-bold text-indigo-400">
                                          for {quickQuestion.studentName}
                                        </span>
                                      )}
                                    </div>
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

      {/* Millionaire Setup Modal */}
      {showMillionaireSetup && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border-2 border-indigo-400/30 shadow-2xl">
            <h3 className="text-3xl font-black text-white mb-2 text-center">Millionaire</h3>
            <p className="text-slate-300 text-center mb-6">How many questions?</p>
            <div className="space-y-3">
              <button
                onClick={() => launchMillionaire(3)}
                disabled={!isAIAvailable}
                className={`w-full py-4 text-xl font-bold rounded-xl transition-all ${
                  isAIAvailable
                    ? 'bg-amber-600 hover:bg-amber-500 text-white hover:scale-105'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                3 Questions
              </button>
              <button
                onClick={() => launchMillionaire(5)}
                disabled={!isAIAvailable}
                className={`w-full py-4 text-xl font-bold rounded-xl transition-all ${
                  isAIAvailable
                    ? 'bg-amber-600 hover:bg-amber-500 text-white hover:scale-105'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                5 Questions
              </button>
              <button
                onClick={() => launchMillionaire(10)}
                disabled={!isAIAvailable}
                className={`w-full py-4 text-xl font-bold rounded-xl transition-all ${
                  isAIAvailable
                    ? 'bg-amber-600 hover:bg-amber-500 text-white hover:scale-105'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                10 Questions
              </button>
            </div>
            {!isAIAvailable && (
              <p className="text-sm text-amber-400 text-center mt-4">
                Add an API key in Settings to enable
              </p>
            )}
            <button
              onClick={() => setShowMillionaireSetup(false)}
              className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Permission Recovery Modal */}
      {showRecoveryModal && (
        <PermissionRecovery onClose={() => setShowRecoveryModal(false)} />
      )}
    </div>
  );
};

export default PresentationView;
