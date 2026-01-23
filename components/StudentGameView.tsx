import React from 'react';
import { GameState, MillionaireState, TheChaseState, assertNever } from '../types';
import GameSplash from './games/shared/GameSplash';
import ResultScreen from './games/shared/ResultScreen';
import MoneyTree from './games/millionaire/MoneyTree';
import { MONEY_TREE_CONFIGS } from './games/millionaire/millionaireConfig';
import GameBoard from './games/the-chase/GameBoard';
import VotingWidget from './games/the-chase/VotingWidget';

interface StudentGameViewProps {
  gameState: GameState;
}

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

  // Game-specific rendering based on discriminated union (playing/reveal status)
  if (gameState.gameType === 'quick-quiz') {
    return <QuickQuizStudentView state={gameState} />;
  }

  if (gameState.gameType === 'millionaire') {
    return <MillionaireStudentView state={gameState} />;
  }

  if (gameState.gameType === 'the-chase') {
    return <TheChaseStudentView state={gameState} />;
  }

  // Placeholder games (beat-the-chaser)
  return <PlaceholderStudentView gameType={gameState.gameType} />;
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
        {/* Timer and Score */}
        <div className="flex gap-8 mb-8">
          <div className="text-center">
            <div className={`text-6xl font-bold ${state.cashBuilderTimeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {state.cashBuilderTimeRemaining}s
            </div>
            <div className="text-slate-400 text-sm uppercase tracking-wider">Time Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-6xl font-bold text-amber-400">
              ${state.cashBuilderScore.toLocaleString()}
            </div>
            <div className="text-slate-400 text-sm uppercase tracking-wider">Prize Pot</div>
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
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center gap-12 p-6 font-poppins text-white">
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
        {/* Phase indicator */}
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-black text-amber-400 uppercase tracking-widest">
            Final Chase
          </h2>
          <p className="text-xl text-slate-400 mt-2">
            {isContestantPhase ? 'Contestant Round' : 'Chaser Round'}
          </p>
        </div>

        {/* Scores and Timers */}
        <div className="flex gap-12 mb-8">
          {/* Contestant */}
          <div className={`text-center p-6 rounded-2xl ${isContestantPhase ? 'bg-blue-900/50 border-2 border-blue-500' : 'bg-slate-800/30'}`}>
            <div className="text-6xl font-bold text-blue-400">
              {state.finalChaseContestantScore}
            </div>
            <div className="text-slate-400 text-sm uppercase tracking-wider mb-4">Contestant</div>
            <div className={`text-4xl font-bold ${state.finalChaseContestantTime <= 10 && isContestantPhase ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {state.finalChaseContestantTime}s
            </div>
          </div>

          {/* Chaser */}
          <div className={`text-center p-6 rounded-2xl ${!isContestantPhase ? 'bg-red-900/50 border-2 border-red-500' : 'bg-slate-800/30'}`}>
            <div className="text-6xl font-bold text-red-400">
              {state.finalChaseChaserScore}
            </div>
            <div className="text-slate-400 text-sm uppercase tracking-wider mb-4">Chaser</div>
            <div className={`text-4xl font-bold ${state.finalChaseChaserTime <= 10 && !isContestantPhase ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {state.finalChaseChaserTime}s
            </div>
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
