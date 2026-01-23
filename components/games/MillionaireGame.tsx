import React, { useState, useEffect, useRef } from 'react';
import { MillionaireState } from '../../types';
import MoneyTree from './millionaire/MoneyTree';
import MillionaireQuestion from './millionaire/MillionaireQuestion';
import LifelinePanel from './millionaire/LifelinePanel';
import AudiencePollOverlay from './millionaire/AudiencePollOverlay';
import PhoneAFriendOverlay from './millionaire/PhoneAFriendOverlay';
import SafeHavenCelebration from './millionaire/SafeHavenCelebration';
import WrongAnswerReveal from './millionaire/WrongAnswerReveal';
import VictoryCelebration from './millionaire/VictoryCelebration';
import { MONEY_TREE_CONFIGS, getSafeHavenAmount } from './millionaire/millionaireConfig';
import ResultScreen from './shared/ResultScreen';

interface MillionaireGameProps {
  state: MillionaireState;
  onClose: () => void;
  onSelectOption?: (idx: number) => void;
  onLockIn?: () => void;
  onNextQuestion?: () => void;
  onUseLifeline?: (lifeline: 'fiftyFifty' | 'askTheAudience' | 'phoneAFriend') => void;
  onRestart?: () => void;
  isLifelineLoading?: 'phoneAFriend' | null;
}

const MillionaireGame: React.FC<MillionaireGameProps> = ({
  state,
  onClose,
  onSelectOption,
  onLockIn,
  onNextQuestion,
  onUseLifeline,
  onRestart,
  isLifelineLoading,
}) => {
  const [revealState, setRevealState] = useState({
    isRevealing: false,
    revealedCount: 0,
    showResult: false,
  });
  const [showAudiencePoll, setShowAudiencePoll] = useState(false);
  const [showPhoneHint, setShowPhoneHint] = useState(false);
  const shownAudiencePollRef = useRef(false);
  const shownPhoneHintRef = useRef(false);
  const [soundEnabled, setSoundEnabled] = useState(false); // OFF by default per CONTEXT.md
  const [showSafeHaven, setShowSafeHaven] = useState(false);
  const [showWrongAnswer, setShowWrongAnswer] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [lastSafeHavenReached, setLastSafeHavenReached] = useState<number | null>(null);

  const currentQuestion = state.questions[state.currentQuestionIndex];
  const config = MONEY_TREE_CONFIGS[state.questionCount];

  // Trigger reveal sequence when status changes to 'reveal'
  useEffect(() => {
    if (state.status === 'reveal' && !revealState.isRevealing && !revealState.showResult) {
      // Start reveal sequence
      setRevealState({ isRevealing: true, revealedCount: 0, showResult: false });

      // Reveal A, B, C, D sequentially (300ms between each)
      const revealNext = (count: number) => {
        if (count < 4) {
          setTimeout(() => {
            setRevealState(prev => ({ ...prev, revealedCount: count + 1 }));
            revealNext(count + 1);
          }, 300);
        } else {
          // All revealed, pause then show result
          setTimeout(() => {
            setRevealState(prev => ({ ...prev, showResult: true, isRevealing: false }));
          }, 800);
        }
      };
      revealNext(0);
    }
  }, [state.status, revealState.isRevealing, revealState.showResult]);

  // Reset reveal state when moving to next question
  useEffect(() => {
    if (state.status === 'playing') {
      setRevealState({ isRevealing: false, revealedCount: 0, showResult: false });
    }
  }, [state.status, state.currentQuestionIndex]);

  // Show overlays when state data is set (only once per lifeline use)
  useEffect(() => {
    if (state.audiencePoll && !shownAudiencePollRef.current) {
      shownAudiencePollRef.current = true;
      setShowAudiencePoll(true);
    }
  }, [state.audiencePoll]);

  useEffect(() => {
    if (state.phoneHint && !shownPhoneHintRef.current) {
      shownPhoneHintRef.current = true;
      setShowPhoneHint(true);
    }
  }, [state.phoneHint]);

  // Trigger safe haven celebration when reaching a safe haven position
  useEffect(() => {
    if (state.status === 'playing' && state.currentQuestionIndex > 0) {
      const config = MONEY_TREE_CONFIGS[state.questionCount];
      const currentIndex = state.currentQuestionIndex - 1; // Previous question just completed

      // Check if we just passed a safe haven
      if (config.safeHavens.includes(currentIndex) && lastSafeHavenReached !== currentIndex) {
        setLastSafeHavenReached(currentIndex);
        setShowSafeHaven(true);
      }
    }
  }, [state.status, state.currentQuestionIndex, state.questionCount, lastSafeHavenReached]);

  // Trigger wrong answer or victory when status becomes 'result'
  useEffect(() => {
    if (state.status === 'result' && revealState.showResult) {
      const config = MONEY_TREE_CONFIGS[state.questionCount];
      const allCorrect = state.currentQuestionIndex === state.questions.length - 1 &&
                         state.selectedOption === currentQuestion.correctAnswerIndex;

      if (allCorrect) {
        // Victory - won the top prize
        setShowVictory(true);
      } else if (state.selectedOption !== null && state.selectedOption !== currentQuestion.correctAnswerIndex) {
        // Wrong answer - show reveal
        setShowWrongAnswer(true);
      }
    }
  }, [state.status, revealState.showResult]);

  // Build answeredCorrectly array for MoneyTree
  const answeredCorrectly = new Array(state.questions.length).fill(false);
  for (let i = 0; i < state.currentQuestionIndex; i++) {
    answeredCorrectly[i] = true;
  }

  // Result screen - Victory or Game Over
  if (state.status === 'result') {
    const allCorrect = state.currentQuestionIndex === state.questions.length - 1 &&
                       state.selectedOption === currentQuestion.correctAnswerIndex;

    return (
      <div className="h-full w-full bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex flex-col items-center justify-center font-poppins animate-fade-in">
        {allCorrect ? (
          <>
            <div className="text-8xl mb-6 animate-bounce">💰</div>
            <h2 className="text-6xl font-black text-amber-400 mb-4">MILLIONAIRE!</h2>
            <p className="text-3xl text-white mb-4">You won:</p>
            <p className="text-7xl font-black text-green-400 mb-10">
              ${state.currentPrize.toLocaleString()}
            </p>
          </>
        ) : (
          <>
            <div className="text-8xl mb-6">😔</div>
            <h2 className="text-5xl font-black text-white mb-4">Game Over</h2>
            <p className="text-2xl text-indigo-200 mb-4">You take home:</p>
            <p className="text-6xl font-black text-amber-400 mb-10">
              ${state.safeHavenAmount.toLocaleString()}
            </p>
          </>
        )}
        <div className="flex gap-4">
          {onRestart && (
            <button
              onClick={onRestart}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl
                rounded-2xl shadow-xl transition-colors uppercase tracking-wider"
            >
              Play Again
            </button>
          )}
          <button
            onClick={onClose}
            className="px-10 py-4 bg-white text-slate-900 font-bold text-xl rounded-2xl
              shadow-xl hover:scale-105 transition-transform"
          >
            Back to Lesson
          </button>
        </div>
      </div>
    );
  }

  // Main game view
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex gap-6 p-6">
      {/* Left Column - Money Tree (30%) */}
      <div className="w-[30%] flex flex-col gap-4">
        <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-4 border border-indigo-400/20">
          <h3 className="text-lg font-bold text-indigo-300 mb-3 text-center uppercase tracking-wider">
            Prize Ladder
          </h3>
          <MoneyTree
            config={config}
            currentQuestionIndex={state.currentQuestionIndex}
            answeredCorrectly={answeredCorrectly}
          />
        </div>

        {/* Lifelines */}
        <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-6 border border-indigo-400/20">
          <h3 className="text-sm font-bold text-indigo-300 mb-4 text-center uppercase tracking-wider">
            Lifelines
          </h3>
          <LifelinePanel
            lifelines={state.lifelines}
            onUseLifeline={onUseLifeline || (() => {})}
            disabled={state.status !== 'playing'}
            isLoading={isLifelineLoading}
          />
        </div>
      </div>

      {/* Right Column - Question and Controls (70%) */}
      <div className="flex-1 flex flex-col">
        {/* Question Number Badge with Sound Toggle */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1"></div>
          <span className="inline-block px-6 py-2 bg-indigo-900/60 backdrop-blur-sm rounded-full text-lg font-bold uppercase tracking-widest text-indigo-300 border border-indigo-400/30">
            Question {state.currentQuestionIndex + 1} of {state.questions.length}
          </span>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="px-4 py-2 bg-indigo-900/60 backdrop-blur-sm rounded-full border border-indigo-400/30 hover:bg-indigo-800/60 transition-colors"
              title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            >
              {soundEnabled ? (
                <svg className="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Question Component */}
        <div className="flex-1 bg-slate-900/40 backdrop-blur-sm rounded-2xl p-6 border border-indigo-400/20">
          <MillionaireQuestion
            question={currentQuestion}
            selectedOption={state.selectedOption}
            eliminatedOptions={state.eliminatedOptions}
            onSelectOption={onSelectOption || (() => {})}
            onLockIn={onLockIn || (() => {})}
            isLocked={state.status === 'reveal'}
            revealState={revealState}
          />
        </div>

        {/* Teacher Controls */}
        <div className="mt-4 flex justify-center gap-4">
          {revealState.showResult && onNextQuestion && (
            <button
              onClick={onNextQuestion}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg
                rounded-xl shadow-lg transition-colors uppercase tracking-wider"
            >
              {state.currentQuestionIndex < state.questions.length - 1
                ? 'Next Question →'
                : 'See Results'
              }
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg
              rounded-xl shadow-lg transition-colors"
          >
            End Game
          </button>
        </div>
      </div>

      {/* Audience Poll Overlay */}
      {showAudiencePoll && state.audiencePoll && (
        <AudiencePollOverlay
          percentages={state.audiencePoll}
          onClose={() => setShowAudiencePoll(false)}
        />
      )}

      {/* Phone a Friend Overlay */}
      {showPhoneHint && state.phoneHint && (
        <PhoneAFriendOverlay
          hint={state.phoneHint}
          onClose={() => setShowPhoneHint(false)}
        />
      )}

      {/* Safe Haven Celebration */}
      {showSafeHaven && (
        <SafeHavenCelebration
          amount={state.safeHavenAmount}
          onComplete={() => setShowSafeHaven(false)}
        />
      )}

      {/* Wrong Answer Reveal */}
      {showWrongAnswer && (
        <WrongAnswerReveal
          correctAnswer={currentQuestion.options[currentQuestion.correctAnswerIndex]}
          correctLetter={String.fromCharCode(65 + currentQuestion.correctAnswerIndex)}
          safeHavenAmount={state.safeHavenAmount}
          onClose={() => {
            setShowWrongAnswer(false);
            // Trigger result screen after wrong answer reveal is dismissed
            if (onClose) onClose();
          }}
        />
      )}

      {/* Victory Celebration */}
      {showVictory && (
        <VictoryCelebration
          finalPrize={state.currentPrize}
          onClose={onClose}
          onRestart={onRestart}
        />
      )}
    </div>
  );
};

export default MillionaireGame;
