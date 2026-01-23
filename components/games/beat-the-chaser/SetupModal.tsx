import React, { useState } from 'react';
import { BEAT_THE_CHASER_DIFFICULTY, BeatTheChaserDifficulty } from './beatTheChaserConfig';

interface SetupModalProps {
  onStart: (difficulty: BeatTheChaserDifficulty, isAIControlled: boolean) => void;
  onCancel: () => void;
}

const SetupModal: React.FC<SetupModalProps> = ({ onStart, onCancel }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<BeatTheChaserDifficulty>('medium');
  const [isAIControlled, setIsAIControlled] = useState(true);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 font-poppins">
      <div className="bg-slate-800 p-8 rounded-2xl max-w-2xl w-full mx-4 border-2 border-slate-600">
        <h2 className="text-3xl font-black text-amber-400 mb-6 text-center">
          Beat the Chaser Setup
        </h2>

        {/* Difficulty Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Select Difficulty</h3>
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(BEAT_THE_CHASER_DIFFICULTY) as BeatTheChaserDifficulty[]).map((diff) => {
              const config = BEAT_THE_CHASER_DIFFICULTY[diff];
              const isSelected = selectedDifficulty === diff;

              return (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/20'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div className="font-bold text-white text-lg mb-1">{config.label}</div>
                  <div className="text-sm text-slate-400">{config.description}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    Chaser: {Math.round(config.timeRatio * 100)}% time
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Control Toggle */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white mb-3">Chaser Control</h3>
          <div className="flex gap-4">
            <button
              onClick={() => setIsAIControlled(true)}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                isAIControlled
                  ? 'border-amber-400 bg-amber-500/20'
                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
              }`}
            >
              <div className="font-bold text-white">AI-Controlled</div>
              <div className="text-sm text-slate-400">Chaser answers automatically</div>
            </button>
            <button
              onClick={() => setIsAIControlled(false)}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                !isAIControlled
                  ? 'border-amber-400 bg-amber-500/20'
                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
              }`}
            >
              <div className="font-bold text-white">Manual Control</div>
              <div className="text-sm text-slate-400">Teacher controls chaser</div>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-6 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onStart(selectedDifficulty, isAIControlled)}
            className="flex-1 py-3 px-6 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold rounded-xl transition-colors"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
