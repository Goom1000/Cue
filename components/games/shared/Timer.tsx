import React from 'react';
import { useTimer } from '../../../hooks/useTimer';

interface TimerProps {
  initialSeconds: number;
  onComplete?: () => void;
  onTick?: (remaining: number) => void;
  autoStart?: boolean;
  size?: 'small' | 'large' | 'classroom';
  urgencyThreshold?: number;  // Seconds at which color changes (default 10)
  className?: string;
  showScreenGlow?: boolean;  // Enable screen edge glow during urgency (default false)
  // External control (optional) - allows parent to manage timer state
  externalControl?: {
    start: () => void;
    pause: () => void;
    reset: () => void;
    timeRemaining: number;
    isRunning: boolean;
    formattedTime: string;
  };
}

/**
 * Visual countdown timer component for games.
 *
 * Features:
 * - Displays time in large, bold format (M:SS)
 * - Normal state: white text
 * - Urgency state (<=10s default): red text with pulsing animation
 * - Size variants: small (inline), large (prominent), classroom (extra large for visibility)
 * - Optional screen edge glow for classroom urgency visibility
 * - Can use internal timer or external control
 *
 * Used in:
 * - Cash Builder round (60 seconds)
 * - Final Chase contestant round (2 minutes)
 * - Final Chase chaser round (2 minutes)
 * - Student view displays (classroom size)
 */
const Timer: React.FC<TimerProps> = ({
  initialSeconds,
  onComplete,
  onTick,
  autoStart = false,
  size = 'large',
  urgencyThreshold = 10,
  className = '',
  showScreenGlow = false,
  externalControl
}) => {
  // Use external control if provided, otherwise use internal hook
  const internalTimer = useTimer({
    initialSeconds,
    onComplete,
    onTick,
    autoStart
  });

  const timerState = externalControl || internalTimer;
  const { timeRemaining, formattedTime } = timerState;

  // Determine if we're in urgency state
  const isUrgent = timeRemaining <= urgencyThreshold && timeRemaining > 0;

  // Size-specific classes
  const sizeClasses = {
    small: 'text-2xl',
    large: 'text-6xl',
    classroom: 'text-7xl md:text-8xl font-black'
  };

  // Urgency animation depends on size
  const urgencyAnimation = size === 'classroom' ? 'animate-rapid-pulse' : 'animate-pulse';

  return (
    <>
      {/* Optional screen glow overlay for urgency */}
      {showScreenGlow && isUrgent && (
        <div className="fixed inset-0 pointer-events-none z-30 animate-urgency-glow" />
      )}

      <div
        className={`
          font-mono font-bold text-center
          ${sizeClasses[size]}
          ${isUrgent
            ? `text-red-500 ${urgencyAnimation}`
            : 'text-white'}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
      >
        {formattedTime}
      </div>
    </>
  );
};

export default Timer;

// Re-export useTimer for convenience
export { useTimer } from '../../../hooks/useTimer';
