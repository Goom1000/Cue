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
export const CHASER_THINKING_DELAY = 1000;    // 1 second thinking delay (faster than Chase)

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
