import React from 'react';
import { GameType } from '../../../types';

interface ResultScreenProps {
  gameType: GameType;
  onClose: () => void;
  onRestart?: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ gameType, onClose, onRestart }) => {
  return (
    <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center font-poppins animate-fade-in">
      <div className="text-8xl mb-6 animate-bounce">🏆</div>
      <h2 className="text-5xl font-black text-white mb-4">Game Complete!</h2>
      <p className="text-2xl text-indigo-200 mb-10">Great job reviewing the lesson.</p>
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
};

export default ResultScreen;
