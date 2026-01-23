import React from 'react';
import { QuizQuestion } from '../../../services/geminiService';

interface MillionaireQuestionProps {
  question: QuizQuestion;
  selectedOption: number | null;
  eliminatedOptions: number[];
  onSelectOption: (idx: number) => void;
  onLockIn: () => void;
  isLocked: boolean;
  revealState: {
    isRevealing: boolean;
    revealedCount: number;
    showResult: boolean;
  };
}

const MillionaireQuestion: React.FC<MillionaireQuestionProps> = ({
  question,
  selectedOption,
  eliminatedOptions,
  onSelectOption,
  onLockIn,
  isLocked,
  revealState,
}) => {
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex flex-col h-full justify-between p-8">
      {/* Question Text */}
      <div className="bg-gradient-to-br from-blue-950 to-indigo-900 p-8 rounded-2xl border-2 border-indigo-400/30 shadow-2xl mb-8">
        <h2 className="text-3xl font-bold text-white text-center leading-tight">
          {question.question}
        </h2>
      </div>

      {/* Answer Options */}
      <div className="flex-1 flex flex-col gap-4 justify-center">
        {question.options.map((option, idx) => {
          const isEliminated = eliminatedOptions.includes(idx);
          const isSelected = selectedOption === idx;
          const isCorrect = idx === question.correctAnswerIndex;
          const isRevealed = revealState.revealedCount > idx;

          // Visual states
          const isHighlighted = isSelected && !isLocked;
          const isLockedSelected = isSelected && isLocked && !revealState.showResult;
          const showCorrect = revealState.showResult && isCorrect;
          const showWrong = revealState.showResult && isSelected && !isCorrect;

          if (isEliminated) {
            return (
              <div
                key={idx}
                className="flex items-center gap-4 py-4 px-6 rounded-xl bg-slate-900/50 border border-slate-700 opacity-30"
              >
                <span className="text-2xl font-black text-slate-600 w-12">{letters[idx]}</span>
                <span className="text-xl text-slate-600 line-through">{option}</span>
              </div>
            );
          }

          return (
            <button
              key={idx}
              onClick={() => !isLocked && onSelectOption(idx)}
              disabled={isLocked || isEliminated}
              className={`
                flex items-center gap-4 py-6 px-8 rounded-xl border-2 transition-all duration-300
                ${!isLocked && !isEliminated ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'}
                ${isHighlighted ? 'bg-amber-500 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] scale-105' : ''}
                ${isLockedSelected ? 'bg-amber-500/80 border-amber-400' : ''}
                ${!isHighlighted && !isLockedSelected ? 'bg-gradient-to-r from-blue-900/80 to-indigo-900/80 border-indigo-400/40' : ''}
                ${showCorrect ? 'bg-green-500 border-green-400 shadow-[0_0_40px_rgba(34,197,94,0.7)] scale-105 animate-pulse' : ''}
                ${showWrong ? 'bg-red-600 border-red-500 animate-shake' : ''}
                ${revealState.isRevealing && !isRevealed ? 'opacity-40' : 'opacity-100'}
              `}
            >
              <span className={`
                text-3xl font-black w-12 text-center transition-colors
                ${isHighlighted || isLockedSelected ? 'text-amber-950' : 'text-white/90'}
                ${showCorrect ? 'text-white' : ''}
                ${showWrong ? 'text-white' : ''}
              `}>
                {letters[idx]}
              </span>
              <span className={`
                text-xl font-semibold flex-1 text-left transition-colors
                ${isHighlighted || isLockedSelected ? 'text-amber-950' : 'text-white'}
                ${showCorrect ? 'text-white font-bold' : ''}
                ${showWrong ? 'text-white' : ''}
              `}>
                {option}
              </span>
              {showCorrect && (
                <svg className="w-10 h-10 text-white animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {showWrong && (
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Lock In Button */}
      {!isLocked && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={onLockIn}
            disabled={selectedOption === null}
            className={`
              px-12 py-4 text-2xl font-black uppercase tracking-wider rounded-xl
              transition-all duration-300
              ${selectedOption === null
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-amber-500 text-amber-950 hover:bg-amber-400 hover:scale-105 shadow-[0_0_30px_rgba(251,191,36,0.4)] animate-pulse'
              }
            `}
          >
            Lock In Final Answer
          </button>
        </div>
      )}
    </div>
  );
};

export default MillionaireQuestion;
