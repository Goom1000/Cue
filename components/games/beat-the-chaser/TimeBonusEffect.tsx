import React, { useEffect, useState } from 'react';

interface TimeBonusEffectProps {
  show: boolean;
  amount: number;  // Typically 5
  onComplete?: () => void;
}

const TimeBonusEffect: React.FC<TimeBonusEffectProps> = ({
  show,
  amount,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Animation duration: 1200ms
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div
        className="text-7xl md:text-9xl font-black text-green-400 drop-shadow-2xl"
        style={{
          animation: 'floatUp 1.2s ease-out forwards',
          textShadow: '0 0 40px rgba(74, 222, 128, 0.8)'
        }}
      >
        +{amount}s
      </div>

      {/* Inline keyframes - CSS-in-JS for portability */}
      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          20% {
            opacity: 1;
            transform: translateY(-10px) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translateY(-80px) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default TimeBonusEffect;
