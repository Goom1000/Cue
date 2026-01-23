import React from 'react';
import { GameState, MillionaireState, TheChaseState, BeatTheChaserState, assertNever } from '../types';
import GameSplash from './games/shared/GameSplash';
import ResultScreen from './games/shared/ResultScreen';
import MoneyTree from './games/millionaire/MoneyTree';
import { MONEY_TREE_CONFIGS } from './games/millionaire/millionaireConfig';
import GameBoard from './games/the-chase/GameBoard';
import VotingWidget from './games/the-chase/VotingWidget';
import ScoreDisplay from './games/shared/ScoreDisplay';

interface StudentGameViewProps {
  gameState: GameState;
}

// Phase and turn banner overlay for classroom visibility
interface PhaseBannerProps {
  phase: string;
  turn?: 'contestant' | 'chaser';
}

const PhaseBanner: React.FC<PhaseBannerProps> = ({ phase, turn }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pt-4 gap-2 pointer-events-none">
      {/* Phase Label - always visible */}
      <div className="px-6 py-2 bg-slate-900/90 backdrop-blur-sm rounded-full border-2 border-slate-600">
        <span className="text-lg md:text-xl font-bold text-amber-400 uppercase tracking-widest">
          {phase}
        </span>
      </div>

      {/* Turn Banner - shown when applicable */}
      {turn && (
        <div
          className={`
            px-10 py-4 rounded-2xl text-2xl md:text-4xl font-black uppercase tracking-wide
            shadow-2xl transition-all duration-500 animate-fade-in
            ${turn === 'contestant'
              ? 'bg-blue-600 text-white shadow-blue-500/50'
              : 'bg-red-600 text-white shadow-red-500/50'}
          `}
        >
          {turn === 'contestant' ? "CONTESTANT'S TURN" : "CHASER'S TURN"}
        </div>
      )}
    </div>
  );
};

// Large timer with screen edge glow for urgency
interface UrgentTimerProps {
  seconds: number;
  label?: string;
  isActive?: boolean; // Only show urgency effects when active
}

const UrgentTimer: React.FC<UrgentTimerProps> = ({ seconds, label, isActive = true }) => {
  const isUrgent = seconds <= 10 && seconds > 0 && isActive;

  // Format as M:SS
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <>
      {/* Screen edge glow overlay for urgency */}
      {isUrgent && (
        <div className="fixed inset-0 pointer-events-none z-30 animate-urgency-glow" />
      )}

      <div className="text-center">
        {label && (
          <div className="text-sm text-slate-400 uppercase tracking-wider mb-2">{label}</div>
        )}
        <div className={`
          text-7xl md:text-8xl font-black font-mono transition-all duration-300
          ${isUrgent
            ? 'text-red-500 animate-rapid-pulse'
            : 'text-white'}
        `}>
          {display}
        </div>
      </div>
    </>
  );
};

/**
 * Read-only game display for student view.
 * Routes game state based on discriminated union type.
 * Students see questions and answers but cannot interact.
 */
const StudentGameView: React.FC<StudentGameViewProps> = ({ gameState }) => {
  // Loading state - shown when game is generating questions
  if (gameState.status === 'loading') {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center font-poppins">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-8 border-white/20 rounded-full"></div>
            <div className="absolute inset-0 border-8 border-t-indigo-500 border-l-transparent border-r-transparent border-b-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-4 bg-indigo-600 rounded-full flex items-center justify-center text-3xl animate-pulse">
              <span role="img" aria-label="robot">&#129302;</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white animate-pulse">Loading Game...</h2>
          <p className="text-indigo-200 mt-2">Preparing questions</p>
        </div>
      </div>
    );
  }

  // Splash state - show game branding
  if (gameState.status === 'splash') {
    return (
      <div className="h-screen w-screen bg-slate-900">
        <GameSplash gameType={gameState.gameType} />
      </div>
    );
  }

  // Result state - game complete
  if (gameState.status === 'result') {
    return (
      <div className="h-screen w-screen bg-slate-900">
        <ResultScreen gameType={gameState.gameType} onClose={() => {}} />
      </div>
    );
  }

  // Helper to wrap game content with score display
  const renderWithScoreDisplay = (gameContent: React.ReactNode) => {
    return (
      <>
        {gameContent}
        {gameState.competitionMode && (
          <ScoreDisplay competitionMode={gameState.competitionMode} />
        )}
      </>
    );
  };

  // Game-specific rendering based on discriminated union (playing/reveal status)
  if (gameState.gameType === 'quick-quiz') {
    return renderWithScoreDisplay(<QuickQuizStudentView state={gameState} />);
  }

  if (gameState.gameType === 'millionaire') {
    return renderWithScoreDisplay(<MillionaireStudentView state={gameState} />);
  }

  if (gameState.gameType === 'the-chase') {
    return renderWithScoreDisplay(<TheChaseStudentView state={gameState} />);
  }

  if (gameState.gameType === 'beat-the-chaser') {
    return renderWithScoreDisplay(<BeatTheChaserStudentView state={gameState} />);
  }

  // Fallback for any future placeholder games
  return renderWithScoreDisplay(<PlaceholderStudentView gameType={gameState.gameType} />);
};

// Quick Quiz student view component (extracted for clarity)
const QuickQuizStudentView: React.FC<{ state: GameState }> = ({ state }) => {
  if (state.gameType !== 'quick-quiz') return null;

  const { questions, currentQuestionIndex, isAnswerRevealed } = state;
  const currentQuestion = questions[currentQuestionIndex];

  // Shape renderer (same as QuizOverlay)
  const renderShape = (idx: number) => {
    const classes = "w-6 h-6 md:w-10 md:h-10 text-white/80";
    if (idx === 0) return <svg className={classes} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>;
    if (idx === 1) return <svg className={classes} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l10 10-10 10L2 12 12 2z"/></svg>;
    if (idx === 2) return <svg className={classes} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>;
    return <svg className={classes} viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18"/></svg>;
  };

  const bgColors = [
    "bg-red-600 border-red-800",
    "bg-blue-600 border-blue-800",
    "bg-amber-500 border-amber-700",
    "bg-green-600 border-green-800"
  ];

  return (
    <div className="h-screen w-screen bg-slate-900/95 flex items-center justify-center p-6 font-poppins text-white">
      <div className="w-full max-w-6xl h-full flex flex-col justify-between py-6">
        {/* Question header */}
        <div className="text-center mb-6">
          <span className="inline-block px-4 py-1 bg-white/10 rounded-full text-sm font-bold uppercase tracking-widest mb-4">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <div className="bg-white text-slate-900 p-8 md:p-12 rounded-3xl shadow-2xl text-2xl md:text-4xl font-bold leading-tight min-h-[200px] flex items-center justify-center border-b-8 border-slate-200">
            {currentQuestion.question}
          </div>
        </div>

        {/* Answer options grid */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 flex-1 min-h-0">
          {currentQuestion.options.map((opt, idx) => {
            const isCorrect = idx === currentQuestion.correctAnswerIndex;
            const isDimmed = isAnswerRevealed && !isCorrect;

            return (
              <div
                key={idx}
                className={`
                  relative rounded-2xl p-6 md:p-8 flex items-center shadow-lg border-b-8 transition-all duration-500
                  ${bgColors[idx]}
                  ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100'}
                  ${isAnswerRevealed && isCorrect ? 'animate-flash-correct' : ''}
                `}
              >
                <div className="absolute top-4 left-4 opacity-50">{renderShape(idx)}</div>
                <span className="text-xl md:text-3xl font-bold text-white pl-12 md:pl-16 drop-shadow-md">
                  {opt}
                </span>
                {isAnswerRevealed && isCorrect && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-green-600 p-2 rounded-full shadow-lg">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Explanation (shown when answer revealed) */}
        {isAnswerRevealed && currentQuestion.explanation && (
          <div className="mt-8 flex justify-center">
            <div className="bg-indigo-900/50 p-4 rounded-xl border border-indigo-500/30 max-w-4xl w-full">
              <span className="text-xs font-bold text-indigo-300 uppercase block mb-1">Explanation</span>
              <p className="text-lg">{currentQuestion.explanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Millionaire student view component (read-only, synced from teacher)
const MillionaireStudentView: React.FC<{ state: MillionaireState }> = ({ state }) => {
  const config = MONEY_TREE_CONFIGS[state.questionCount];
  const currentQuestion = state.questions[state.currentQuestionIndex];

  // Build answered array for MoneyTree
  const answeredCorrectly = Array.from(
    { length: state.currentQuestionIndex },
    () => true
  );

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-950 to-indigo-950 flex font-poppins">
      {/* Left: Money Tree */}
      <div className="w-1/4 p-4 flex items-center">
        <MoneyTree
          config={config}
          currentQuestionIndex={state.currentQuestionIndex}
          answeredCorrectly={answeredCorrectly}
        />
      </div>

      {/* Right: Question area */}
      <div className="flex-1 p-6 flex flex-col justify-center">
        {/* Question number */}
        <div className="text-center mb-4">
          <span className="inline-block px-4 py-1 bg-amber-500 text-amber-950 rounded-full text-sm font-bold">
            Question {state.currentQuestionIndex + 1} for ${config.prizes[state.currentQuestionIndex].toLocaleString()}
          </span>
        </div>

        {/* Question text */}
        <div className="bg-blue-900/50 p-8 rounded-2xl border-2 border-blue-400/30 mb-6 animate-millionaire-glow">
          <p className="text-2xl md:text-4xl font-bold text-white text-center">
            {currentQuestion?.question || 'Loading...'}
          </p>
        </div>

        {/* Answer options */}
        {currentQuestion && (
          <div className="grid grid-cols-2 gap-4">
            {currentQuestion.options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isEliminated = state.eliminatedOptions.includes(idx);
              const isSelected = state.selectedOption === idx;
              const isCorrect = idx === currentQuestion.correctAnswerIndex;
              const showResult = state.status === 'reveal' || state.status === 'result';

              if (isEliminated) {
                return (
                  <div key={idx} className="h-20 bg-blue-950/30 rounded-xl opacity-30" />
                );
              }

              return (
                <div
                  key={idx}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                    ${isSelected && !showResult ? 'bg-amber-500 border-amber-400 text-amber-950' : 'bg-blue-900/50 border-blue-400/30 text-white'}
                    ${showResult && isCorrect ? 'bg-green-600 border-green-400 animate-flash-correct' : ''}
                    ${showResult && isSelected && !isCorrect ? 'bg-red-600 border-red-400 animate-wrong-answer' : ''}
                  `}
                >
                  <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    {letter}
                  </span>
                  <span className="text-lg md:text-xl font-bold">{opt}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Lifeline results */}
        {state.audiencePoll && (
          <div className="mt-6 bg-blue-900/50 p-4 rounded-xl">
            <p className="text-sm text-blue-300 mb-2">Audience Poll:</p>
            <div className="flex gap-4">
              {state.audiencePoll.map((pct, idx) => (
                <div key={idx} className="flex-1 text-center">
                  <div className="text-2xl font-bold text-white">{pct}%</div>
                  <div className="text-blue-300">{String.fromCharCode(65 + idx)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.phoneHint && (
          <div className="mt-6 bg-blue-900/50 p-4 rounded-xl">
            <p className="text-sm text-blue-300 mb-2">Phone-a-Friend says:</p>
            <p className="text-lg text-white italic">"{state.phoneHint.response}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

// The Chase student view component - displays phase-specific game state
const TheChaseStudentView: React.FC<{ state: TheChaseState }> = ({ state }) => {
  const currentQuestion = state.questions[state.currentQuestionIndex];

  // Cash Builder phase - show timer, score, and current question
  if (state.phase === 'cash-builder') {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-red-900 via-slate-900 to-slate-800 flex flex-col items-center justify-center p-6 font-poppins text-white">
        <PhaseBanner phase="Cash Builder" />

        {/* Timer and Score */}
        <div className="flex gap-8 mb-8">
          <UrgentTimer seconds={state.cashBuilderTimeRemaining} label="Time Remaining" />
          <div className="text-center">
            <div className="text-sm text-slate-400 uppercase tracking-wider mb-2">Prize Pot</div>
            <div className="text-7xl md:text-8xl font-black text-amber-400">
              ${state.cashBuilderScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="w-full max-w-4xl">
            <div className="bg-slate-800/60 p-8 rounded-2xl border-2 border-slate-600 mb-6">
              <p className="text-3xl font-bold text-center">
                {currentQuestion.question}
              </p>
            </div>

            {/* Answer options */}
            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.options.map((opt, idx) => {
                const isContestantAnswer = state.contestantAnswer === idx;
                const isCorrect = idx === currentQuestion.correctAnswerIndex;
                const showResult = state.currentQuestionAnswered;

                return (
                  <div
                    key={idx}
                    className={`
                      p-6 rounded-xl border-2 transition-all text-xl font-bold
                      ${isContestantAnswer && !showResult ? 'bg-blue-500 border-blue-400 text-white' : 'bg-slate-700/50 border-slate-600 text-white'}
                      ${showResult && isCorrect ? 'bg-green-600 border-green-400 animate-flash-correct' : ''}
                      ${showResult && isContestantAnswer && !isCorrect ? 'bg-red-600 border-red-400' : ''}
                      ${showResult && !isCorrect && !isContestantAnswer ? 'opacity-40' : ''}
                    `}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Offer Selection phase - show voting widget when open
  if (state.phase === 'offer-selection') {
    if (state.isVotingOpen) {
      return <VotingWidget />;
    }

    // Show offers waiting for teacher to start vote
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 font-poppins text-white">
        <h2 className="text-4xl font-black text-amber-400 mb-8 uppercase tracking-widest">
          The Offers
        </h2>

        <div className="flex gap-6 max-w-4xl">
          {state.offers.map((offer, idx) => (
            <div
              key={idx}
              className="flex-1 p-8 rounded-2xl border-4 border-slate-600 bg-slate-800/60"
            >
              {/* Position indicator */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 ${
                idx === 0 ? 'bg-red-600 text-white' :
                idx === 1 ? 'bg-amber-500 text-amber-950' :
                'bg-green-600 text-white'
              }`}>
                {7 - offer.position}
              </div>

              {/* Amount */}
              <div className="text-4xl font-bold text-white text-center mb-2">
                ${offer.amount.toLocaleString()}
              </div>

              {/* Label */}
              <p className="text-slate-400 text-center text-sm">{offer.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xl text-slate-400">Waiting for vote to begin...</p>
      </div>
    );
  }

  // Head-to-Head phase - show game board with positions
  if (state.phase === 'head-to-head') {
    // Determine turn for banner
    let turn: 'contestant' | 'chaser' | undefined = 'contestant';
    if (state.contestantAnswer !== null && !state.currentQuestionAnswered) {
      turn = 'chaser'; // Contestant answered, showing chaser's turn
    } else if (state.showChaserAnswer) {
      turn = 'chaser'; // Chaser's turn to answer
    }

    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center gap-12 p-6 font-poppins text-white">
        <PhaseBanner phase="Head-to-Head" turn={turn} />

        {/* Game Board */}
        <GameBoard
          contestantPosition={state.contestantPosition}
          chaserPosition={state.chaserPosition}
          className="scale-150"
        />

        {/* Current Question */}
        {currentQuestion && (
          <div className="flex-1 max-w-2xl">
            <div className="bg-slate-800/60 p-8 rounded-2xl border-2 border-slate-600 mb-6">
              <p className="text-2xl font-bold text-center">
                {currentQuestion.question}
              </p>
            </div>

            {/* Answer options */}
            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.options.map((opt, idx) => {
                const isContestantAnswer = state.contestantAnswer === idx;
                const isChaserAnswer = state.chaserAnswer === idx;
                const isCorrect = idx === currentQuestion.correctAnswerIndex;
                const showResult = state.currentQuestionAnswered;

                return (
                  <div
                    key={idx}
                    className={`
                      p-4 rounded-xl border-2 transition-all font-bold
                      ${isContestantAnswer && !showResult ? 'bg-blue-500 border-blue-400 text-white' : ''}
                      ${isChaserAnswer && state.showChaserAnswer && !showResult ? 'bg-red-500 border-red-400 text-white' : ''}
                      ${!isContestantAnswer && !isChaserAnswer ? 'bg-slate-700/50 border-slate-600 text-white' : ''}
                      ${showResult && isCorrect ? 'bg-green-600 border-green-400' : ''}
                      ${showResult && !isCorrect && (isContestantAnswer || isChaserAnswer) ? 'bg-slate-700/30 opacity-50' : ''}
                      ${showResult && !isCorrect && !isContestantAnswer && !isChaserAnswer ? 'opacity-30' : ''}
                    `}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Final Chase phases - show dual timers and scores
  if (state.phase === 'final-chase-contestant' || state.phase === 'final-chase-chaser') {
    const isContestantPhase = state.phase === 'final-chase-contestant';

    return (
      <div className="h-screen w-screen bg-gradient-to-br from-blue-950 via-slate-900 to-red-950 flex flex-col items-center justify-center p-6 font-poppins text-white">
        <PhaseBanner phase="Final Chase" turn={isContestantPhase ? 'contestant' : 'chaser'} />

        {/* Scores and Timers */}
        <div className="flex gap-12 mb-8">
          {/* Contestant */}
          <div className={`text-center p-6 rounded-2xl ${isContestantPhase ? 'bg-blue-900/50 border-2 border-blue-500' : 'bg-slate-800/30'}`}>
            <div className="text-6xl font-bold text-blue-400 mb-4">
              {state.finalChaseContestantScore}
            </div>
            <UrgentTimer
              seconds={state.finalChaseContestantTime}
              label="Contestant"
              isActive={isContestantPhase}
            />
          </div>

          {/* Chaser */}
          <div className={`text-center p-6 rounded-2xl ${!isContestantPhase ? 'bg-red-900/50 border-2 border-red-500' : 'bg-slate-800/30'}`}>
            <div className="text-6xl font-bold text-red-400 mb-4">
              {state.finalChaseChaserScore}
            </div>
            <UrgentTimer
              seconds={state.finalChaseChaserTime}
              label="Chaser"
              isActive={!isContestantPhase}
            />
          </div>
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="w-full max-w-3xl">
            <div className="bg-slate-800/60 p-6 rounded-2xl border-2 border-slate-600 mb-4">
              <p className="text-2xl font-bold text-center">
                {currentQuestion.question}
              </p>
            </div>

            {/* Answer options */}
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((opt, idx) => {
                const isAnswer = isContestantPhase ? state.contestantAnswer === idx : state.chaserAnswer === idx;
                const isCorrect = idx === currentQuestion.correctAnswerIndex;
                const showResult = state.currentQuestionAnswered;

                return (
                  <div
                    key={idx}
                    className={`
                      p-4 rounded-xl border-2 transition-all font-bold text-lg
                      ${isAnswer && !showResult ? (isContestantPhase ? 'bg-blue-500 border-blue-400' : 'bg-red-500 border-red-400') : 'bg-slate-700/50 border-slate-600'}
                      ${showResult && isCorrect ? 'bg-green-600 border-green-400' : ''}
                      ${showResult && !isCorrect && isAnswer ? 'bg-slate-700/30 opacity-50' : ''}
                      ${showResult && !isCorrect && !isAnswer ? 'opacity-30' : ''}
                    `}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Game Over phase - show win/loss result
  if (state.phase === 'game-over') {
    const contestantWon = state.finalChaseContestantScore > state.finalChaseChaserScore ||
                          (state.finalChaseChaserScore < state.chaserTargetScore);

    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center p-6 font-poppins text-white ${
        contestantWon ? 'bg-gradient-to-br from-green-900 via-slate-900 to-green-900' : 'bg-gradient-to-br from-red-900 via-slate-900 to-red-900'
      }`}>
        {/* Result */}
        <div className="text-center mb-8">
          <h1 className={`text-8xl font-black mb-4 ${contestantWon ? 'text-green-400' : 'text-red-400'}`}>
            {contestantWon ? 'VICTORY!' : 'CAUGHT!'}
          </h1>
          <p className="text-3xl text-white">
            {contestantWon ? 'The contestant escaped the chaser!' : 'The chaser caught the contestant!'}
          </p>
        </div>

        {/* Final Scores */}
        <div className="flex gap-12">
          <div className="text-center p-8 rounded-2xl bg-blue-900/50 border-2 border-blue-500">
            <div className="text-6xl font-bold text-blue-400 mb-2">
              {state.finalChaseContestantScore}
            </div>
            <div className="text-slate-300 uppercase tracking-wider">Contestant</div>
          </div>

          <div className="text-6xl font-bold text-slate-500">vs</div>

          <div className="text-center p-8 rounded-2xl bg-red-900/50 border-2 border-red-500">
            <div className="text-6xl font-bold text-red-400 mb-2">
              {state.finalChaseChaserScore}
            </div>
            <div className="text-slate-300 uppercase tracking-wider">Chaser</div>
          </div>
        </div>

        {contestantWon && (
          <div className="mt-8 text-2xl text-amber-400 font-bold animate-pulse">
            🎉 Prize Won: ${state.cashBuilderScore.toLocaleString()} 🎉
          </div>
        )}
      </div>
    );
  }

  // Fallback for unexpected phase
  return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
      <p className="text-white text-xl">Preparing game...</p>
    </div>
  );
};

// Beat the Chaser student view component
const BeatTheChaserStudentView: React.FC<{ state: BeatTheChaserState }> = ({ state }) => {
  const currentQuestion = state.questions[state.currentQuestionIndex];

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cash Builder phase - show time bank
  if (state.phase === 'cash-builder') {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 font-poppins text-white">
        <PhaseBanner phase="Cash Builder" />

        {/* Time Bank Display */}
        <div className="text-center mb-12">
          <div className="bg-slate-800/60 p-8 rounded-2xl border-2 border-green-500/30">
            <div className="text-sm text-slate-400 uppercase tracking-wider mb-2">Time Bank</div>
            <div className="text-8xl font-black text-green-400">
              {state.accumulatedTime}s
            </div>
            <div className="text-slate-500 mt-2">
              {state.cashBuilderCorrectAnswers} correct answers
            </div>
          </div>
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="w-full max-w-4xl">
            <div className="bg-slate-800/60 p-8 rounded-2xl border-2 border-slate-600 mb-6">
              <p className="text-3xl font-bold text-center">
                {currentQuestion.question}
              </p>
            </div>

            {/* Answer options */}
            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.options.map((opt, idx) => {
                const isAnswer = state.contestantAnswer === idx;
                const isCorrect = idx === currentQuestion.correctAnswerIndex;

                return (
                  <div
                    key={idx}
                    className={`
                      p-6 rounded-xl border-2 transition-all text-xl font-bold
                      ${isAnswer ? 'bg-blue-500 border-blue-400 text-white' : 'bg-slate-700/50 border-slate-600 text-white'}
                    `}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Timed Battle phase - show dual timers
  if (state.phase === 'timed-battle') {
    const isUrgent = (time: number) => time <= 10;
    const isContestantActive = state.activePlayer === 'contestant';
    const contestantUrgent = isUrgent(state.contestantTime) && state.activePlayer === 'contestant';
    const chaserUrgent = isUrgent(state.chaserTime) && state.activePlayer === 'chaser';

    return (
      <div className="h-screen w-screen bg-gradient-to-br from-blue-950 via-slate-900 to-red-950 flex flex-col items-center justify-center p-6 font-poppins text-white">
        <PhaseBanner phase="Timed Battle" turn={state.activePlayer} />

        {/* Screen edge glow for active urgent timer */}
        {(contestantUrgent || chaserUrgent) && (
          <div className="fixed inset-0 pointer-events-none z-30 animate-urgency-glow" />
        )}
        {/* Dual Timers */}
        <div className="flex gap-6 md:gap-12 mb-8 w-full max-w-5xl">
          {/* Contestant Timer */}
          <div className={`flex-1 p-6 md:p-8 rounded-3xl transition-all duration-300 ${
            isContestantActive
              ? 'bg-blue-900/60 ring-4 ring-amber-400 shadow-lg shadow-amber-400/30 scale-105'
              : 'bg-blue-900/30 opacity-50 scale-95'
          }`}>
            <div className="text-center">
              <div className="text-sm uppercase tracking-wider text-blue-300 mb-2">Contestant</div>
              <div className={`text-6xl md:text-8xl font-black ${
                isUrgent(state.contestantTime) && state.activePlayer === 'contestant'
                  ? 'text-red-500 animate-rapid-pulse'
                  : 'text-white'
              }`}>
                {formatTime(state.contestantTime)}
              </div>
              {isContestantActive && (
                <div className="mt-3 text-sm font-bold text-yellow-400 animate-bounce">
                  YOUR TURN
                </div>
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center">
            <div className="text-4xl md:text-5xl font-black text-slate-500">VS</div>
          </div>

          {/* Chaser Timer */}
          <div className={`flex-1 p-6 md:p-8 rounded-3xl transition-all duration-300 ${
            !isContestantActive
              ? 'bg-red-900/60 ring-4 ring-amber-400 shadow-lg shadow-amber-400/30 scale-105'
              : 'bg-red-900/30 opacity-50 scale-95'
          }`}>
            <div className="text-center">
              <div className="text-sm uppercase tracking-wider text-red-300 mb-2">Chaser</div>
              <div className={`text-6xl md:text-8xl font-black ${
                isUrgent(state.chaserTime) && state.activePlayer === 'chaser'
                  ? 'text-red-500 animate-rapid-pulse'
                  : 'text-white'
              }`}>
                {formatTime(state.chaserTime)}
              </div>
              {!isContestantActive && (
                <div className="mt-3 text-sm font-bold text-red-400 animate-bounce">
                  CHASER'S TURN
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="w-full max-w-4xl">
            <div className="bg-slate-800/60 p-6 rounded-2xl border-2 border-slate-600 mb-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 text-center">
                Question {state.currentQuestionIndex + 1}
              </div>
              <p className="text-2xl font-bold text-center">
                {currentQuestion.question}
              </p>
            </div>

            {/* Answer options */}
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((opt, idx) => {
                const isContestantAnswer = state.contestantAnswer === idx;
                const isChaserAnswer = state.chaserAnswer === idx;
                const isCorrect = idx === currentQuestion.correctAnswerIndex;

                return (
                  <div
                    key={idx}
                    className={`
                      p-4 rounded-xl border-2 transition-all font-bold text-lg
                      ${isContestantAnswer ? 'bg-blue-500 border-blue-400 text-white' : ''}
                      ${isChaserAnswer ? 'bg-red-500 border-red-400 text-white' : ''}
                      ${!isContestantAnswer && !isChaserAnswer ? 'bg-slate-700/50 border-slate-600 text-white' : ''}
                    `}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Time bonus indicator */}
        {state.showTimeBonusEffect && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
            <div className="text-9xl font-black text-green-400 animate-bounce"
              style={{ textShadow: '0 0 40px rgba(74, 222, 128, 0.8)' }}>
              +5s
            </div>
          </div>
        )}
      </div>
    );
  }

  // Game Over phase - show result
  if (state.phase === 'game-over') {
    const contestantWon = state.winner === 'contestant';

    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center p-6 font-poppins text-white ${
        contestantWon
          ? 'bg-gradient-to-br from-green-900 via-slate-900 to-green-900'
          : 'bg-gradient-to-br from-red-900 via-slate-900 to-red-900'
      }`}>
        {/* Result */}
        <div className="text-center mb-12">
          <h1 className={`text-8xl md:text-9xl font-black mb-4 ${
            contestantWon ? 'text-green-400' : 'text-red-400'
          }`}>
            {contestantWon ? 'VICTORY!' : 'DEFEATED!'}
          </h1>
          <p className="text-3xl text-white">
            {contestantWon
              ? 'You beat the chaser!'
              : 'The chaser caught you!'
            }
          </p>
        </div>

        {/* Final Times */}
        <div className="flex gap-12">
          <div className={`text-center p-8 rounded-2xl ${
            contestantWon ? 'bg-blue-900/50 border-2 border-blue-500' : 'bg-slate-800/50'
          }`}>
            <div className={`text-7xl font-bold mb-2 ${
              contestantWon ? 'text-blue-400' : 'text-slate-400'
            }`}>
              {state.contestantTime}s
            </div>
            <div className="text-slate-300 uppercase tracking-wider">Contestant</div>
          </div>

          <div className="flex items-center">
            <div className="text-5xl font-bold text-slate-500">vs</div>
          </div>

          <div className={`text-center p-8 rounded-2xl ${
            !contestantWon ? 'bg-red-900/50 border-2 border-red-500' : 'bg-slate-800/50'
          }`}>
            <div className={`text-7xl font-bold mb-2 ${
              !contestantWon ? 'text-red-400' : 'text-slate-400'
            }`}>
              {state.chaserTime}s
            </div>
            <div className="text-slate-300 uppercase tracking-wider">Chaser</div>
          </div>
        </div>
      </div>
    );
  }

  // Setup phase or unknown - show waiting state
  return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center font-poppins">
      <div className="text-center">
        <GameSplash gameType="beat-the-chaser" />
        <p className="text-xl text-white/60 mt-8">Waiting for teacher...</p>
      </div>
    </div>
  );
};

// Placeholder for upcoming games - show splash with waiting message
const PlaceholderStudentView: React.FC<{ gameType: 'beat-the-chaser' }> = ({ gameType }) => {
  return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <GameSplash gameType={gameType} />
        <p className="text-xl text-white/60 mt-8">Waiting for teacher...</p>
      </div>
    </div>
  );
};

export default StudentGameView;
