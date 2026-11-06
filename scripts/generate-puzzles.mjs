// Generates src/game/puzzles.json: hand-tuned difficulty curve, every level
// proven solvable by a breadth-first solver that runs the real game engine.
// The solver's minimum move count becomes the level's "par" (3 stars).
//
//   npm run gen:puzzles
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as E from '../src/game/engine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '../src/game/puzzles.json');

const NAMES = [
  'First Contact', 'Moonrise', 'Dust Belt', 'Red Dawn', 'Twin Craters', 'Blue Marble',
  'Orbit Lock', 'Deep Field', 'Ice Giant', 'Tidal Pull', 'Lagrange Point', 'Event Horizon',
  'Upside Down', 'Flip Side', 'Counterweight', 'Pendulum', 'Slingshot', 'Retrograde',
  'Ring Builder', 'Cassini Gap', 'Shepherd Moons', 'Ring Around Saturn', 'Titan', 'Grand Tour',
  'Ignition', 'Red Giant', 'Core Collapse', 'Supernova Sprint', 'Stellar Nursery', 'Big Bang',
];

// target tier, par range, gravity flips, starting fill, highest starting tier
const SPECS = [
  [4, [2, 3], 0, 3, 3], [4, [3, 3], 0, 3, 3], [4, [3, 4], 0, 4, 3], [5, [2, 3], 0, 4, 4],
  [5, [3, 4], 0, 4, 4], [5, [4, 5], 0, 4, 4], [6, [2, 3], 0, 5, 5], [6, [3, 4], 0, 5, 5],
  [6, [4, 5], 0, 5, 5], [6, [4, 5], 0, 6, 5], [6, [5, 6], 0, 5, 5], [6, [5, 6], 0, 6, 5],
  [5, [3, 4], 3, 4, 4], [5, [4, 5], 3, 4, 4], [6, [3, 4], 4, 5, 5], [6, [4, 5], 3, 5, 5],
  [6, [4, 6], 4, 6, 5], [6, [5, 6], 3, 6, 5], [7, [2, 3], 0, 6, 6], [7, [3, 4], 0, 6, 6],
  [7, [4, 5], 0, 6, 6], [7, [4, 5], 4, 6, 6], [7, [5, 6], 0, 7, 6], [7, [5, 6], 3, 7, 6],
  [8, [2, 3], 0, 7, 7], [8, [3, 4], 0, 7, 7], [8, [4, 5], 0, 7, 7], [8, [4, 5], 4, 7, 7],
  [8, [5, 6], 0, 7, 7], [8, [5, 6], 3, 7, 7],
];
const MAX_FRONTIER = 250000;

function makeGrid(seed, fillRows, maxTier, target) {
  const rng = E.mulberry32(seed);
  const rows = 9, cols = 6;
  const g = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let c = 0; c < cols; c++) {
    const h = Math.max(1, fillRows - Math.floor(rng() * 3));
    for (let r = rows - 1; r >= rows - h; r--) {
      let v, tries = 0;
      do {
        // weight toward mid/high tiers so targets are reachable
        v = 1 + Math.floor(Math.pow(rng(), 0.7) * maxTier);
        tries++;
      } while (tries < 20 && ((r < rows - 1 && g[r + 1][c] === v) || (c > 0 && g[r][c - 1] === v)));
      if ((r < rows - 1 && g[r + 1][c] === v) || (c > 0 && g[r][c - 1] === v)) return null;
      g[r][c] = v;
    }
  }
  if (g.flat().some((v) => v >= target)) return null;
  return E.gridToStrings(g);
}

const keyOf = (s) => s.grid.map((r) => r.join('')).join('|') + s.gravity + s.dropCount;

function solve(puzzle, maxDepth) {
  const start = E.createInitialState('puzzle', { puzzle: { ...puzzle, moveLimit: 99 } });
  start.path = [];
  let frontier = [start];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const seen = new Set();
    const next = [];
    for (const s of frontier) {
      for (let c = 0; c < 6; c++) {
        if (!E.canDrop(s, c)) continue;
        const n = E.cloneState(s);
        E.dropOrb(n, c);
        n.path = [...s.path, c];
        if (n.result === 'won') return { depth, path: n.path };
        if (n.gameOver) continue;
        const k = keyOf(n);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(n);
      }
    }
    if (next.length > MAX_FRONTIER) return { depth: -1 }; // too branchy to prove — skip
    frontier = next;
  }
  return { depth: 0 }; // not solvable within maxDepth
}

const puzzles = [];
let seed = 1000;
for (let i = 0; i < SPECS.length; i++) {
  const [target, [pmin, pmax], flipEvery, fillRows, maxStart] = SPECS[i];
  let found = null;
  let fallback = null; // closest solvable board if nothing lands exactly in range
  for (let attempt = 0; attempt < 1500 && !found; attempt++) {
    seed++;
    const grid = makeGrid(seed, fillRows, maxStart, target);
    if (!grid) continue;
    const def = { seed, grid, target, flipEvery: flipEvery || 0, spawnTier2: 0.25, par: 0, moveLimit: 0 };
    const { depth: par, path } = solve(def, pmax);
    if (par >= pmin && par <= pmax) found = { ...def, par, solution: path };
    else if (par >= 2 && (!fallback || par > fallback.par)) fallback = { ...def, par, solution: path };
  }
  if (!found) found = fallback;
  if (!found) throw new Error(`could not build level ${i + 1}`);
  const slack = i < 6 ? 3 : i < 18 ? 2 : 2;
  const level = {
    id: i + 1,
    name: NAMES[i],
    ...found,
    moveLimit: found.par + slack,
  };
  puzzles.push(level);
  console.log(`#${level.id} ${level.name}: tier ${level.target} par ${level.par} limit ${level.moveLimit} flips ${level.flipEvery || '-'} (seed ${level.seed})`);
}
writeFileSync(OUT, JSON.stringify(puzzles, null, 1) + '\n');
console.log(`wrote ${puzzles.length} puzzles → ${OUT}`);
