import React from 'react';
import { GameType } from '../../../types';

interface GameSplashProps {
  gameType: GameType;
  onContinue?: () => void;
}

const gameConfig: Record<GameType, { icon: string; name: string; tagline: string; bgColor: string }> = {
  'quick-quiz': {
    icon: '🎯',
    name: 'Quick Quiz',
    tagline: 'Test your knowledge!',
    bgColor: 'from-indigo-600 to-purple-700',
  },
  'millionaire': {
    icon: '💰',
    name: 'Who Wants to Be a Millionaire',
    tagline: 'Answer 15 questions to win it all!',
    bgColor: 'from-blue-900 to-indigo-900',
  },
  'the-chase': {
    icon: '🏃',
    name: 'The Chase',
    tagline: 'Can you outrun the Chaser?',
    bgColor: 'from-slate-800 to-slate-900',
  },
  'beat-the-chaser': {
    icon: '⚡',
    name: 'Beat the Chaser',
    tagline: 'Race against time!',
    bgColor: 'from-amber-600 to-orange-700',
  },
};

const GameSplash: React.FC<GameSplashProps> = ({ gameType, onContinue }) => {
  const config = gameConfig[gameType];

  return (
    <div className={`h-full w-full bg-gradient-to-br ${config.bgColor} flex flex-col items-center justify-center font-poppins animate-fade-in`}>
      <div className="text-9xl mb-8 animate-bounce">{config.icon}</div>
      <h1 className="text-5xl md:text-6xl font-black text-white mb-4 text-center px-8 drop-shadow-lg">
        {config.name}
      </h1>
      <p className="text-xl md:text-2xl text-white/80 mb-12">{config.tagline}</p>
      {onContinue && (
        <button
          onClick={onContinue}
          className="px-10 py-4 bg-white text-slate-900 font-bold text-xl rounded-2xl
            shadow-xl hover:scale-105 transition-transform uppercase tracking-wider"
        >
          Let's Go!
        </button>
      )}
    </div>
  );
};

export default GameSplash;
