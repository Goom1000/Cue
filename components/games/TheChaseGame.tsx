import React, { useState, useCallback } from 'react';
import { TheChaseState, ChaseOffer } from '../../types';
import CashBuilderRound from './the-chase/CashBuilderRound';
import OfferSelection from './the-chase/OfferSelection';
import HeadToHeadRound from './the-chase/HeadToHeadRound';
import FinalChaseRound from './the-chase/FinalChaseRound';
import GameOutcome from './the-chase/GameOutcome';

interface TheChaseGameProps {
  state: TheChaseState;
  onClose: () => void;
  onStateUpdate?: (updates: Partial<TheChaseState>) => void;
}

/**
 * Main orchestrator for The Chase game.
 * Manages phase transitions: Cash Builder -> Offer Selection -> Head-to-Head -> Final Chase
 * Broadcasts state updates to student view via onStateUpdate callback.
 */
const TheChaseGame: React.FC<TheChaseGameProps> = ({ state, onClose, onStateUpdate }) => {
  // Local state for phase management (teacher-side only)
  const [localPhase, setLocalPhase] = useState(state.phase);
  const [localState, setLocalState] = useState<Partial<TheChaseState>>({});

  // Update both local and global state
  const updateState = useCallback((updates: Partial<TheChaseState>) => {
    setLocalState(prev => ({ ...prev, ...updates }));
    onStateUpdate?.(updates);
  }, [onStateUpdate]);

  // Cash Builder completion handler
  const handleCashBuilderComplete = useCallback((score: number) => {
    const updates: Partial<TheChaseState> = {
      phase: 'offer-selection',
      cashBuilderScore: score
    };
    setLocalPhase('offer-selection');
    updateState(updates);
  }, [updateState]);

  // Offer Selection completion handler
  const handleOfferSelected = useCallback((offer: ChaseOffer, startPosition: number) => {
    const updates: Partial<TheChaseState> = {
      phase: 'head-to-head',
      contestantPosition: startPosition,
      chaserPosition: 0,
      selectedOfferIndex: state.offers.findIndex(o => o.amount === offer.amount),
      isVotingOpen: false
    };
    setLocalPhase('head-to-head');
    updateState(updates);
  }, [state.offers, updateState]);

  // Head-to-Head completion handler
  const handleHeadToHeadComplete = useCallback((result: 'caught' | 'home-safe') => {
    if (result === 'caught') {
      // Game over - contestant lost
      const updates: Partial<TheChaseState> = {
        phase: 'game-over'
      };
      setLocalPhase('game-over');
      updateState(updates);
    } else {
      // Home safe - proceed to Final Chase
      const updates: Partial<TheChaseState> = {
        phase: 'final-chase-contestant',
        finalChaseContestantScore: 0,
        finalChaseChaserScore: 0,
        chaserTargetScore: 0
      };
      setLocalPhase('final-chase-contestant');
      updateState(updates);
    }
  }, [updateState]);

  // Final Chase completion handler
  const handleFinalChaseComplete = useCallback((
    outcome: 'win' | 'loss',
    contestantScore: number,
    chaserScore: number
  ) => {
    const updates: Partial<TheChaseState> = {
      phase: 'game-over',
      finalChaseContestantScore: contestantScore,
      finalChaseChaserScore: chaserScore
    };
    setLocalPhase('game-over');
    updateState(updates);
  }, [updateState]);

  // Merge local state with global state for rendering
  const currentState = { ...state, ...localState };
  const currentPhase = localPhase;

  // Render appropriate phase component
  switch (currentPhase) {
    case 'cash-builder':
      return (
        <CashBuilderRound
          questions={currentState.questions}
          onComplete={handleCashBuilderComplete}
          onExit={onClose}
        />
      );

    case 'offer-selection':
      return (
        <OfferSelection
          cashBuilderScore={currentState.cashBuilderScore}
          onOfferSelected={handleOfferSelected}
          onExit={onClose}
        />
      );

    case 'head-to-head':
      return (
        <HeadToHeadRound
          questions={currentState.questions}
          startingPosition={currentState.contestantPosition}
          chaserDifficulty={currentState.chaserDifficulty}
          onComplete={handleHeadToHeadComplete}
          onExit={onClose}
        />
      );

    case 'final-chase-contestant':
    case 'final-chase-chaser':
      // FinalChaseRound handles both contestant and chaser phases internally
      return (
        <FinalChaseRound
          questions={currentState.questions}
          contestantTargetScore={currentState.finalChaseContestantScore}
          chaserDifficulty={currentState.chaserDifficulty}
          isAIControlled={currentState.isAIControlled}
          prizeAmount={currentState.cashBuilderScore}
          onComplete={handleFinalChaseComplete}
          onExit={onClose}
        />
      );

    case 'game-over':
      // Determine final outcome based on final chase scores
      const wonFinalChase = currentState.finalChaseContestantScore > currentState.finalChaseChaserScore;
      const result = wonFinalChase ? 'home-safe' : 'caught';

      return (
        <GameOutcome
          result={result}
          onClose={onClose}
        />
      );

    default:
      // Should never reach here, but return error state
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

export default TheChaseGame;
