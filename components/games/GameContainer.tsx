import React from 'react';
import { GameState, assertNever } from '../../types';
import GameSplash from './shared/GameSplash';
import QuickQuizGame from './QuickQuizGame';
import MillionaireGame from './MillionaireGame';
import TheChaseGame from './TheChaseGame';
import BeatTheChaserGame from './BeatTheChaserGame';

interface GameContainerProps {
  state: GameState;
  onClose: () => void;
  onRevealAnswer: () => void;
  onNextQuestion: () => void;
  onRestart?: () => void;
  // Millionaire-specific handlers
  onMillionaireSelectOption?: (idx: number) => void;
  onMillionaireLockIn?: () => void;
  onMillionaireNext?: () => void;
  onMillionaireUseLifeline?: (lifeline: 'fiftyFifty' | 'askTheAudience' | 'phoneAFriend') => void;
  isLifelineLoading?: 'phoneAFriend' | null;
}

/**
 * Routes to the correct game component based on the discriminated union gameType.
 * Uses exhaustive switch to ensure all game types are handled.
 */
const GameContainer: React.FC<GameContainerProps> = ({
  state,
  onClose,
  onRevealAnswer,
  onNextQuestion,
  onRestart,
  onMillionaireSelectOption,
  onMillionaireLockIn,
  onMillionaireNext,
  onMillionaireUseLifeline,
  isLifelineLoading,
}) => {
  // Show splash screen during loading
  if (state.status === 'loading' || state.status === 'splash') {
    return (
      <div className="h-full w-full">
        <GameSplash
          gameType={state.gameType}
          onContinue={state.status === 'splash' ? undefined : undefined}
        />
        {state.status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-8 border-white/20 rounded-full"></div>
                <div className="absolute inset-0 border-8 border-t-white border-l-transparent border-r-transparent border-b-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-xl text-white font-bold animate-pulse">Generating Questions...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Route to correct game component based on gameType discriminant
  switch (state.gameType) {
    case 'quick-quiz':
      return (
        <QuickQuizGame
          state={state}
          onRevealAnswer={onRevealAnswer}
          onNextQuestion={onNextQuestion}
          onClose={onClose}
          onRestart={onRestart}
        />
      );

    case 'millionaire':
      return (
        <MillionaireGame
          state={state}
          onClose={onClose}
          onSelectOption={onMillionaireSelectOption}
          onLockIn={onMillionaireLockIn}
          onNextQuestion={onMillionaireNext}
          onRestart={onRestart}
          onUseLifeline={onMillionaireUseLifeline}
          isLifelineLoading={isLifelineLoading}
        />
      );

    case 'the-chase':
      return (
        <TheChaseGame
          state={state}
          onClose={onClose}
        />
      );

    case 'beat-the-chaser':
      return (
        <BeatTheChaserGame
          state={state}
          onClose={onClose}
        />
      );
  }
};

export default GameContainer;
