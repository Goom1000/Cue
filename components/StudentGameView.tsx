import React from 'react';
import { GameState, MillionaireState, assertNever } from '../types';
import GameSplash from './games/shared/GameSplash';
import ResultScreen from './games/shared/ResultScreen';
import MoneyTree from './games/millionaire/MoneyTree';
import { MONEY_TREE_CONFIGS } from './games/millionaire/millionaireConfig';

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

  // Placeholder games (the-chase, beat-the-chaser)
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

// Placeholder for upcoming games - show splash with waiting message
const PlaceholderStudentView: React.FC<{ gameType: 'the-chase' | 'beat-the-chaser' }> = ({ gameType }) => {
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
