import * as E from './engine';

const fresh = (mode = 'endless', opts = {}) => E.createInitialState(mode, { seed: 42, ...opts });
const checker = (s) => {
  for (let r = 0; r < s.cfg.rows; r++)
    for (let c = 0; c < s.cfg.cols; c++) {
      s.grid[r][c] = ((r + c) % 2) + 1;
      s.ids[r][c] = s.nextId++;
    }
};

test('two adjacent same-tier orbs merge into the next tier', () => {
  const s = fresh();
  const last = s.cfg.rows - 1;
  s.grid[last][0] = 1; s.ids[last][0] = 900;
  s.grid[last][1] = 1; s.ids[last][1] = 901;
  const events = E.resolveCascade(s, false);
  expect(s.grid[last][1]).toBe(2);
  expect(s.grid[last][0]).toBe(0);
  expect(s.ids[last][1]).toBe(901); // newest orb is the anchor and keeps its id
  expect(events.some((e) => e.type === 'merge' && e.newVal === 2)).toBe(true);
});

test('clusters of four or more jump two tiers', () => {
  const s = fresh();
  const last = s.cfg.rows - 1;
  for (let c = 0; c < 4; c++) { s.grid[last][c] = 2; s.ids[last][c] = 100 + c; }
  const events = E.resolveCascade(s, false);
  expect(events.find((e) => e.type === 'merge').newVal).toBe(4);
});

test('settleAll compacts a column and keeps ids attached to their values', () => {
  const s = fresh();
  s.grid[0][2] = 3; s.ids[0][2] = 7;
  s.grid[4][2] = 5; s.ids[4][2] = 8;
  E.settleAll(s);
  const last = s.cfg.rows - 1;
  expect([s.grid[last][2], s.ids[last][2]]).toEqual([5, 8]);
  expect([s.grid[last - 1][2], s.ids[last - 1][2]]).toEqual([3, 7]);
});

test('daily mode is deterministic for the same calendar day', () => {
  const d = new Date(2026, 10, 6);
  const a = E.createInitialState('daily', { date: d });
  const b = E.createInitialState('daily', { date: d });
  for (let i = 0; i < 20; i++) { E.dropOrb(a, i % 6); E.dropOrb(b, i % 6); }
  expect(a.grid).toEqual(b.grid);
  expect(a.score).toBe(b.score);
});

test('drop ends the run once the spawn row fills', () => {
  const s = fresh();
  checker(s);
  s.grid[0][0] = 0;
  s.queue[0] = 1; // neighbours are 2 → no merge
  const events = E.dropOrb(s, 0);
  expect(s.gameOver).toBe(true);
  expect(events.some((e) => e.type === 'gameOver')).toBe(true);
});

test('zen never ends; a full board is swept instead', () => {
  const s = fresh('zen');
  checker(s);
  s.grid[0][0] = 0;
  s.queue[0] = 1;
  const events = E.dropOrb(s, 0);
  expect(s.gameOver).toBe(false);
  expect(events.some((e) => e.type === 'sweep')).toBe(true);
  expect(E.isBoardFull(s)).toBe(false);
});

test('gravity flips after flipEvery drops and orbs move to the other side', () => {
  const s = fresh();
  s.cfg.spawnTier2 = 0; // only tier-1 spawns
  s.queue = [1, 1];
  for (let i = 0; i < s.cfg.flipEvery; i++) E.dropOrb(s, i % 2 === 0 ? 0 : 5);
  expect(s.gravity).toBe('up');
  // everything is packed toward row 0 now
  for (let c = 0; c < s.cfg.cols; c++) {
    let seenEmpty = false;
    for (let r = 0; r < s.cfg.rows; r++) {
      if (s.grid[r][c] === 0) seenEmpty = true;
      else expect(seenEmpty).toBe(false);
    }
  }
});

test('gravity lock absorbs one flip', () => {
  const s = fresh();
  E.useGravityLock(s);
  s.nextFlipAt = 1;
  const events = E.dropOrb(s, 0);
  expect(s.gravity).toBe('down');
  expect(events.some((e) => e.type === 'lockAbsorbed')).toBe(true);
});

test('two supernovas collide into a blast that clears neighbours', () => {
  const s = fresh();
  const last = s.cfg.rows - 1;
  s.grid[last][2] = 8; s.ids[last][2] = 1;
  s.grid[last][3] = 8; s.ids[last][3] = 2;
  s.grid[last][1] = 3; s.ids[last][1] = 3;
  s.grid[last][4] = 5; s.ids[last][4] = 4;
  s.grid[last][0] = 1; s.ids[last][0] = 5;
  const events = E.resolveCascade(s, false);
  const blast = events.find((e) => e.type === 'blast');
  expect(blast.cells.length).toBe(4);
  expect(s.grid[last][0]).toBe(1);
  expect(s.blasts).toBe(1);
});

test('frames are recorded when rec is set and replay ends at the final grid', () => {
  const s = fresh();
  s.rec = [];
  s.queue = [1, 1];
  E.dropOrb(s, 0);
  E.dropOrb(s, 1);
  const lastFrame = s.rec[s.rec.length - 1];
  expect(lastFrame.orbs).toEqual(E.snapshot(s));
  expect(s.rec.some((f) => f.kind === 'gather')).toBe(true);
});

test('bomb clears a plus shape', () => {
  const s = fresh();
  checker(s);
  E.useBomb(s, 8, 2);
  const remaining = s.grid.flat().filter(Boolean).length;
  expect(remaining).toBeLessThan(s.cfg.rows * s.cfg.cols);
});

test('continue clears the spawn-side rows and resumes the run', () => {
  const s = fresh();
  checker(s);
  s.gameOver = true; s.result = 'lost';
  E.continueRun(s);
  expect(s.gameOver).toBe(false);
  expect(E.isBoardFull(s)).toBe(false);
  expect(s.continues).toBe(1);
});

test('serialize/deserialize round-trips a run (including Infinity flip config)', () => {
  const s = fresh('zen');
  for (let i = 0; i < 10; i++) E.dropOrb(s, i % 6);
  const back = E.deserializeRun(E.serializeRun(s));
  expect(back.grid).toEqual(s.grid);
  expect(back.cfg.flipEvery).toBe(Infinity);
  expect(back.rngState).toBe(s.rngState);
});

test('streak increments on consecutive days and resets after a gap', () => {
  const d = new Date(2026, 10, 6);
  expect(E.computeStreakUpdate(4, '2026-11-05', d).streak).toBe(5);
  expect(E.computeStreakUpdate(4, '2026-11-03', d).streak).toBe(1);
  expect(E.computeStreakUpdate(4, '2026-11-06', d).changed).toBe(false);
});

test('puzzle hints follow the stored solution until the player deviates', () => {
  const p = { id: 1, seed: 5, grid: [], target: 9, par: 3, moveLimit: 9, solution: [2, 4, 1] };
  const s = E.createInitialState('puzzle', { puzzle: p });
  expect(E.puzzleHint(s)).toBe(2);
  E.dropOrb(s, 2);
  expect(E.puzzleHint(s)).toBe(4);
  E.dropOrb(s, 0);
  expect(E.puzzleHint(s)).toBe(null);
});

test('ISO week key', () => {
  expect(E.weekKey(new Date(2026, 0, 1))).toBe('2026-W01');
  expect(E.weekKey(new Date(2026, 11, 31))).toBe('2026-W53');
});

test('dark matter never merges and shatters when a merge happens next to it', () => {
  const s = fresh();
  const last = s.cfg.rows - 1;
  s.grid[last][0] = E.DARK; s.ids[last][0] = 1;
  s.grid[last][1] = E.DARK; s.ids[last][1] = 2;
  expect(E.findClusters(s)).toEqual([]);
  s.grid[last][2] = 3; s.ids[last][2] = 3;
  s.grid[last][3] = 3; s.ids[last][3] = 4;
  const events = E.resolveCascade(s, false);
  const dark = events.find((e) => e.type === 'darkClear');
  expect(dark.cells.length).toBe(1); // only the one touching the merging pair
  expect(s.grid.flat().filter((v) => v === E.DARK).length).toBe(1);
});

test('any full column ends an Endless run', () => {
  const s = fresh();
  for (let r = 1; r < s.cfg.rows; r++) { s.grid[r][0] = (r % 2) + 1; s.ids[r][0] = 100 + r; }
  s.queue[0] = 3;
  E.dropOrb(s, 0);
  expect(s.gameOver).toBe(true);
});

test('meteor showers drop dark matter in Endless but never in Zen or puzzles', () => {
  const s = fresh();
  s.nextShowerAt = 1;
  const events = E.dropOrb(s, 0);
  expect(events.some((e) => e.type === 'shower')).toBe(true);
  expect(s.grid.flat().some((v) => v === E.DARK)).toBe(true);
  expect(fresh('zen').nextShowerAt).toBe(Infinity);
  const p = E.createInitialState('puzzle', { puzzle: { id: 1, seed: 1, grid: [], target: 4, par: 2, moveLimit: 5 } });
  expect(p.nextShowerAt).toBe(Infinity);
});

test('showers tighten as the run goes on', () => {
  const early = E.showerPlan(60);
  const late = E.showerPlan(900);
  expect(late.every).toBeLessThan(early.every);
  expect(late.rocks).toBeGreaterThan(early.rocks);
});
