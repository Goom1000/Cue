import React, { useState, useEffect, useRef } from 'react';
import { CompetitionMode } from '../../../types';

interface ScoreDisplayProps {
  competitionMode: CompetitionMode;
}

/**
 * Student-side score display (read-only).
 * Positioned in top-right corner during gameplay.
 * Shows player name (individual) or team scores (team) with active team highlighted.
 * Animates score changes with brief scale + color pulse.
 */
const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ competitionMode }) => {
  const [animatingTeams, setAnimatingTeams] = useState<Set<string>>(new Set());
  const prevScoresRef = useRef<Record<string, number>>({});

  // Detect score changes and trigger animations
  useEffect(() => {
    if (competitionMode.mode !== 'team') return;

    const newAnimating = new Set<string>();
    competitionMode.teams.forEach(team => {
      if (prevScoresRef.current[team.id] !== undefined &&
          prevScoresRef.current[team.id] !== team.score) {
        newAnimating.add(team.id);
      }
      prevScoresRef.current[team.id] = team.score;
    });

    if (newAnimating.size > 0) {
      setAnimatingTeams(newAnimating);
      setTimeout(() => setAnimatingTeams(new Set()), 200);
    }
  }, [competitionMode]);
  if (competitionMode.mode === 'individual') {
    // Individual mode - show player name badge
    const displayName = competitionMode.playerName || 'Player';

    return (
      <div className="fixed top-4 right-4 z-40">
        <div className="px-6 py-3 rounded-2xl bg-slate-900/80 backdrop-blur-sm border-2 border-amber-400 shadow-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider text-center">Playing</div>
          <div className="text-2xl font-bold text-white text-center">{displayName}</div>
        </div>
      </div>
    );
  }

  // Team mode - show all teams with scores
  const { teams, activeTeamIndex } = competitionMode;

  return (
    <div className="fixed top-4 right-4 z-40 flex flex-wrap gap-3 max-w-lg">
      {teams.map((team, index) => {
        const isActive = index === activeTeamIndex;
        const isAnimating = animatingTeams.has(team.id);

        return (
          <div
            key={team.id}
            className={`
              px-4 py-2 rounded-xl bg-slate-900/80 backdrop-blur-sm
              border-2 transition-all duration-300
              ${isActive
                ? 'border-amber-400 ring-4 ring-amber-400/50 scale-110 shadow-lg shadow-amber-400/30'
                : 'border-slate-600'}
            `}
          >
            {/* Team name */}
            <div className={`text-[10px] uppercase tracking-wider ${
              isActive ? 'text-amber-400' : 'text-slate-400'
            }`}>
              {team.name}
            </div>

            {/* Score with animation on change */}
            <div className={`
              text-2xl font-bold transition-all duration-200
              ${isAnimating ? 'scale-125 text-amber-400' : 'scale-100 text-white'}
            `}>
              {team.score}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScoreDisplay;
