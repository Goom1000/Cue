import { Team } from '../types';

// Kid-friendly adjectives (~20 curated words)
const ADJECTIVES = [
  'Amazing', 'Brilliant', 'Clever', 'Daring', 'Epic',
  'Fearless', 'Gigantic', 'Happy', 'Incredible', 'Jolly',
  'Keen', 'Lively', 'Mighty', 'Noble', 'Outstanding',
  'Powerful', 'Quick', 'Radiant', 'Super', 'Terrific'
];

// Kid-friendly nouns (~20 curated animals/objects)
const NOUNS = [
  'Dragons', 'Eagles', 'Falcons', 'Griffins', 'Hawks',
  'Jaguars', 'Knights', 'Lions', 'Meteors', 'Ninjas',
  'Owls', 'Panthers', 'Phoenixes', 'Rockets', 'Sharks',
  'Tigers', 'Unicorns', 'Vikings', 'Wizards', 'Wolves'
];

/**
 * Fisher-Yates shuffle for random ordering.
 * Returns new array, does not mutate input.
 */
function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generate an array of unique team names.
 * Names follow "Adjective Noun" pattern (e.g., "Mighty Dragons").
 * With 20 adjectives x 20 nouns = 400 possible combinations.
 *
 * @param count Number of team names to generate
 * @returns Array of unique two-word team names
 */
export function generateTeamNames(count: number): string[] {
  const shuffledAdj = shuffle(ADJECTIVES);
  const shuffledNouns = shuffle(NOUNS);

  return Array.from({ length: count }, (_, i) =>
    `${shuffledAdj[i % shuffledAdj.length]} ${shuffledNouns[i % shuffledNouns.length]}`
  );
}

/**
 * Create initial Team objects with generated names and zero scores.
 * Each team gets a unique UUID for stable React keys.
 *
 * @param count Number of teams to create
 * @returns Array of Team objects ready for game state
 */
export function createTeams(count: number): Team[] {
  const names = generateTeamNames(count);
  return names.map(name => ({
    id: crypto.randomUUID(),
    name,
    score: 0
  }));
}
