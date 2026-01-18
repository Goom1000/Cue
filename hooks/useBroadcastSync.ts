import { useEffect, useRef, useState, useCallback } from 'react';

export interface BroadcastSyncOptions {
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
}

/**
 * Generic hook for BroadcastChannel communication.
 * Handles channel lifecycle and cleanup to prevent memory leaks.
 *
 * When enableHeartbeat is true:
 * - Sends HEARTBEAT messages every heartbeatInterval (default 2000ms)
 * - Listens for HEARTBEAT_ACK messages to determine connection status
 * - Sets isConnected = false if no ack received within heartbeatTimeout (default 5000ms)
 * - Only starts connection checks after first ack received (avoids false "disconnected" on startup)
 */
function useBroadcastSync<T extends { type: string }>(
  channelName: string,
  options: BroadcastSyncOptions = {}
) {
  const {
    enableHeartbeat = false,
    heartbeatInterval = 2000,
    heartbeatTimeout = 5000,
  } = options;

  const channelRef = useRef<BroadcastChannel | null>(null);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Track last acknowledgment timestamp
  const lastAckRef = useRef<number>(0);
  // Track whether we've ever received an ack (to avoid showing disconnected before any connection)
  const hasEverConnectedRef = useRef(false);

  useEffect(() => {
    // Create channel on mount
    channelRef.current = new BroadcastChannel(channelName);

    channelRef.current.onmessage = (event: MessageEvent<T>) => {
      const data = event.data;
      setLastMessage(data);

      // Handle heartbeat acknowledgment
      if (enableHeartbeat && data.type === 'HEARTBEAT_ACK') {
        lastAckRef.current = Date.now();
        hasEverConnectedRef.current = true;
        setIsConnected(true);
      }
    };

    // CRITICAL: Close channel on cleanup to prevent memory leaks
    // MDN explicitly warns about this - channels must be closed
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [channelName, enableHeartbeat]);

  // Heartbeat sender interval
  useEffect(() => {
    if (!enableHeartbeat) return;

    const sendHeartbeat = () => {
      channelRef.current?.postMessage({ type: 'HEARTBEAT', timestamp: Date.now() });
    };

    // Send initial heartbeat
    sendHeartbeat();

    const intervalId = setInterval(sendHeartbeat, heartbeatInterval);

    return () => clearInterval(intervalId);
  }, [enableHeartbeat, heartbeatInterval]);

  // Connection status checker interval
  useEffect(() => {
    if (!enableHeartbeat) return;

    const checkConnection = () => {
      // Only check connection status after we've received at least one ack
      // This prevents showing "disconnected" before any connection is established
      if (!hasEverConnectedRef.current) return;

      const timeSinceLastAck = Date.now() - lastAckRef.current;
      if (timeSinceLastAck > heartbeatTimeout) {
        setIsConnected(false);
      }
    };

    const intervalId = setInterval(checkConnection, 1000);

    return () => clearInterval(intervalId);
  }, [enableHeartbeat, heartbeatTimeout]);

  const postMessage = useCallback((message: T) => {
    channelRef.current?.postMessage(message);
  }, []);

  return { lastMessage, postMessage, isConnected };
}

export default useBroadcastSync;
