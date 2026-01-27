import React, { useState } from 'react';
import {
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  offset,
  flip,
  shift,
  arrow,
  FloatingPortal,
  FloatingArrow,
} from '@floating-ui/react';

// ============================================================================
// Types
// ============================================================================

interface InfoTooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode; // Optional custom trigger, defaults to (i) button
}

// ============================================================================
// InfoTooltip Component
// ============================================================================

/**
 * Accessible tooltip component using Floating UI.
 *
 * Features:
 * - Hover trigger with 200ms delay (A11Y-01)
 * - Keyboard focus support (A11Y-02)
 * - ARIA tooltip role (A11Y-03)
 * - Visible focus indicator (A11Y-04)
 * - Escape key and click-outside dismiss (A11Y-05)
 * - Z-index 10001 (above tour overlay at z-10000)
 * - Dark mode support with inverted colors
 * - Viewport collision handling with flip and shift
 *
 * Usage:
 * ```tsx
 * <InfoTooltip content="Explains what this feature does">
 *   <CustomTrigger /> // Optional, defaults to (i) button
 * </InfoTooltip>
 * ```
 */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = React.useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(10),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
  });

  // A11Y-02: Keyboard focus trigger
  const focus = useFocus(context);

  // A11Y-01: Hover trigger with 200ms open delay, 0ms close delay
  const hover = useHover(context, {
    delay: { open: 200, close: 0 },
  });

  // A11Y-05: Escape key and click-outside dismiss
  const dismiss = useDismiss(context);

  // A11Y-03: ARIA tooltip role
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  // Default trigger: info icon button
  const trigger = children || (
    <button
      type="button"
      className="
        inline-flex items-center justify-center
        w-5 h-5 rounded-full
        bg-slate-100 dark:bg-slate-700
        text-slate-600 dark:text-slate-300
        text-xs font-semibold
        transition-colors
        hover:bg-slate-200 dark:hover:bg-slate-600
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-indigo-500
        dark:focus-visible:ring-amber-500
        focus-visible:ring-offset-2
        dark:focus-visible:ring-offset-slate-900
      "
      aria-label="More information"
    >
      i
    </button>
  );

  return (
    <>
      {/* Trigger element */}
      <span ref={refs.setReference} {...getReferenceProps()}>
        {trigger}
      </span>

      {/* Tooltip content */}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="
              z-[10001]
              max-w-xs
              px-4 py-3
              rounded-xl
              shadow-xl
              text-sm
              bg-slate-900 text-white
              dark:bg-slate-100 dark:text-slate-900
            "
          >
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="fill-slate-900 dark:fill-slate-100"
            />
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export default InfoTooltip;
