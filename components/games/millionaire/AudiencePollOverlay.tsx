import React, { useState, useEffect } from 'react';

interface AudiencePollOverlayProps {
  percentages: [number, number, number, number]; // A, B, C, D
  onClose: () => void;
}

const AudiencePollOverlay: React.FC<AudiencePollOverlayProps> = ({
  percentages,
  onClose,
}) => {
  const [animatedPercentages, setAnimatedPercentages] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const letters = ['A', 'B', 'C', 'D'];

  // Animate bars from 0 to target percentage
  useEffect(() => {
    const duration = 1000; // 1 second
    const steps = 30;
    const stepTime = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setAnimatedPercentages([
        Math.round(percentages[0] * progress),
        Math.round(percentages[1] * progress),
        Math.round(percentages[2] * progress),
        Math.round(percentages[3] * progress),
      ]);

      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedPercentages(percentages);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [percentages]);

  const maxPercentage = Math.max(...percentages);

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
      <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-900 rounded-3xl p-10 max-w-2xl w-full border-4 border-purple-400/30 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-wider">
            Audience Poll
          </h2>
          <p className="text-purple-300 text-lg">
            The audience has voted!
          </p>
        </div>

        {/* Poll Bars */}
        <div className="flex items-end justify-around gap-4 h-64 mb-8">
          {letters.map((letter, idx) => {
            const percentage = animatedPercentages[idx];
            const isHighest = percentages[idx] === maxPercentage;
            const height = `${percentage}%`;

            return (
              <div key={letter} className="flex-1 flex flex-col items-center gap-2">
                {/* Percentage Label */}
                <div className="text-2xl font-black text-white mb-2 h-8">
                  {percentage}%
                </div>

                {/* Bar */}
                <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                  <div
                    className={`
                      w-full rounded-t-xl transition-all duration-300 relative
                      ${isHighest
                        ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.6)]'
                        : 'bg-gradient-to-t from-blue-600 to-blue-400'
                      }
                    `}
                    style={{ height }}
                  >
                    {isHighest && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl animate-bounce">
                        👆
                      </div>
                    )}
                  </div>
                </div>

                {/* Letter Label */}
                <div className={`
                  text-3xl font-black px-4 py-2 rounded-lg
                  ${isHighest
                    ? 'bg-amber-500 text-amber-950'
                    : 'bg-blue-900 text-blue-200'
                  }
                `}>
                  {letter}
                </div>
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-10 py-4 bg-white text-slate-900 font-bold text-xl rounded-xl
              shadow-xl hover:scale-105 transition-transform"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudiencePollOverlay;
