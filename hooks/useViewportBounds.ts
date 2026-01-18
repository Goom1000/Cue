import { useEffect, useRef, RefObject } from 'react';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface RndRef {
  updatePosition: (pos: Position) => void;
}

/**
 * Hook to keep a floating element within viewport bounds when the browser window resizes.
 *
 * When the viewport shrinks and the element would be outside the visible area,
 * this hook automatically repositions it back into view with a smooth transition.
 *
 * @param position Current position of the element
 * @param size Current size of the element
 * @param rndRef Reference to the react-rnd instance for position updates
 * @param padding Optional padding from viewport edges (default 0)
 */
export function useViewportBounds(
  position: Position,
  size: Size,
  rndRef: RefObject<RndRef | null>,
  padding: number = 0
): void {
  // Track previous position to detect when we need to animate
  const prevPositionRef = useRef<Position>(position);

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let newX = position.x;
      let newY = position.y;
      let needsUpdate = false;

      // Push back if right edge is past viewport
      if (position.x + size.width > vw - padding) {
        newX = Math.max(padding, vw - size.width - padding);
        needsUpdate = true;
      }

      // Push back if left edge is past viewport (element dragged off left side)
      if (position.x < padding) {
        newX = padding;
        needsUpdate = true;
      }

      // Push back if bottom edge is past viewport
      if (position.y + size.height > vh - padding) {
        newY = Math.max(padding, vh - size.height - padding);
        needsUpdate = true;
      }

      // Push back if top edge is past viewport
      if (position.y < padding) {
        newY = padding;
        needsUpdate = true;
      }

      if (needsUpdate && rndRef.current) {
        rndRef.current.updatePosition({ x: newX, y: newY });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position.x, position.y, size.width, size.height, padding, rndRef]);

  // Update previous position ref
  useEffect(() => {
    prevPositionRef.current = position;
  }, [position]);
}

export default useViewportBounds;
