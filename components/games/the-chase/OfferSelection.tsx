import React, { useState, useEffect } from 'react';
import useBroadcastSync from '../../../hooks/useBroadcastSync';
import { BROADCAST_CHANNEL_NAME, ChaseOffer } from '../../../types';

// Message types for voting
type VoteMessage =
  | { type: 'CHASE_VOTE_START'; offers: ChaseOffer[] }
  | { type: 'CHASE_VOTE_CAST'; studentName: string; offerIndex: number }
  | { type: 'CHASE_VOTE_END'; winningIndex: number };

interface OfferSelectionProps {
  cashBuilderScore: number;
  onOfferSelected: (offer: ChaseOffer, startPosition: number) => void;
  onExit: () => void;
}

const OfferSelection: React.FC<OfferSelectionProps> = ({
  cashBuilderScore,
  onOfferSelected,
  onExit
}) => {
  // Default offers based on Cash Builder score
  const [offers, setOffers] = useState<ChaseOffer[]>([
    { amount: cashBuilderScore * 2, position: 2, label: 'High Offer (+2 steps closer)' },
    { amount: cashBuilderScore, position: 4, label: 'Cash Builder' },
    { amount: Math.floor(cashBuilderScore / 2), position: 5, label: 'Low Offer (-1 step safer)' }
  ]);

  const [votes, setVotes] = useState<Map<string, number>>(new Map());
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { lastMessage, postMessage } = useBroadcastSync<VoteMessage>(BROADCAST_CHANNEL_NAME);

  // Listen for incoming votes
  useEffect(() => {
    if (lastMessage?.type === 'CHASE_VOTE_CAST') {
      setVotes(prev => {
        const next = new Map(prev);
        next.set(lastMessage.studentName, lastMessage.offerIndex);
        return next;
      });
    }
  }, [lastMessage]);

  // Start voting
  const startVoting = () => {
    setVotes(new Map());
    setIsVotingOpen(true);
    postMessage({ type: 'CHASE_VOTE_START', offers });
  };

  // End voting and determine winner
  const endVoting = () => {
    const tallies = [0, 0, 0];
    votes.forEach(idx => tallies[idx]++);

    const winningIndex = tallies.indexOf(Math.max(...tallies));
    setSelectedIndex(winningIndex);
    setIsVotingOpen(false);
    postMessage({ type: 'CHASE_VOTE_END', winningIndex });
  };

  // Confirm selection and proceed
  const confirmSelection = () => {
    if (selectedIndex !== null) {
      const selected = offers[selectedIndex];
      onOfferSelected(selected, selected.position);
    }
  };

  // Update offer amount
  const updateOfferAmount = (index: number, amount: number) => {
    setOffers(prev => prev.map((o, i) =>
      i === index ? { ...o, amount } : o
    ));
  };

  // Update offer position
  const updateOfferPosition = (index: number, position: number) => {
    const labels = ['High Offer', 'Cash Builder', 'Low Offer'];
    const positionDiff = 4 - position; // 4 is middle position
    const label = positionDiff > 0
      ? `${labels[index]} (+${positionDiff} steps closer)`
      : positionDiff < 0
        ? `${labels[index]} (${positionDiff} steps safer)`
        : labels[index];

    setOffers(prev => prev.map((o, i) =>
      i === index ? { ...o, position, label } : o
    ));
  };

  // Count votes per offer
  const getVoteCount = (index: number): number => {
    return Array.from(votes.values()).filter(v => v === index).length;
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black text-amber-400 uppercase tracking-widest mb-2">
          Choose Your Offer
        </h2>
        <p className="text-slate-300">
          Cash Builder: <span className="text-amber-400 font-bold">${cashBuilderScore.toLocaleString()}</span>
        </p>
      </div>

      {/* Three Offers */}
      <div className="flex-1 flex justify-center items-center gap-6 max-w-5xl mx-auto w-full">
        {offers.map((offer, idx) => (
          <div
            key={idx}
            className={`flex-1 p-6 rounded-2xl border-4 transition-all ${
              selectedIndex === idx
                ? 'border-amber-400 bg-amber-900/30 scale-105'
                : 'border-slate-600 bg-slate-800/60 hover:border-slate-500'
            }`}
          >
            {/* Position Badge */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 ${
              idx === 0 ? 'bg-red-600 text-white' :
              idx === 1 ? 'bg-amber-500 text-amber-950' :
              'bg-green-600 text-white'
            }`}>
              {7 - offer.position}
            </div>

            {/* Amount (editable) */}
            <div className="text-center mb-4">
              <label className="text-xs text-slate-400 uppercase">Prize</label>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-2xl text-slate-400">$</span>
                <input
                  type="number"
                  value={offer.amount}
                  onChange={(e) => updateOfferAmount(idx, parseInt(e.target.value) || 0)}
                  className="w-32 text-3xl font-bold text-center bg-transparent border-b-2 border-slate-600 text-white focus:border-amber-400 outline-none"
                  disabled={isVotingOpen}
                />
              </div>
            </div>

            {/* Position (editable) */}
            <div className="text-center mb-4">
              <label className="text-xs text-slate-400 uppercase">Start Position</label>
              <select
                value={offer.position}
                onChange={(e) => updateOfferPosition(idx, parseInt(e.target.value))}
                className="block w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded text-white text-center"
                disabled={isVotingOpen}
              >
                <option value={1}>Step 1 (closest to chaser)</option>
                <option value={2}>Step 2</option>
                <option value={3}>Step 3</option>
                <option value={4}>Step 4 (middle)</option>
                <option value={5}>Step 5</option>
              </select>
            </div>

            {/* Label */}
            <p className="text-center text-slate-400 text-sm">{offer.label}</p>

            {/* Vote Count */}
            {isVotingOpen && (
              <div className="mt-4 text-center">
                <span className="text-4xl font-bold text-white">{getVoteCount(idx)}</span>
                <span className="text-slate-400 ml-2">votes</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-6 flex justify-center gap-4">
        {!isVotingOpen && selectedIndex === null && (
          <button
            onClick={startVoting}
            className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xl rounded-xl transition-colors"
          >
            Start Class Vote
          </button>
        )}

        {isVotingOpen && (
          <button
            onClick={endVoting}
            className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-xl rounded-xl transition-colors"
          >
            End Voting ({votes.size} votes)
          </button>
        )}

        {selectedIndex !== null && (
          <button
            onClick={confirmSelection}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl rounded-xl transition-colors"
          >
            Continue to The Chase →
          </button>
        )}

        <button
          onClick={onExit}
          className="px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
        >
          End Game
        </button>
      </div>
    </div>
  );
};

export default OfferSelection;
