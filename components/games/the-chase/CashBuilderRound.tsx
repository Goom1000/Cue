import React, { useState, useEffect, useCallback } from 'react';
import { QuizQuestion } from '../../../services/geminiService';
import { useTimer } from '../../../hooks/useTimer';
import Timer from '../shared/Timer';

interface CashBuilderRoundProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
  onExit: () => void;
}

const CashBuilderRound: React.FC<CashBuilderRoundProps> = ({
  questions,
  onComplete,
  onExit
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  // Timer configuration - 60 seconds
  const timer = useTimer({
    initialSeconds: 60,
    onComplete: () => onComplete(score),
    autoStart: true
  });

  // Handle answer selection
  const handleAnswer = useCallback((selectedIndex: number) => {
    if (isAnswering || !timer.isRunning) return;

    setIsAnswering(true);
    const isCorrect = selectedIndex === currentQuestion.correctAnswerIndex;

    // Flash feedback
    setLastAnswerCorrect(isCorrect);

    if (isCorrect) {
      setScore(prev => prev + 1000); // $1000 per correct answer
    }

    // Brief pause then next question
    setTimeout(() => {
      setLastAnswerCorrect(null);
      setIsAnswering(false);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // Ran out of questions - end round
        onComplete(score + (isCorrect ? 1000 : 0));
      }
    }, 300);
  }, [currentQuestion, currentQuestionIndex, questions.length, score, isAnswering, timer.isRunning, onComplete]);

  // Keyboard shortcuts for quick answers (1-4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4') {
        handleAnswer(parseInt(e.key) - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAnswer]);

  return (
    <div className={`w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
      flex flex-col p-6 ${lastAnswerCorrect === true ? 'animate-chase-score-flash' : ''}
      ${lastAnswerCorrect === false ? 'animate-chase-wrong-flash' : ''}`}>

      {/* Header with Timer and Score */}
      <div className="flex justify-between items-center mb-6">
        {/* Timer */}
        <div className="bg-slate-800/80 rounded-xl px-6 py-4 border-2 border-slate-600">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Time</div>
          <div className={`text-5xl font-mono font-bold ${
            timer.timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-white'
          }`}>
            {timer.formattedTime}
          </div>
        </div>

        {/* Round Label */}
        <div className="text-center">
          <h2 className="text-3xl font-black text-amber-400 uppercase tracking-widest">
            Cash Builder
          </h2>
          <p className="text-slate-400 mt-1">Answer quickly!</p>
        </div>

        {/* Score */}
        <div className="bg-slate-800/80 rounded-xl px-6 py-4 border-2 border-amber-500/30">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Prize Pot</div>
          <div className="text-5xl font-bold text-amber-400">
            ${score.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
        {/* Question */}
        <div className="bg-slate-800/60 p-8 rounded-2xl border-2 border-slate-600 mb-6">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">
            Question {currentQuestionIndex + 1}
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
            {currentQuestion?.question}
          </p>
        </div>

        {/* Answer Options - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4">
          {currentQuestion?.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={isAnswering || !timer.isRunning}
              className={`
                p-6 rounded-xl text-left font-bold text-lg
                transition-all duration-150 border-2
                ${isAnswering
                  ? idx === currentQuestion.correctAnswerIndex
                    ? 'bg-green-600 border-green-400 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-400'
                  : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500 hover:scale-[1.02]'
                }
              `}
            >
              <span className="text-slate-400 mr-3">{idx + 1}.</span>
              {option}
            </button>
          ))}
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-slate-500 text-sm mt-4">
          Press 1-4 to answer quickly
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

export default CashBuilderRound;
