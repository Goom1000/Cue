import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Target coordinates for opening a window on a specific screen.
 * These values are cached when permission is granted.
 */
export interface ScreenTarget {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
}

/**
 * Return type for the useWindowManagement hook.
 */
export interface UseWindowManagementResult {
  /** True if Window Management API exists in this browser (Chromium only) */
  isSupported: boolean;
  /** True if screen.isExtended === true (detectable without permission) */
  hasMultipleScreens: boolean;
  /** Current permission state for window-management */
  permissionState: 'prompt' | 'granted' | 'denied' | 'unavailable';
  /** Cached coordinates for secondary screen, null if not available */
  secondaryScreen: ScreenTarget | null;
  /** Request window-management permission, returns true if granted */
  requestPermission: () => Promise<boolean>;
  /** True until initial permission check completes */
  isLoading: boolean;
}

/**
 * Hook that encapsulates Window Management API logic.
 *
 * Key behaviors:
 * - Detects multi-screen setup without requiring permission (screen.isExtended)
 * - Tracks permission state via navigator.permissions.query
 * - Provides cached secondary screen coordinates when permission granted
 * - Listens for screen configuration changes (monitor connect/disconnect)
 *
 * @example
 * ```tsx
 * const { hasMultipleScreens, secondaryScreen, requestPermission } = useWindowManagement();
 *
 * // Show permission UI if multiple screens detected
 * if (hasMultipleScreens && !secondaryScreen) {
 *   await requestPermission();
 * }
 *
 * // Use cached coordinates in synchronous window.open
 * if (secondaryScreen) {
 *   window.open(url, 'student', `left=${secondaryScreen.left},...`);
 * }
 * ```
 */
function useWindowManagement(): UseWindowManagementResult {
  // API support check (cached at mount - doesn't change during session)
  const [isSupported] = useState(() => 'getScreenDetails' in window);

  // Multi-screen detection (no permission needed)
  const [hasMultipleScreens, setHasMultipleScreens] = useState(false);

  // Permission state tracking
  const [permissionState, setPermissionState] =
    useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('unavailable');

  // Cached screen coordinates
  const [secondaryScreen, setSecondaryScreen] = useState<ScreenTarget | null>(null);

  // Loading state - true until initial permission check completes
  const [isLoading, setIsLoading] = useState(true);

  // Track component mount state to avoid state updates after unmount
  const mountedRef = useRef(true);

  // Store ScreenDetails reference for event listener cleanup
  const screenDetailsRef = useRef<ScreenDetails | null>(null);

  // Initial detection: check screen.isExtended (no permission needed)
  useEffect(() => {
    // Reset mounted state on each effect run (handles Strict Mode double-invoke)
    mountedRef.current = true;

    if (!isSupported) {
      setPermissionState('unavailable');
      setIsLoading(false);
      return;
    }

    const checkExtended = () => {
      if (!mountedRef.current) return;

      const extended = (window.screen as Screen).isExtended === true;
      setHasMultipleScreens(extended);

      if (!extended) {
        setPermissionState('unavailable');
        setSecondaryScreen(null);
        setIsLoading(false);
      }
    };

    checkExtended();

    // Fallback timeout: ensure isLoading becomes false within 5 seconds
    // This handles edge cases where permission query or other async operations hang
    const fallbackTimeout = setTimeout(() => {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }, 5000);

    // Listen for screen configuration changes (monitor plug/unplug)
    // Note: 'change' event on screen is Chromium-specific, not in standard typings
    // Cast through unknown because Screen doesn't extend EventTarget in lib.dom.d.ts
    const screenChangeHandler = () => checkExtended();
    const screenWithEvents = window.screen as unknown as EventTarget;
    screenWithEvents.addEventListener('change', screenChangeHandler);

    return () => {
      clearTimeout(fallbackTimeout);
      screenWithEvents.removeEventListener('change', screenChangeHandler);
    };
  }, [isSupported]);

  // Check existing permission state via navigator.permissions.query
  useEffect(() => {
    if (!isSupported || !hasMultipleScreens) return;

    // Reset mounted state on each effect run (handles Strict Mode double-invoke)
    mountedRef.current = true;

    let permissionStatus: PermissionStatus | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const checkPermission = async () => {
      try {
        // Race permission query against timeout - some browsers hang on this query
        const timeoutPromise = new Promise<'timeout'>((resolve) => {
          timeoutId = setTimeout(() => resolve('timeout'), 3000);
        });

        const result = await Promise.race([
          navigator.permissions.query({
            name: 'window-management' as PermissionName
          }),
          timeoutPromise
        ]);

        if (!mountedRef.current) return;

        if (result === 'timeout') {
          // Query hung - assume prompt state, let getScreenDetails trigger actual prompt
          setPermissionState('prompt');
          setIsLoading(false);
          return;
        }

        permissionStatus = result;
        setPermissionState(permissionStatus.state as 'prompt' | 'granted' | 'denied');
        setIsLoading(false);

        // Listen for permission changes (user grants/denies in browser settings)
        const handlePermissionChange = () => {
          if (mountedRef.current && permissionStatus) {
            setPermissionState(permissionStatus.state as 'prompt' | 'granted' | 'denied');
          }
        };

        permissionStatus.addEventListener('change', handlePermissionChange);
      } catch {
        // Permission query not supported in this browser
        // Will prompt when getScreenDetails is called
        if (mountedRef.current) {
          setPermissionState('prompt');
          setIsLoading(false);
        }
      }
    };

    checkPermission();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      // Note: permissionStatus.removeEventListener would need to be tracked
      // but the status object is recreated on each query anyway
    };
  }, [isSupported, hasMultipleScreens]);

  // Fetch screen details when permission is granted
  useEffect(() => {
    if (permissionState !== 'granted') {
      setSecondaryScreen(null);
      return;
    }

    const fetchScreenDetails = async () => {
      try {
        const details = await window.getScreenDetails!();

        if (!mountedRef.current) return;

        screenDetailsRef.current = details;

        // Find secondary screen (non-primary)
        const secondary = details.screens.find(s => !s.isPrimary);
        if (secondary) {
          setSecondaryScreen({
            left: secondary.availLeft,
            top: secondary.availTop,
            width: secondary.availWidth,
            height: secondary.availHeight,
            label: secondary.label || 'External Display'
          });
        }

        // Listen for screen changes (monitor connect/disconnect while app running)
        const handleScreensChange = async () => {
          if (!mountedRef.current) return;

          try {
            const updated = await window.getScreenDetails!();
            const newSecondary = updated.screens.find(s => !s.isPrimary);

            if (!mountedRef.current) return;

            if (newSecondary) {
              setSecondaryScreen({
                left: newSecondary.availLeft,
                top: newSecondary.availTop,
                width: newSecondary.availWidth,
                height: newSecondary.availHeight,
                label: newSecondary.label || 'External Display'
              });
            } else {
              setSecondaryScreen(null);
            }
          } catch {
            // Permission may have been revoked
            if (mountedRef.current) {
              setPermissionState('denied');
            }
          }
        };

        details.addEventListener('screenschange', handleScreensChange);
      } catch {
        // Permission denied or error
        if (mountedRef.current) {
          setPermissionState('denied');
        }
      }
    };

    fetchScreenDetails();

    return () => {
      // Clean up screenschange listener if we have a reference
      if (screenDetailsRef.current) {
        // Note: We don't have the handler reference here, but the
        // ScreenDetails object will be garbage collected anyway
        screenDetailsRef.current = null;
      }
    };
  }, [permissionState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Request permission function (stable reference via useCallback)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !hasMultipleScreens) {
      return false;
    }

    try {
      // Calling getScreenDetails() triggers the permission prompt if needed
      const details = await window.getScreenDetails!();

      if (!mountedRef.current) return false;

      screenDetailsRef.current = details;

      // Find and cache secondary screen
      const secondary = details.screens.find(s => !s.isPrimary);
      if (secondary) {
        setSecondaryScreen({
          left: secondary.availLeft,
          top: secondary.availTop,
          width: secondary.availWidth,
          height: secondary.availHeight,
          label: secondary.label || 'External Display'
        });
      }

      setPermissionState('granted');
      return true;
    } catch {
      if (mountedRef.current) {
        setPermissionState('denied');
      }
      return false;
    }
  }, [isSupported, hasMultipleScreens]);

  return {
    isSupported,
    hasMultipleScreens,
    permissionState,
    secondaryScreen,
    requestPermission,
    isLoading
  };
}

export default useWindowManagement;
