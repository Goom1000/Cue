import React, { useState, useRef, useCallback } from 'react';
import { Rnd, RndResizeCallback, RndDragCallback } from 'react-rnd';
import { useViewportBounds } from '../hooks/useViewportBounds';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

interface FloatingWindowProps {
  children: React.ReactNode;
  defaultPosition: Position;
  defaultSize: Size;
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: number | boolean;
  zIndex?: number;
  // Controlled mode props (optional - if provided, component is controlled)
  position?: Position;
  size?: Size;
  onPositionChange?: (pos: Position) => void;
  onSizeChange?: (size: Size) => void;
  // Snap support props (for Plan 02)
  snapEnabled?: boolean;
  onSnapToggle?: () => void;
  // Drag state callbacks
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

// Edge magnetism threshold in pixels
const MAGNET_THRESHOLD = 20;

/**
 * Apply edge magnetism - snap to viewport edges when within threshold
 */
function applyEdgeMagnetism(
  x: number,
  y: number,
  width: number,
  height: number
): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let newX = x;
  let newY = y;

  // Snap to left edge
  if (x < MAGNET_THRESHOLD) {
    newX = 0;
  }
  // Snap to right edge
  if (vw - (x + width) < MAGNET_THRESHOLD) {
    newX = vw - width;
  }
  // Snap to top edge
  if (y < MAGNET_THRESHOLD) {
    newY = 0;
  }
  // Snap to bottom edge
  if (vh - (y + height) < MAGNET_THRESHOLD) {
    newY = vh - height;
  }

  return { x: newX, y: newY };
}

/**
 * Corner handle component that appears on hover
 */
const CornerHandle: React.FC<{ visible: boolean }> = ({ visible }) => (
  <div
    style={{
      width: 12,
      height: 12,
      backgroundColor: 'rgba(99, 102, 241, 0.9)', // Indigo accent
      borderRadius: 2,
      opacity: visible ? 1 : 0,
      transition: 'opacity 150ms ease',
      boxShadow: visible ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
    }}
  />
);

/**
 * Generic floating window component with drag, resize, and viewport constraints.
 *
 * Features:
 * - Drag from anywhere on the window
 * - Resize from corners only (maintains aspect ratio)
 * - Corner handles appear on hover
 * - 80% opacity while dragging
 * - Edge magnetism (snaps near viewport edges)
 * - Auto-repositions when viewport shrinks
 * - High z-index for floating above other UI
 */
const FloatingWindow: React.FC<FloatingWindowProps> = ({
  children,
  defaultPosition,
  defaultSize,
  minWidth = 200,
  minHeight = 150,
  aspectRatio = 16 / 9,
  zIndex = 9999,
  // Controlled mode props
  position: controlledPosition,
  size: controlledSize,
  onPositionChange,
  onSizeChange,
  // Snap support props
  snapEnabled,
  onSnapToggle,
  // Drag state callbacks
  onDragStart,
  onDragEnd,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // Internal state for uncontrolled mode
  const [internalPosition, setInternalPosition] = useState<Position>(defaultPosition);
  const [internalSize, setInternalSize] = useState<Size>(defaultSize);

  // Determine if we're in controlled mode
  const isControlled = controlledPosition !== undefined && controlledSize !== undefined;

  // Use controlled values if provided, otherwise use internal state
  const position = isControlled ? controlledPosition : internalPosition;
  const size = isControlled ? controlledSize : internalSize;

  // Unified state setters that handle both controlled and uncontrolled modes
  const setPosition = useCallback((newPos: Position) => {
    if (isControlled && onPositionChange) {
      onPositionChange(newPos);
    } else {
      setInternalPosition(newPos);
    }
  }, [isControlled, onPositionChange]);

  const setSize = useCallback((newSize: Size) => {
    if (isControlled && onSizeChange) {
      onSizeChange(newSize);
    } else {
      setInternalSize(newSize);
    }
  }, [isControlled, onSizeChange]);

  // Reference to Rnd component for programmatic position updates
  const rndRef = useRef<Rnd | null>(null);

  // Keep element in viewport when browser resizes
  useViewportBounds(position, size, rndRef);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    onDragStart?.();
  }, [onDragStart]);

  // Handle drag stop with edge magnetism
  const handleDragStop: RndDragCallback = useCallback((_e, data) => {
    setIsDragging(false);
    onDragEnd?.();

    // Apply edge magnetism
    const magnetizedPos = applyEdgeMagnetism(data.x, data.y, size.width, size.height);

    // Update position state
    setPosition(magnetizedPos);

    // If magnetism changed position, update the Rnd component
    if (magnetizedPos.x !== data.x || magnetizedPos.y !== data.y) {
      rndRef.current?.updatePosition(magnetizedPos);
    }
  }, [size.width, size.height, onDragEnd, setPosition]);

  // Handle resize stop
  const handleResizeStop: RndResizeCallback = useCallback(
    (_e, _direction, ref, _delta, newPosition) => {
      setSize({
        width: ref.offsetWidth,
        height: ref.offsetHeight,
      });
      setPosition(newPosition);
    },
    [setSize, setPosition]
  );

  // Resize handle components (only show on hover)
  const resizeHandleComponent = {
    topRight: <CornerHandle visible={isHovered} />,
    bottomRight: <CornerHandle visible={isHovered} />,
    bottomLeft: <CornerHandle visible={isHovered} />,
    topLeft: <CornerHandle visible={isHovered} />,
  };

  return (
    <Rnd
      ref={rndRef}
      // Use default for uncontrolled mode, position/size for controlled mode
      default={{
        x: defaultPosition.x,
        y: defaultPosition.y,
        width: defaultSize.width,
        height: defaultSize.height,
      }}
      // Controlled mode: pass position/size directly
      position={isControlled ? position : undefined}
      size={isControlled ? size : undefined}
      minWidth={minWidth}
      minHeight={minHeight}
      lockAspectRatio={aspectRatio}
      bounds="window"
      enableResizing={{
        top: false,
        right: false,
        bottom: false,
        left: false,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      resizeHandleComponent={resizeHandleComponent}
      resizeHandleStyles={{
        topRight: { cursor: 'nesw-resize', right: -6, top: -6 },
        bottomRight: { cursor: 'nwse-resize', right: -6, bottom: -6 },
        bottomLeft: { cursor: 'nesw-resize', left: -6, bottom: -6 },
        topLeft: { cursor: 'nwse-resize', left: -6, top: -6 },
      }}
      onDragStart={handleDragStart}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        cursor: 'move',
        opacity: isDragging ? 0.8 : 1,
        transition: isDragging ? 'none' : 'opacity 150ms ease',
        zIndex,
      }}
      className="rounded-lg border-2 border-indigo-500 overflow-hidden"
    >
      <div className="w-full h-full">{children}</div>
    </Rnd>
  );
};

export default FloatingWindow;
