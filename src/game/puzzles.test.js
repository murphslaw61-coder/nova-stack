import * as E from './engine';
import PUZZLES from './puzzles.json';

test('there are 30 puzzles with unique ids in order', () => {
  expect(PUZZLES.map((p) => p.id)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
});

// Every stored solution must still win in exactly `par` drops with the
// current engine. If a rules change breaks a puzzle, this fails — rerun
// `npm run gen:puzzles`.
test.each(PUZZLES.map((p) => [p.id, p.name, p]))('puzzle %i "%s" is solvable at par', (_id, _name, p) => {
  const s = E.createInitialState('puzzle', { puzzle: p });
  expect(E.checkPuzzleSolved(s)).toBe(false);
  for (const c of p.solution) E.dropOrb(s, c);
  expect(s.result).toBe('won');
  expect(s.movesUsed).toBe(p.par);
  expect(p.moveLimit).toBeGreaterThan(p.par);
});
