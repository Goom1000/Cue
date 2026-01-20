import React, { useState, useEffect } from 'react';
import { Slide, PresentationMessage, BROADCAST_CHANNEL_NAME, GameSyncState } from '../types';
import useBroadcastSync from '../hooks/useBroadcastSync';
import { SlideContentRenderer } from './SlideRenderers';
import StudentGameView from './StudentGameView';

/**
 * Standalone student view component.
 * Receives state updates via BroadcastChannel from teacher view.
 * Shows ONLY slide content - no controls, no teleprompter.
 */
const StudentView: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleBullets, setVisibleBullets] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameSyncState | null>(null);

  const { lastMessage, postMessage } = useBroadcastSync<PresentationMessage>(BROADCAST_CHANNEL_NAME);

  // Request current state on mount
  useEffect(() => {
    postMessage({ type: 'STATE_REQUEST' });
  }, [postMessage]);

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'STATE_UPDATE') {
      setCurrentIndex(lastMessage.payload.currentIndex);
      setVisibleBullets(lastMessage.payload.visibleBullets);
      setSlides(lastMessage.payload.slides);
      setConnected(true);
    }

    // Handle game state updates
    if (lastMessage.type === 'GAME_STATE_UPDATE') {
      setGameState(lastMessage.payload);
    }

    // Handle game close
    if (lastMessage.type === 'GAME_CLOSE') {
      setGameState(null);
    }

    // Respond to heartbeat from teacher view
    if (lastMessage.type === 'HEARTBEAT') {
      postMessage({ type: 'HEARTBEAT_ACK', timestamp: lastMessage.timestamp });
    }

    // Handle remote close command from teacher
    if (lastMessage.type === 'CLOSE_STUDENT') {
      window.close();
    }
  }, [lastMessage, postMessage]);

  const currentSlide = slides[currentIndex];

  // Waiting for connection
  if (!connected || !currentSlide) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-white text-2xl font-semibold mb-2">Waiting for Presentation</h2>
          <p className="text-white/60">Open the teacher view to begin</p>
        </div>
      </div>
    );
  }

  // Game mode - show game display instead of slide
  if (gameState) {
    return <StudentGameView gameState={gameState} />;
  }

  // Normal slide mode - render slide content only
  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="w-full h-full max-w-[1920px] max-h-[1080px] aspect-video bg-white">
        <SlideContentRenderer slide={currentSlide} visibleBullets={visibleBullets} />
      </div>
    </div>
  );
};

export default StudentView;
