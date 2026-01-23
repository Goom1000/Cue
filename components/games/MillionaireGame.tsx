import React from 'react';
import { MillionaireState } from '../../types';
import GameSplash from './shared/GameSplash';

interface MillionaireGameProps {
  state: MillionaireState;
  onClose: () => void;
}

const MillionaireGame: React.FC<MillionaireGameProps> = ({ state, onClose }) => {
  return (
    <div className="w-full h-full relative">
      <GameSplash gameType="millionaire" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
        <div className="text-center">
          <p className="text-3xl font-bold text-white mb-4">Coming in Phase 21</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:scale-105 transition-transform"
          >
            Back to Lesson
          </button>
        </div>
      </div>
    </div>
  );
};

export default MillionaireGame;
