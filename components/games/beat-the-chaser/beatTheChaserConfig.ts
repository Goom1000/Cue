export type BeatTheChaserDifficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  timeRatio: number;              // Chaser time as fraction of contestant time
  aiAccuracyRange: [number, number];  // Min/max accuracy percentage
  label: string;                  // Display label
  description: string;            // Help text
}

export const BEAT_THE_CHASER_DIFFICULTY: Record<BeatTheChaserDifficulty, DifficultyConfig> = {
  easy: {
    timeRatio: 0.80,              // Chaser gets 80% of contestant's time
    aiAccuracyRange: [0.50, 0.60], // 50-60% accuracy
    label: 'Easy',
    description: 'Chaser has less time and makes more mistakes'
  },
  medium: {
    timeRatio: 1.00,              // Equal time
    aiAccuracyRange: [0.70, 0.80], // 70-80% accuracy
    label: 'Medium',
    description: 'Fair fight - equal time for both players'
  },
  hard: {
    timeRatio: 1.20,              // Chaser gets 120% of contestant's time
    aiAccuracyRange: [0.85, 0.95], // 85-95% accuracy
    label: 'Hard',
    description: 'Chaser has more time and rarely makes mistakes'
  }
};

// Game constants
export const CASH_BUILDER_QUESTIONS = 10;     // Number of questions in Cash Builder
export const TIME_PER_CORRECT = 5;            // Seconds added per correct answer
export const MAX_CONTESTANT_TIME = 60;        // Cap to prevent runaway accumulation
export const TIME_BONUS_AMOUNT = 5;           // Seconds added for catch-up mechanic

// Chaser thinking time by difficulty (in ms)
// Longer thinking = more time drains from chaser's clock = fairer for students
export const CHASER_THINKING_TIME: Record<BeatTheChaserDifficulty, { min: number; max: number }> = {
  easy: { min: 4000, max: 7000 },    // 4-7 seconds - slow, gives students big advantage
  medium: { min: 3000, max: 5000 },  // 3-5 seconds - moderate pace
  hard: { min: 2000, max: 4000 }     // 2-4 seconds - faster but still fair
};

// Helper to get random thinking time for given difficulty
export function getChaserThinkingTime(difficulty: BeatTheChaserDifficulty): number {
  const { min, max } = CHASER_THINKING_TIME[difficulty];
  return min + Math.random() * (max - min);
}

// Legacy constant for backward compatibility
export const CHASER_THINKING_DELAY = 3000;    // Default 3 seconds (use getChaserThinkingTime for dynamic)

// Helper function to calculate chaser starting time
export function calculateChaserTime(contestantTime: number, difficulty: BeatTheChaserDifficulty): number {
  const config = BEAT_THE_CHASER_DIFFICULTY[difficulty];
  return Math.floor(contestantTime * config.timeRatio);
}

// Helper function to get random AI accuracy within range
export function getChaserAccuracy(difficulty: BeatTheChaserDifficulty): number {
  const config = BEAT_THE_CHASER_DIFFICULTY[difficulty];
  const [min, max] = config.aiAccuracyRange;
  return min + Math.random() * (max - min);
}
