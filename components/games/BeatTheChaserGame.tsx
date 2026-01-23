import React, { useState, useCallback } from 'react';
import { BeatTheChaserState, BeatTheChaserPhase } from '../../types';
import SetupModal from './beat-the-chaser/SetupModal';
import CashBuilderPhase from './beat-the-chaser/CashBuilderPhase';
import TimedBattlePhase from './beat-the-chaser/TimedBattlePhase';
import GameResult from './beat-the-chaser/GameResult';
import {
  BeatTheChaserDifficulty,
  calculateChaserTime,
  CASH_BUILDER_QUESTIONS
} from './beat-the-chaser/beatTheChaserConfig';

interface BeatTheChaserGameProps {
  state: BeatTheChaserState;
  onClose: () => void;
  onStateUpdate?: (updates: Partial<BeatTheChaserState>) => void;
}

/**
 * Main orchestrator for Beat the Chaser game.
 * Manages phase transitions: Setup -> Cash Builder -> Timed Battle -> Game Over
 * Broadcasts state updates to student view via onStateUpdate callback.
 */
const BeatTheChaserGame: React.FC<BeatTheChaserGameProps> = ({
  state,
  onClose,
  onStateUpdate
}) => {
  // Local phase state (teacher-side management)
  const [localPhase, setLocalPhase] = useState<BeatTheChaserPhase>('setup');
  const [difficulty, setDifficulty] = useState<BeatTheChaserDifficulty>('medium');
  const [isAIControlled, setIsAIControlled] = useState(true);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [chaserTime, setChaserTime] = useState(0);
  const [winner, setWinner] = useState<'contestant' | 'chaser' | null>(null);
  const [finalContestantTime, setFinalContestantTime] = useState(0);
  const [finalChaserTime, setFinalChaserTime] = useState(0);

  // Update state and broadcast
  const updateState = useCallback((updates: Partial<BeatTheChaserState>) => {
    onStateUpdate?.(updates);
  }, [onStateUpdate]);

  // Setup complete -> Start Cash Builder
  const handleSetupComplete = useCallback((
    selectedDifficulty: BeatTheChaserDifficulty,
    aiControlled: boolean
  ) => {
    setDifficulty(selectedDifficulty);
    setIsAIControlled(aiControlled);
    setLocalPhase('cash-builder');

    updateState({
      phase: 'cash-builder',
      chaserDifficulty: selectedDifficulty,
      isAIControlled: aiControlled,
      accumulatedTime: 0,
      cashBuilderQuestionsAnswered: 0,
      cashBuilderCorrectAnswers: 0
    });
  }, [updateState]);

  // Cash Builder complete -> Start Timed Battle
  const handleCashBuilderComplete = useCallback((time: number) => {
    setAccumulatedTime(time);
    const calculatedChaserTime = calculateChaserTime(time, difficulty);
    setChaserTime(calculatedChaserTime);
    setLocalPhase('timed-battle');

    updateState({
      phase: 'timed-battle',
      accumulatedTime: time,
      contestantTime: time,
      chaserTime: calculatedChaserTime,
      activePlayer: 'contestant'
    });
  }, [difficulty, updateState]);

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

  // Render based on phase
  switch (localPhase) {
    case 'setup':
      return (
        <SetupModal
          onStart={handleSetupComplete}
          onCancel={onClose}
        />
      );

    case 'cash-builder':
      // Use first CASH_BUILDER_QUESTIONS for Cash Builder
      const cashBuilderQuestions = state.questions.slice(0, CASH_BUILDER_QUESTIONS);
      return (
        <CashBuilderPhase
          questions={cashBuilderQuestions}
          onComplete={handleCashBuilderComplete}
          onExit={onClose}
        />
      );

    case 'timed-battle':
      // Use remaining questions for Timed Battle
      const battleQuestions = state.questions.slice(CASH_BUILDER_QUESTIONS);
      return (
        <TimedBattlePhase
          contestantStartTime={accumulatedTime}
          chaserStartTime={chaserTime}
          difficulty={difficulty}
          isAIControlled={isAIControlled}
          questions={battleQuestions}
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
