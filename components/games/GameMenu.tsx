import React, { useEffect, useRef, useState } from 'react';
import { GameType } from '../../types';

interface GameMenuProps {
  onSelectGame: (type: GameType) => void;
  disabled?: boolean;
}

const GameMenu: React.FC<GameMenuProps> = ({ onSelectGame, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const games: { type: GameType; icon: string; name: string; description: string }[] = [
    { type: 'quick-quiz', icon: '🎯', name: 'Quick Quiz', description: 'Kahoot-style questions' },
    { type: 'millionaire', icon: '💰', name: 'Millionaire', description: '15 questions to the top' },
    { type: 'beat-the-chaser', icon: '⚡', name: 'Beat the Chaser', description: 'Race against time' },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider
          transition-colors border bg-indigo-600 border-indigo-500 hover:bg-indigo-500
          text-white shadow-lg shadow-indigo-500/30 flex items-center gap-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span>🎮</span> Game Mode
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800
          rounded-xl shadow-xl border border-slate-200 dark:border-slate-700
          overflow-hidden z-[100] animate-fade-in">

          {/* Header */}
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Select Game
            </span>
          </div>

          {/* Game options */}
          {games.map(game => (
            <button
              key={game.type}
              onClick={() => {
                onSelectGame(game.type);
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left flex items-center gap-3
                hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
            >
              <span className="text-2xl">{game.icon}</span>
              <div className="min-w-0">
                <span className="font-bold text-slate-700 dark:text-slate-200 block">
                  {game.name}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {game.description}
                </span>
              </div>
              <svg
                className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500
                  dark:group-hover:text-amber-400 transition-colors shrink-0 ml-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameMenu;
