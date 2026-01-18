import React, { useState, useRef, useCallback } from 'react';
import { Rnd, RndResizeCallback, RndDragCallback } from 'react-rnd';
import { useViewportBounds } from '../hooks/useViewportBounds';

interface Position {
  x: number;
  y: number;
}

interface Size {
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
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState<Position>(defaultPosition);
  const [size, setSize] = useState<Size>(defaultSize);

  // Reference to Rnd component for programmatic position updates
  const rndRef = useRef<Rnd | null>(null);

  // Keep element in viewport when browser resizes
  useViewportBounds(position, size, rndRef);

  // Handle drag stop with edge magnetism
  const handleDragStop: RndDragCallback = useCallback((_e, data) => {
    setIsDragging(false);

    // Apply edge magnetism
    const magnetizedPos = applyEdgeMagnetism(data.x, data.y, size.width, size.height);

    // Update position state
    setPosition(magnetizedPos);

    // If magnetism changed position, update the Rnd component
    if (magnetizedPos.x !== data.x || magnetizedPos.y !== data.y) {
      rndRef.current?.updatePosition(magnetizedPos);
    }
  }, [size.width, size.height]);

  // Handle resize stop
  const handleResizeStop: RndResizeCallback = useCallback(
    (_e, _direction, ref, _delta, newPosition) => {
      setSize({
        width: ref.offsetWidth,
        height: ref.offsetHeight,
      });
      setPosition(newPosition);
    },
    []
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
      default={{
        x: defaultPosition.x,
        y: defaultPosition.y,
        width: defaultSize.width,
        height: defaultSize.height,
      }}
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
      onDragStart={() => setIsDragging(true)}
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
