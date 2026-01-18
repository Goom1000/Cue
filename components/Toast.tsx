import React, { useEffect, useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  message: string;
  duration: number;
  variant?: ToastVariant;
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

  const addToast = useCallback((message: string, duration: number = 3000, variant?: ToastVariant) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, duration, variant }]);
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
  variant?: ToastVariant;
}

/**
 * Map variant to Tailwind classes for background and text color.
 * - success: green (default, backward compatible)
 * - error: red
 * - warning: amber with dark text for visibility
 * - info: neutral slate
 */
function getVariantClasses(variant?: ToastVariant): string {
  if (!variant) return 'bg-green-600 text-white';
  switch (variant) {
    case 'success':
      return 'bg-green-600 text-white';
    case 'error':
      return 'bg-red-600 text-white';
    case 'warning':
      return 'bg-amber-500 text-slate-900';
    case 'info':
      return 'bg-slate-700 text-white';
    default:
      return 'bg-green-600 text-white';
  }
}

/**
 * Single toast notification that auto-dismisses after duration.
 * Supports success (green), error (red), warning (amber), and info (gray) variants.
 */
export const Toast: React.FC<ToastProps> = ({ message, duration, onDismiss, variant }) => {
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
        ${getVariantClasses(variant)} px-4 py-2 rounded-lg shadow-lg
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
          variant={toast.variant}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default Toast;
