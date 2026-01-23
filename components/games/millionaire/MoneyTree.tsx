import React from 'react';
import { MoneyTreeConfig } from './millionaireConfig';

interface MoneyTreeProps {
  config: MoneyTreeConfig;
  currentQuestionIndex: number;
  answeredCorrectly: boolean[]; // Track which questions were answered
}

const MoneyTree: React.FC<MoneyTreeProps> = ({ config, currentQuestionIndex, answeredCorrectly }) => {
  return (
    <div className="flex flex-col-reverse gap-1 bg-blue-950/80 p-3 rounded-xl border border-blue-400/30">
      {config.prizes.map((prize, idx) => {
        const isCurrent = idx === currentQuestionIndex;
        const isAnswered = idx < currentQuestionIndex;
        const isSafeHaven = config.safeHavens.includes(idx);

        return (
          <div
            key={idx}
            className={`
              flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-bold
              transition-all duration-300
              ${isCurrent ? 'bg-amber-500 text-amber-950 scale-105 shadow-lg shadow-amber-500/50' : ''}
              ${isAnswered ? 'text-green-400' : 'text-white/70'}
              ${isSafeHaven && !isAnswered ? 'text-amber-400 border border-amber-500/50' : ''}
            `}
          >
            <span className="w-6 text-center">{idx + 1}</span>
            <span className={isSafeHaven ? 'font-black' : ''}>
              ${prize.toLocaleString()}
            </span>
            {isAnswered && (
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MoneyTree;
