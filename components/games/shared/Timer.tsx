import React from 'react';
import { useTimer } from '../../../hooks/useTimer';

interface TimerProps {
  initialSeconds: number;
  onComplete?: () => void;
  onTick?: (remaining: number) => void;
  autoStart?: boolean;
  size?: 'small' | 'large';
  urgencyThreshold?: number;  // Seconds at which color changes (default 10)
  className?: string;
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
 * Visual countdown timer component for The Chase game.
 *
 * Features:
 * - Displays time in large, bold format (M:SS)
 * - Normal state: white text
 * - Urgency state (<=10s default): red text with pulsing animation
 * - Size variants: small (inline) or large (prominent)
 * - Can use internal timer or external control
 *
 * Used in:
 * - Cash Builder round (60 seconds)
 * - Final Chase contestant round (2 minutes)
 * - Final Chase chaser round (2 minutes)
 */
const Timer: React.FC<TimerProps> = ({
  initialSeconds,
  onComplete,
  onTick,
  autoStart = false,
  size = 'large',
  urgencyThreshold = 10,
  className = '',
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

  return (
    <div
      className={`
        font-mono font-bold text-center
        ${size === 'large' ? 'text-6xl' : 'text-2xl'}
        ${isUrgent
          ? 'text-red-500 animate-pulse'
          : 'text-white'}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {formattedTime}
    </div>
  );
};

export default Timer;

// Re-export useTimer for convenience
export { useTimer } from '../../../hooks/useTimer';
