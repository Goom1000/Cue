import React, { useState, useEffect, useCallback } from 'react';
import { QuizQuestion } from '../../../services/geminiService';
import { useTimer } from '../../../hooks/useTimer';
import { useChaserAI } from '../../../hooks/useChaserAI';
import DualTimerDisplay from './DualTimerDisplay';
import TimeBonusEffect from './TimeBonusEffect';
import { TIME_BONUS_AMOUNT, CHASER_THINKING_DELAY, BeatTheChaserDifficulty } from './beatTheChaserConfig';

interface TimedBattlePhaseProps {
  contestantStartTime: number;
  chaserStartTime: number;
  difficulty: BeatTheChaserDifficulty;
  isAIControlled: boolean;
  questions: QuizQuestion[];
  onComplete: (winner: 'contestant' | 'chaser') => void;
  onExit: () => void;
  onStateUpdate?: (state: {
    contestantTime: number;
    chaserTime: number;
    activePlayer: 'contestant' | 'chaser';
  }) => void;
}

type TurnPhase = 'contestant-answering' | 'contestant-feedback' | 'chaser-thinking' | 'chaser-feedback' | 'time-bonus';

const TimedBattlePhase: React.FC<TimedBattlePhaseProps> = ({
  contestantStartTime,
  chaserStartTime,
  difficulty,
  isAIControlled,
  questions,
  onComplete,
  onExit,
  onStateUpdate
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [activePlayer, setActivePlayer] = useState<'contestant' | 'chaser'>('contestant');
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('contestant-answering');
  const [contestantAnswer, setContestantAnswer] = useState<number | null>(null);
  const [chaserAnswer, setChaserAnswer] = useState<number | null>(null);
  const [showTimeBonus, setShowTimeBonus] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  // Get chaser AI hook
  const { getChaserAnswer, isThinking } = useChaserAI({
    difficulty,
    thinkingDelayMs: CHASER_THINKING_DELAY
  });

  const currentQuestion = questions[currentQuestionIndex];

  // Contestant timer - only runs during contestant's turn
  const contestantTimer = useTimer({
    initialSeconds: contestantStartTime,
    autoStart: true, // Start immediately (contestant goes first)
    onComplete: () => {
      if (!gameEnded) {
        setGameEnded(true);
        onComplete('chaser'); // Contestant timer expired = chaser wins
      }
    }
  });

  // Chaser timer - only runs during chaser's turn
  const chaserTimer = useTimer({
    initialSeconds: chaserStartTime,
    autoStart: false,
    onComplete: () => {
      if (!gameEnded) {
        setGameEnded(true);
        onComplete('contestant'); // Chaser timer expired = contestant wins
      }
    }
  });

  // Sync state to parent for student view
  useEffect(() => {
    onStateUpdate?.({
      contestantTime: contestantTimer.timeRemaining,
      chaserTime: chaserTimer.timeRemaining,
      activePlayer
    });
  }, [contestantTimer.timeRemaining, chaserTimer.timeRemaining, activePlayer, onStateUpdate]);

  // Handle contestant answer
  const handleContestantAnswer = useCallback(async (selectedIndex: number) => {
    if (turnPhase !== 'contestant-answering' || gameEnded) return;

    contestantTimer.pause();
    setContestantAnswer(selectedIndex);
    setTurnPhase('contestant-feedback');

    const isCorrect = selectedIndex === currentQuestion.correctAnswerIndex;

    // Brief feedback (800ms)
    await new Promise(resolve => setTimeout(resolve, 800));

    // Switch to chaser's turn regardless of answer
    setActivePlayer('chaser');
    setTurnPhase('chaser-thinking');

    // Start chaser's timer
    chaserTimer.start();

    // Handle chaser's turn (AI or manual)
    if (isAIControlled) {
      const chaserIdx = await getChaserAnswer(currentQuestion);
      handleChaserAnswer(chaserIdx, true); // Skip phase check since we just set it
    }
    // If manual control, wait for teacher to click answer
  }, [turnPhase, gameEnded, currentQuestion, contestantTimer, chaserTimer, isAIControlled, getChaserAnswer]);

  // Handle chaser answer
  // Note: skipPhaseCheck is used when called directly from handleContestantAnswer
  // because React state updates are async and turnPhase may not have updated yet
  const handleChaserAnswer = useCallback(async (selectedIndex: number, skipPhaseCheck = false) => {
    if (!skipPhaseCheck && turnPhase !== 'chaser-thinking') return;
    if (gameEnded) return;

    chaserTimer.pause();
    setChaserAnswer(selectedIndex);
    setTurnPhase('chaser-feedback');

    const isCorrect = selectedIndex === currentQuestion.correctAnswerIndex;

    // If chaser got it wrong, contestant gets time bonus
    if (!isCorrect) {
      setTurnPhase('time-bonus');
      setShowTimeBonus(true);

      // Add time to contestant's clock
      const newTime = Math.min(contestantTimer.timeRemaining + TIME_BONUS_AMOUNT, 120); // Cap at 2 min
      contestantTimer.reset(newTime);

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 1200));
      setShowTimeBonus(false);
    } else {
      // Brief feedback (800ms)
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Move to next question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setContestantAnswer(null);
      setChaserAnswer(null);
      setActivePlayer('contestant');
      setTurnPhase('contestant-answering');
      contestantTimer.start();
    } else {
      // Out of questions - compare timers
      const winner = contestantTimer.timeRemaining >= chaserTimer.timeRemaining
        ? 'contestant'
        : 'chaser';
      setGameEnded(true);
      onComplete(winner);
    }
  }, [turnPhase, gameEnded, currentQuestion, currentQuestionIndex, questions.length, contestantTimer, chaserTimer, onComplete]);

  // Keyboard shortcuts (1-4) for contestant turn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (turnPhase === 'contestant-answering' && e.key >= '1' && e.key <= '4') {
        handleContestantAnswer(parseInt(e.key) - 1);
      }
      // Manual chaser control
      if (!isAIControlled && turnPhase === 'chaser-thinking' && e.key >= '1' && e.key <= '4') {
        handleChaserAnswer(parseInt(e.key) - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [turnPhase, handleContestantAnswer, handleChaserAnswer, isAIControlled]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-950 via-slate-900 to-red-950 flex flex-col p-6">
      {/* Time Bonus Effect */}
      <TimeBonusEffect show={showTimeBonus} amount={TIME_BONUS_AMOUNT} />

      {/* Dual Timer Display */}
      <DualTimerDisplay
        contestantTime={contestantTimer.timeRemaining}
        chaserTime={chaserTimer.timeRemaining}
        activePlayer={activePlayer}
      />

      {/* Turn Indicator */}
      <div className="text-center mb-4">
        <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${
          activePlayer === 'contestant'
            ? 'bg-blue-500/30 text-blue-300'
            : 'bg-red-500/30 text-red-300'
        }`}>
          {turnPhase === 'contestant-answering' && 'Contestant - Answer Now!'}
          {turnPhase === 'contestant-feedback' && (
            contestantAnswer === currentQuestion?.correctAnswerIndex ? 'Correct!' : 'Incorrect'
          )}
          {turnPhase === 'chaser-thinking' && (isThinking ? 'Chaser is thinking...' : 'Chaser - Answer Now!')}
          {turnPhase === 'chaser-feedback' && (
            chaserAnswer === currentQuestion?.correctAnswerIndex ? 'Chaser Correct' : 'Chaser Incorrect'
          )}
          {turnPhase === 'time-bonus' && 'Time Bonus!'}
        </span>
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
        {/* Question */}
        <div className="bg-slate-800/60 p-6 md:p-8 rounded-2xl border-2 border-slate-600 mb-6">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
          <p className="text-xl md:text-2xl font-bold text-white leading-relaxed text-center">
            {currentQuestion?.question}
          </p>
        </div>

        {/* Answer Options - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4">
          {currentQuestion?.options.map((option, idx) => {
            const isContestantAnswer = contestantAnswer === idx;
            const isChaserAnswer = chaserAnswer === idx;
            const isCorrect = idx === currentQuestion.correctAnswerIndex;
            const showResult = turnPhase === 'contestant-feedback' ||
                              turnPhase === 'chaser-feedback' ||
                              turnPhase === 'time-bonus';

            return (
              <button
                key={idx}
                onClick={() => {
                  if (turnPhase === 'contestant-answering') handleContestantAnswer(idx);
                  if (!isAIControlled && turnPhase === 'chaser-thinking') handleChaserAnswer(idx);
                }}
                disabled={turnPhase !== 'contestant-answering' && (isAIControlled || turnPhase !== 'chaser-thinking')}
                className={`
                  p-5 rounded-xl text-left font-bold text-lg transition-all duration-150 border-2
                  ${isContestantAnswer && !showResult ? 'bg-blue-500 border-blue-400 text-white' : ''}
                  ${isChaserAnswer && turnPhase !== 'contestant-feedback' && !showResult ? 'bg-red-500 border-red-400 text-white' : ''}
                  ${!isContestantAnswer && !isChaserAnswer ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500' : ''}
                  ${showResult && isCorrect ? 'bg-green-600 border-green-400 text-white' : ''}
                  ${showResult && !isCorrect && (isContestantAnswer || isChaserAnswer) ? 'bg-slate-700/50 border-slate-600 opacity-50' : ''}
                  ${showResult && !isCorrect && !isContestantAnswer && !isChaserAnswer ? 'opacity-30' : ''}
                `}
              >
                <span className="text-slate-400 mr-3">{idx + 1}.</span>
                {option}
              </button>
            );
          })}
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-slate-500 text-sm mt-4">
          {turnPhase === 'contestant-answering' && 'Press 1-4 to answer'}
          {!isAIControlled && turnPhase === 'chaser-thinking' && 'Press 1-4 for chaser answer'}
        </p>
      </div>

      {/* Exit button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={onExit}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          End Game
        </button>
      </div>
    </div>
  );
};

export default TimedBattlePhase;
