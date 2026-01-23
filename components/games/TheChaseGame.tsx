import React from 'react';
import { TheChaseState } from '../../types';
import GameSplash from './shared/GameSplash';

interface TheChaseGameProps {
  state: TheChaseState;
  onClose: () => void;
}

const TheChaseGame: React.FC<TheChaseGameProps> = ({ state, onClose }) => {
  return (
    <div className="w-full h-full relative">
      <GameSplash gameType="the-chase" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
        <div className="text-center">
          <p className="text-3xl font-bold text-white mb-4">Coming in Phase 23</p>
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

export default TheChaseGame;
