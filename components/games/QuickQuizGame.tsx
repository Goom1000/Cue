import React from 'react';
import { QuickQuizState } from '../../types';
import ResultScreen from './shared/ResultScreen';

interface QuickQuizGameProps {
  state: QuickQuizState;
  onRevealAnswer: () => void;
  onNextQuestion: () => void;
  onClose: () => void;
  onRestart?: () => void;
}

const QuickQuizGame: React.FC<QuickQuizGameProps> = ({
  state,
  onRevealAnswer,
  onNextQuestion,
  onClose,
  onRestart,
}) => {
  const { questions, currentQuestionIndex, isAnswerRevealed, status } = state;
  const currentQuestion = questions[currentQuestionIndex];

  // Shape renderer (Kahoot-style)
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

  // Result screen
  if (status === 'result') {
    return <ResultScreen gameType="quick-quiz" onClose={onClose} onRestart={onRestart} />;
  }

  // Play mode
  return (
    <div className="w-full h-full flex flex-col justify-between py-6 px-6">
      {/* Question header */}
      <div className="text-center mb-6">
        <span className="inline-block px-4 py-1 bg-white/10 rounded-full text-sm font-bold uppercase tracking-widest mb-4 text-white">
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

      {/* Controls */}
      <div className="mt-8 flex justify-center gap-4">
        {!isAnswerRevealed ? (
          <button
            onClick={onRevealAnswer}
            className="px-8 py-3 bg-white text-indigo-900 font-bold text-xl rounded-full shadow-lg hover:scale-105 transition-transform"
          >
            Reveal Answer
          </button>
        ) : (
          <div className="flex items-center gap-6 animate-fade-in w-full max-w-4xl">
            <div className="flex-1 bg-indigo-900/50 p-4 rounded-xl border border-indigo-500/30">
              <span className="text-xs font-bold text-indigo-300 uppercase block mb-1">Explanation</span>
              <p className="text-lg text-white">{currentQuestion.explanation}</p>
            </div>
            <button
              onClick={onNextQuestion}
              className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xl rounded-2xl border-b-4 border-indigo-700 active:translate-y-1 active:border-b-0 transition-all shrink-0"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question ➔' : 'Finish'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickQuizGame;
