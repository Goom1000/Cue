import React from 'react';

interface ChaserThinkingProps {
  isVisible: boolean;
}

const ChaserThinking: React.FC<ChaserThinkingProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-red-900/90 p-8 rounded-2xl text-center shadow-2xl border-4 border-red-600">
        {/* Chaser icon */}
        <div className="text-6xl mb-4 animate-pulse">😈</div>

        {/* Thinking text */}
        <h3 className="text-2xl font-bold text-white mb-2">
          The Chaser is thinking...
        </h3>

        {/* Animated dots */}
        <div className="flex justify-center gap-2">
          <span className="w-3 h-3 bg-red-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }} />
          <span className="w-3 h-3 bg-red-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }} />
          <span className="w-3 h-3 bg-red-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default ChaserThinking;
