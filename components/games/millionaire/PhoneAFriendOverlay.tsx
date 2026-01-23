import React from 'react';

interface PhoneAFriendOverlayProps {
  hint: {
    confidence: 'high' | 'medium' | 'low';
    response: string;
  };
  onClose: () => void;
}

const PhoneAFriendOverlay: React.FC<PhoneAFriendOverlayProps> = ({
  hint,
  onClose,
}) => {
  const confidenceColors = {
    high: {
      bg: 'bg-green-900/50',
      border: 'border-green-500',
      text: 'text-green-400',
      icon: '💪',
      label: 'High Confidence',
    },
    medium: {
      bg: 'bg-yellow-900/50',
      border: 'border-yellow-500',
      text: 'text-yellow-400',
      icon: '🤔',
      label: 'Medium Confidence',
    },
    low: {
      bg: 'bg-red-900/50',
      border: 'border-red-500',
      text: 'text-red-400',
      icon: '😬',
      label: 'Low Confidence',
    },
  };

  const config = confidenceColors[hint.confidence];

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
      <div className="bg-gradient-to-br from-slate-900 via-green-950 to-emerald-900 rounded-3xl p-10 max-w-2xl w-full border-4 border-emerald-400/30 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">📞</div>
          <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-wider">
            Phone a Friend
          </h2>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 ${config.border} ${config.bg}`}>
            <span className="text-2xl">{config.icon}</span>
            <span className={`text-sm font-bold uppercase tracking-wider ${config.text}`}>
              {config.label}
            </span>
          </div>
        </div>

        {/* Response Bubble */}
        <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 border-2 border-white/20">
          {/* Speech bubble tail */}
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-0 h-0
            border-t-8 border-t-transparent
            border-r-8 border-r-white/10
            border-b-8 border-b-transparent"
          />

          <p className="text-2xl text-white leading-relaxed font-sans">
            "{hint.response}"
          </p>
        </div>

        {/* Close Button */}
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xl rounded-xl
              shadow-xl hover:scale-105 transition-all flex items-center gap-3"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            Hang Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhoneAFriendOverlay;
