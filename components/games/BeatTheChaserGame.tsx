import React, { useState, useCallback, useEffect } from 'react';
import { BeatTheChaserState, BeatTheChaserPhase } from '../../types';
import TimedBattlePhase from './beat-the-chaser/TimedBattlePhase';
import GameResult from './beat-the-chaser/GameResult';
import { BeatTheChaserDifficulty } from './beat-the-chaser/beatTheChaserConfig';

interface BeatTheChaserGameProps {
  state: BeatTheChaserState;
  onClose: () => void;
  onStateUpdate?: (updates: Partial<BeatTheChaserState>) => void;
}

/**
 * Main orchestrator for Beat the Chaser game.
 * Simplified flow: Timed Battle -> Game Over (no Cash Builder)
 * Broadcasts state updates to student view via onStateUpdate callback.
 */
const BeatTheChaserGame: React.FC<BeatTheChaserGameProps> = ({
  state,
  onClose,
  onStateUpdate
}) => {
  // Local phase state - initialize from state.phase
  const [localPhase, setLocalPhase] = useState<BeatTheChaserPhase>(state.phase);
  const [winner, setWinner] = useState<'contestant' | 'chaser' | null>(null);
  const [finalContestantTime, setFinalContestantTime] = useState(0);
  const [finalChaserTime, setFinalChaserTime] = useState(0);

  // Sync local phase with state phase when state changes
  useEffect(() => {
    setLocalPhase(state.phase);
  }, [state.phase]);

  // Update state and broadcast
  const updateState = useCallback((updates: Partial<BeatTheChaserState>) => {
    onStateUpdate?.(updates);
  }, [onStateUpdate]);

  // Timed Battle complete -> Game Over
  const handleTimedBattleComplete = useCallback((gameWinner: 'contestant' | 'chaser') => {
    setWinner(gameWinner);
    setLocalPhase('game-over');

    updateState({
      phase: 'game-over',
      winner: gameWinner
    });
  }, [updateState]);

  // Handle timed battle state updates (for timer syncing)
  const handleTimedBattleStateUpdate = useCallback((battleState: {
    contestantTime: number;
    chaserTime: number;
    activePlayer: 'contestant' | 'chaser';
  }) => {
    setFinalContestantTime(battleState.contestantTime);
    setFinalChaserTime(battleState.chaserTime);

    updateState({
      contestantTime: battleState.contestantTime,
      chaserTime: battleState.chaserTime,
      activePlayer: battleState.activePlayer
    });
  }, [updateState]);

  // Show loading screen while questions are being generated OR times aren't set
  // This prevents the game from starting with 0 seconds
  const isLoading = state.status === 'loading' ||
                    state.questions.length === 0 ||
                    state.contestantTime <= 0 ||
                    state.chaserTime <= 0;

  if (isLoading) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-950 via-slate-900 to-red-950 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">⚡</div>
          <h2 className="text-3xl font-black text-white mb-4">Beat the Chaser</h2>
          <div className="flex items-center gap-3 text-emerald-400">
            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg font-bold">Generating questions...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render based on phase
  switch (localPhase) {
    case 'setup':
    case 'cash-builder':
    case 'timed-battle':
      // All these phases now go straight to timed battle
      return (
        <TimedBattlePhase
          contestantStartTime={state.contestantTime}
          chaserStartTime={state.chaserTime}
          difficulty={state.chaserDifficulty as BeatTheChaserDifficulty}
          isAIControlled={state.isAIControlled}
          questions={state.questions}
          onComplete={handleTimedBattleComplete}
          onExit={onClose}
          onStateUpdate={handleTimedBattleStateUpdate}
        />
      );

    case 'game-over':
      return (
        <GameResult
          winner={winner!}
          contestantFinalTime={finalContestantTime}
          chaserFinalTime={finalChaserTime}
          onClose={onClose}
        />
      );

    default:
      // Fallback
      return (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-bold text-red-500 mb-4">Unknown game phase</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:scale-105 transition-transform"
            >
              Exit Game
            </button>
          </div>
        </div>
      );
  }
};

export default BeatTheChaserGame;
