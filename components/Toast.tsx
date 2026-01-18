import React, { useEffect, useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ToastData {
  id: string;
  message: string;
  duration: number;
}

// ============================================================================
// useToast Hook
// ============================================================================

/**
 * Hook for managing toast notifications.
 * Returns state and functions to add/remove toasts.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, duration: number = 3000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ============================================================================
// Toast Component
// ============================================================================

interface ToastProps {
  message: string;
  duration: number;
  onDismiss: () => void;
}

/**
 * Single toast notification that auto-dismisses after duration.
 * Styled for reconnection feedback (green success color).
 */
export const Toast: React.FC<ToastProps> = ({ message, duration, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in on mount
    const fadeInTimer = setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss after duration
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      // Wait for fade out animation before removing
      setTimeout(onDismiss, 200);
    }, duration);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(dismissTimer);
    };
  }, [duration, onDismiss]);

  return (
    <div
      className={`
        bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg
        transition-opacity duration-200
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {message}
    </div>
  );
};

// ============================================================================
// ToastContainer Component
// ============================================================================

interface ToastContainerProps {
  toasts: ToastData[];
  removeToast: (id: string) => void;
}

/**
 * Container component that renders all active toasts.
 * Fixed position at bottom-right of viewport.
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          duration={toast.duration}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default Toast;
