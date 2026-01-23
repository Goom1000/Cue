import React from 'react';

interface LifelinePanelProps {
  lifelines: {
    fiftyFifty: boolean;
    phoneAFriend: boolean;
    askTheAudience: boolean;
  };
  onUseLifeline: (lifeline: 'fiftyFifty' | 'askTheAudience' | 'phoneAFriend') => void;
  disabled: boolean;
  isLoading?: 'phoneAFriend' | null;
}

const LifelinePanel: React.FC<LifelinePanelProps> = ({
  lifelines,
  onUseLifeline,
  disabled,
  isLoading,
}) => {
  return (
    <div className="flex justify-center gap-6">
      {/* 50:50 Lifeline */}
      <button
        onClick={() => onUseLifeline('fiftyFifty')}
        disabled={!lifelines.fiftyFifty || disabled}
        className={`
          group relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-300 border-4
          ${lifelines.fiftyFifty && !disabled
            ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-indigo-400 hover:scale-110 hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] cursor-pointer'
            : 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed grayscale'
          }
        `}
        title={lifelines.fiftyFifty ? '50:50 - Remove 2 wrong answers' : '50:50 - Used'}
      >
        <div className="flex gap-1 items-center">
          <div className={`w-4 h-6 border-2 rounded ${lifelines.fiftyFifty ? 'border-white' : 'border-slate-600'}`} />
          <div className={`w-4 h-6 border-2 rounded ${lifelines.fiftyFifty ? 'border-white' : 'border-slate-600'}`} />
        </div>
        {!lifelines.fiftyFifty && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-1 bg-red-500 rotate-45 origin-center" />
          </div>
        )}
      </button>

      {/* Ask the Audience Lifeline */}
      <button
        onClick={() => onUseLifeline('askTheAudience')}
        disabled={!lifelines.askTheAudience || disabled}
        className={`
          group relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-300 border-4
          ${lifelines.askTheAudience && !disabled
            ? 'bg-gradient-to-br from-purple-600 to-pink-700 border-pink-400 hover:scale-110 hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] cursor-pointer'
            : 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed grayscale'
          }
        `}
        title={lifelines.askTheAudience ? 'Ask the Audience - See poll results' : 'Ask the Audience - Used'}
      >
        <svg
          className={`w-10 h-10 ${lifelines.askTheAudience ? 'text-white' : 'text-slate-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
        {!lifelines.askTheAudience && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-1 bg-red-500 rotate-45 origin-center" />
          </div>
        )}
      </button>

      {/* Phone a Friend Lifeline */}
      <button
        onClick={() => onUseLifeline('phoneAFriend')}
        disabled={!lifelines.phoneAFriend || disabled || isLoading === 'phoneAFriend'}
        className={`
          group relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-300 border-4
          ${lifelines.phoneAFriend && !disabled && isLoading !== 'phoneAFriend'
            ? 'bg-gradient-to-br from-green-600 to-emerald-700 border-emerald-400 hover:scale-110 hover:shadow-[0_0_30px_rgba(52,211,153,0.6)] cursor-pointer'
            : 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed grayscale'
          }
          ${isLoading === 'phoneAFriend' ? 'animate-pulse' : ''}
        `}
        title={lifelines.phoneAFriend ? 'Phone a Friend - Get AI hint' : 'Phone a Friend - Used'}
      >
        {isLoading === 'phoneAFriend' ? (
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <svg
              className={`w-10 h-10 ${lifelines.phoneAFriend ? 'text-white' : 'text-slate-600'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            {!lifelines.phoneAFriend && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-1 bg-red-500 rotate-45 origin-center" />
              </div>
            )}
          </>
        )}
      </button>
    </div>
  );
};

export default LifelinePanel;
