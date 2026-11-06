// Achievements reward power-ups, which keeps the free economy flowing and
// introduces players to the items they can later buy.
export const ACHIEVEMENTS = [
  { id: 'first_merge', name: 'First Contact', desc: 'Merge two orbs', reward: { bomb: 1 }, test: (c) => c.stats.merges >= 1 },
  { id: 'mars', name: 'Red Planet', desc: 'Create a Mars', reward: { shuffle: 1 }, test: (c) => c.stats.highestTier >= 4 },
  { id: 'earth', name: 'Pale Blue Dot', desc: 'Create an Earth', reward: { bomb: 1 }, test: (c) => c.stats.highestTier >= 5 },
  { id: 'neptune', name: 'Ice Giant', desc: 'Create a Neptune', reward: { lock: 1 }, test: (c) => c.stats.highestTier >= 6 },
  { id: 'saturn', name: 'Lord of the Rings', desc: 'Create a Saturn', reward: { flip: 2 }, test: (c) => c.stats.highestTier >= 7 },
  { id: 'supernova', name: 'Supernova!', desc: 'Create a Supernova', reward: { bomb: 2, shuffle: 2 }, test: (c) => c.stats.highestTier >= 8 },
  { id: 'blast', name: 'Big Bang', desc: 'Collide two Supernovas', reward: { bomb: 2, shuffle: 2, lock: 2, flip: 2 }, test: (c) => c.stats.blasts >= 1 },
  { id: 'combo4', name: 'Chain Reaction', desc: 'Hit a ×4 combo', reward: { shuffle: 2 }, test: (c) => c.stats.bestCombo >= 4 },
  { id: 'combo6', name: 'Cosmic Domino', desc: 'Hit a ×6 combo', reward: { bomb: 3 }, test: (c) => c.stats.bestCombo >= 6 },
  { id: 'flips10', name: 'Gravity Surfer', desc: 'Survive 10 flips in one run', reward: { lock: 2 }, test: (c) => c.run && c.run.flipsSurvived >= 10 },
  { id: 'score50k', name: 'Lift-off', desc: 'Score 50,000 in one run', reward: { flip: 2 }, test: (c) => c.run && c.run.score >= 50000 },
  { id: 'score250k', name: 'Stellar', desc: 'Score 250,000 in one run', reward: { bomb: 2, lock: 2 }, test: (c) => c.run && c.run.score >= 250000 },
  { id: 'score1m', name: 'Galactic', desc: 'Score 1,000,000 in one run', reward: { bomb: 3, shuffle: 3, lock: 3, flip: 3 }, test: (c) => c.run && c.run.score >= 1000000 },
  { id: 'dark25', name: 'Dark Matter Hunter', desc: 'Shatter 25 Dark Matter rocks', reward: { bomb: 2 }, test: (c) => c.stats.darkCleared >= 25 },
  { id: 'streak3', name: 'Regular', desc: '3-day Daily streak', reward: { shuffle: 2 }, test: (c) => c.streak >= 3 },
  { id: 'streak7', name: 'Devoted', desc: '7-day Daily streak', reward: { bomb: 2, shuffle: 2, lock: 2, flip: 2 }, test: (c) => c.streak >= 7 },
  { id: 'puzzles10', name: 'Puzzler', desc: 'Solve 10 puzzles', reward: { bomb: 2 }, test: (c) => c.puzzlesSolved >= 10 },
  { id: 'puzzles30', name: 'Mastermind', desc: 'Solve all 30 puzzles', reward: { bomb: 3, shuffle: 3, lock: 3, flip: 3 }, test: (c) => c.puzzlesSolved >= 30 },
  { id: 'games25', name: 'Frequent Flyer', desc: 'Play 25 runs', reward: { lock: 2, flip: 2 }, test: (c) => c.stats.games >= 25 },
];

export function newlyUnlocked(ctx, unlocked) {
  return ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.test(ctx));
}
