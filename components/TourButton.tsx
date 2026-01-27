import React from 'react';

interface TourButtonProps {
  onStart: () => void;
  className?: string;
}

export function TourButton({ onStart, className = '' }: TourButtonProps) {
  return (
    <button
      onClick={onStart}
      className={`w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-amber-500/20 hover:text-indigo-600 dark:hover:text-amber-400 flex items-center justify-center text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-amber-500 ${className}`}
      aria-label="Start tour"
      title="Take a tour"
    >
      ?
    </button>
  );
}
