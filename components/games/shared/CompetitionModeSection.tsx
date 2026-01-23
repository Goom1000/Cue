import React, { useState } from 'react';
import { CompetitionMode, Team } from '../../../types';
import { createTeams } from '../../../utils/teamNameGenerator';

interface CompetitionModeSectionProps {
  value: CompetitionMode;
  onChange: (mode: CompetitionMode) => void;
  defaultExpanded?: boolean;
}

/**
 * Collapsible competition mode configuration section for game setup modals.
 * Supports Individual mode (optional player name) and Team mode (N teams with editable names).
 */
const CompetitionModeSection: React.FC<CompetitionModeSectionProps> = ({
  value,
  onChange,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const isTeamMode = value.mode === 'team';

  // Toggle between individual and team modes
  const handleModeChange = (newMode: 'individual' | 'team') => {
    if (newMode === 'individual') {
      onChange({ mode: 'individual', playerName: '' });
    } else {
      onChange({ mode: 'team', teams: createTeams(2), activeTeamIndex: 0 });
    }
  };

  // Update player name (individual mode)
  const handlePlayerNameChange = (name: string) => {
    if (value.mode === 'individual') {
      onChange({ ...value, playerName: name });
    }
  };

  // Update team count (regenerates all team names)
  const handleTeamCountChange = (count: number) => {
    if (value.mode === 'team') {
      onChange({ ...value, teams: createTeams(count), activeTeamIndex: 0 });
    }
  };

  // Update individual team name
  const handleTeamNameChange = (index: number, name: string) => {
    if (value.mode === 'team') {
      const newTeams = value.teams.map((team, i) =>
        i === index ? { ...team, name } : team
      );
      onChange({ ...value, teams: newTeams });
    }
  };

  // Regenerate all team names (refresh button)
  const handleRegenerateNames = () => {
    if (value.mode === 'team') {
      const newTeams = createTeams(value.teams.length);
      onChange({ ...value, teams: newTeams, activeTeamIndex: 0 });
    }
  };

  return (
    <div className="mb-6">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors"
      >
        <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Competition Mode
        </span>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 p-4 bg-slate-700/30 rounded-xl border border-slate-600/50 animate-fade-in">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => handleModeChange('individual')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${
                !isTeamMode
                  ? 'bg-amber-500 text-amber-950'
                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              }`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('team')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${
                isTeamMode
                  ? 'bg-amber-500 text-amber-950'
                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              }`}
            >
              Teams
            </button>
          </div>

          {/* Individual Mode Content */}
          {!isTeamMode && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Player Name (optional)
              </label>
              <input
                type="text"
                value={value.playerName}
                onChange={(e) => handlePlayerNameChange(e.target.value)}
                placeholder="Player"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          {/* Team Mode Content */}
          {isTeamMode && value.mode === 'team' && (
            <div>
              {/* Team Count */}
              <div className="flex items-center gap-3 mb-4">
                <label className="text-xs text-slate-400">Teams:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTeamCountChange(Math.max(2, value.teams.length - 1))}
                    disabled={value.teams.length <= 2}
                    className="w-8 h-8 rounded-lg bg-slate-600 text-white font-bold hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-lg font-bold text-white">
                    {value.teams.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTeamCountChange(Math.min(10, value.teams.length + 1))}
                    disabled={value.teams.length >= 10}
                    className="w-8 h-8 rounded-lg bg-slate-600 text-white font-bold hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateNames}
                  className="ml-auto px-3 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 rounded-lg transition-colors"
                  title="Generate new team names"
                >
                  Regenerate Names
                </button>
              </div>

              {/* Team Name Inputs */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {value.teams.map((team, index) => (
                  <div key={team.id} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-amber-950 flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => handleTeamNameChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500 mt-3">
                Teams will rotate automatically each question
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompetitionModeSection;
