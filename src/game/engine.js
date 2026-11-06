// NOVA STACK — core game engine
//
// Pure, framework-agnostic logic. No React / React Native imports, so it can
// be unit tested with Jest and reused by the puzzle generator script.
//
// The engine mutates a plain `state` object. Every orb has a stable id (kept
// in `state.ids`, parallel to `state.grid`) so the UI can animate each orb as
// it falls, slides on a gravity flip, and gets absorbed into a merge.
//
// When `state.rec` is an array, the engine appends "frames" to it as it works:
// snapshots of every orb's position plus the events that happen at that
// moment (merge, combo, flip, blast...). The UI plays those frames back with
// short delays, which turns one synchronous resolve into a readable,
// satisfying cascade. When `state.rec` is null (tests, solver) nothing is
// recorded and the engine runs at full speed.

export const MAX_TIER = 8;
// Dark Matter: unmergeable debris that starts spawning late in a run. It is
// destroyed only by a merge right next to it (orthogonally).
export const DARK = 9;
export const DARK_POINTS = 120;

// Points awarded for creating an orb of each tier (index = tier).
export const TIER_POINTS = [0, 10, 25, 60, 140, 320, 700, 1500, 3200];
export const BLAST_POINTS_PER_ORB = 150;
export const FLIP_DELAY_DROPS = 3;
export const CONTINUE_CLEAR_ROWS = 3;

export const WEEKLY_MODIFIERS = [
  { id: 'quick', name: 'Quick Flip', flipEvery: 5, spawnTier2: 0.18, desc: 'Gravity flips every 5 drops instead of 8.' },
  { id: 'heavy', name: 'Heavy Rocks', flipEvery: 8, spawnTier2: 0.5, desc: 'Far more Moons spawn. The board fills faster.' },
  { id: 'slow', name: 'Slow Burn', flipEvery: 12, spawnTier2: 0.18, flipBonus: 5, desc: 'Flips are rare, but merges after a flip score ×5.' },
  { id: 'dense', name: 'Dense Field', flipEvery: 7, spawnTier2: 0.3, startRows: 2, desc: 'Starts with two rows of debris already on the board.' },
  { id: 'twin', name: 'Twin Moons', flipEvery: 6, spawnTier2: 0.4, flipBonus: 4, desc: 'More Moons, faster flips, ×4 flip bonus.' },
];

// ---------------------------------------------------------------------------
// Seeded RNG. The generator state is a plain integer stored on the game state
// so runs can be cloned (puzzle solver) and serialized (resume a run).
// ---------------------------------------------------------------------------
export function rngStep(seed) {
  const s = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [s, ((t ^ (t >>> 14)) >>> 0) / 4294967296];
}
export function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    const [ns, v] = rngStep(s);
    s = ns;
    return v;
  };
}
export function rand(state) {
  const [s, v] = rngStep(state.rngState);
  state.rngState = s;
  return v;
}
export function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}

const pad2 = (n) => String(n).padStart(2, '0');
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
// ISO-8601 week key, e.g. "2026-W45".
export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad2(week)}`;
}
export function weeklyModifierFor(d = new Date()) {
  const idx = Math.abs(hashStr('mod-' + weekKey(d))) % WEEKLY_MODIFIERS.length;
  return WEEKLY_MODIFIERS[idx];
}

// ---------------------------------------------------------------------------
// Mode configuration
// ---------------------------------------------------------------------------
export function configForMode(mode, { date = new Date(), puzzle = null } = {}) {
  let cfg = {
    rows: 9, cols: 6, flipEvery: 8, spawnTier2: 0.18, powerupsEnabled: true,
    flipBonus: 3, startRows: 0, weeklyModifier: null, gameOverEnabled: true, ramp: true, rampDrops: 160, darkMatter: true,
  };
  if (mode === 'extreme') {
    cfg = { ...cfg, rows: 8, cols: 5, flipEvery: 4, spawnTier2: 0.26, powerupsEnabled: false, rampDrops: 90, showerPace: 1.8 };
  } else if (mode === 'zen') {
    cfg = { ...cfg, flipEvery: Infinity, gameOverEnabled: false, darkMatter: false };
  } else if (mode === 'puzzle') {
    cfg = {
      ...cfg,
      flipEvery: puzzle && puzzle.flipEvery ? puzzle.flipEvery : Infinity,
      spawnTier2: puzzle && puzzle.spawnTier2 != null ? puzzle.spawnTier2 : 0.25,
      powerupsEnabled: false,
      ramp: false,
      darkMatter: false,
    };
  } else if (mode === 'weekly') {
    const mod = weeklyModifierFor(date);
    cfg = {
      ...cfg, flipEvery: mod.flipEvery, spawnTier2: mod.spawnTier2,
      flipBonus: mod.flipBonus || 3, startRows: mod.startRows || 0, weeklyModifier: mod,
    };
  }
  return cfg;
}

function seedFor(mode, date, puzzle, explicitSeed) {
  if (mode === 'daily') return hashStr('daily-' + dateKey(date));
  if (mode === 'weekly') return hashStr('weekly-' + weekKey(date));
  if (mode === 'puzzle' && puzzle) return puzzle.seed | 0;
  if (explicitSeed != null) return explicitSeed | 0;
  return (Math.random() * 4294967296) | 0;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
export function createInitialState(mode = 'endless', opts = {}) {
  const date = opts.date || new Date();
  const puzzle = mode === 'puzzle' ? opts.puzzle || null : null;
  const cfg = configForMode(mode, { date, puzzle });
  const state = {
    mode,
    cfg,
    grid: Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(0)),
    ids: Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(0)),
    nextId: 1,
    gravity: 'down',
    score: 0,
    dropCount: 0,
    nextFlipAt: cfg.flipEvery,
    queue: [],
    gameOver: false,
    result: null, // 'won' | 'lost' | null
    bestCombo: 0,
    flipsSurvived: 0,
    maxTier: 0,
    merges: 0,
    supernovas: 0,
    blasts: 0,
    gravityLockPending: false,
    movesUsed: 0,
    continues: 0,
    history: [],
    nextShowerAt: cfg.darkMatter ? Math.round(SHOWERS.start / (cfg.showerPace || 1)) : Infinity,
    puzzle,
    dayKey: mode === 'daily' ? dateKey(date) : mode === 'weekly' ? weekKey(date) : null,
    rngState: seedFor(mode, date, puzzle, opts.seed),
    rec: null,
  };
  if (puzzle) loadGrid(state, puzzle.grid);
  else if (cfg.startRows > 0) fillStartRows(state, cfg.startRows);
  state.queue = [randomSpawnValue(state), randomSpawnValue(state)];
  return state;
}

// Puzzle grids are stored as an array of strings, one char per cell ("0" = empty).
export function loadGrid(state, rowsOfDigits) {
  for (let r = 0; r < state.cfg.rows; r++) {
    for (let c = 0; c < state.cfg.cols; c++) {
      const v = Number((rowsOfDigits[r] || '')[c] || 0);
      if (v > 0) place(state, r, c, v);
    }
  }
}
export function gridToStrings(grid) {
  return grid.map((row) => row.join(''));
}

function fillStartRows(state, n) {
  const { rows, cols } = state.cfg;
  for (let r = rows - n; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let v;
      let tries = 0;
      do {
        v = 1 + Math.floor(rand(state) * 3);
        tries++;
      } while (
        tries < 8 &&
        ((r > rows - n && state.grid[r - 1][c] === v) || (c > 0 && state.grid[r][c - 1] === v))
      );
      place(state, r, c, v);
    }
  }
}

export function cloneState(state) {
  return {
    ...state,
    grid: state.grid.map((r) => r.slice()),
    ids: state.ids.map((r) => r.slice()),
    queue: state.queue.slice(),
    rec: null,
  };
}

// Serializable snapshot of a run (used to resume Endless/Zen/Extreme runs
// after the app is closed). `cfg` is rebuilt from the mode on restore because
// JSON cannot represent Infinity.
export function serializeRun(state) {
  const { rec, cfg, puzzle, ...rest } = state;
  return JSON.stringify(rest);
}
export function deserializeRun(json) {
  try {
    const data = JSON.parse(json);
    if (!data || !data.mode || !Array.isArray(data.grid)) return null;
    const cfg = configForMode(data.mode);
    if (data.grid.length !== cfg.rows || data.grid[0].length !== cfg.cols) return null;
    return {
      ...data,
      cfg,
      puzzle: null,
      nextFlipAt: data.nextFlipAt == null ? cfg.flipEvery : data.nextFlipAt,
      nextShowerAt: data.nextShowerAt == null ? Infinity : data.nextShowerAt,
      rec: null,
    };
  } catch (e) {
    return null;
  }
}

// Spawn odds per tier. Puzzles use a fixed Asteroid/Moon mix (their solutions
// were proven against it). Every other mode ramps up as the run goes on:
// more mid-tier debris spawns, so mismatched orbs pile up and pressure builds.
export const RAMP = { t1: [0.5, 0.3], t2: [0.3, 0.32], t3: [0.2, 0.24], t4: [0, 0.14], drops: 160, maxT: 3 };

// Meteor showers: Dark Matter rains into random columns on a tightening clock.
export const SHOWERS = { start: 40, every: [12, 4], tightenOver: 420, rocks: [1, 4], rocksOver: 360 };
export function showerPlan(drops, pace = 1) {
  const dropCount = drops * pace;
  const k = Math.min(1, dropCount / SHOWERS.tightenOver);
  const every = Math.round(SHOWERS.every[0] + (SHOWERS.every[1] - SHOWERS.every[0]) * k);
  const rocks = Math.min(SHOWERS.rocks[1], SHOWERS.rocks[0] + Math.floor((dropCount / SHOWERS.rocksOver) * (SHOWERS.rocks[1] - SHOWERS.rocks[0] + 1)));
  return { every, rocks };
}
export function spawnWeights(state) {
  const { cfg } = state;
  if (!cfg.ramp) return [0, 1 - cfg.spawnTier2, cfg.spawnTier2];
  // t keeps growing past 1 (up to maxT) so long Endless runs keep tightening.
  const t = Math.min(RAMP.maxT, state.dropCount / (cfg.rampDrops || RAMP.drops));
  const lerp = ([a, b]) => Math.max(0.02, a + (b - a) * t);
  const extra2 = cfg.spawnTier2 - 0.18; // weekly "Heavy Rocks" etc.
  const w = [0];
  for (let tier = 1; RAMP['t' + tier]; tier++) w.push(lerp(RAMP['t' + tier]));
  w[2] += extra2;
  w[1] = Math.max(0.05, w[1] - extra2);
  return w;
}
export function randomSpawnValue(state) {
  const w = spawnWeights(state);
  let total = 0;
  for (const x of w) total += x;
  let roll = rand(state) * total;
  for (let v = 1; v < w.length; v++) {
    roll -= w[v];
    if (roll < 0) return v;
  }
  return 1;
}

export function spawnRow(state) {
  return state.gravity === 'down' ? 0 : state.cfg.rows - 1;
}

export function canDrop(state, c) {
  return !state.gameOver && c >= 0 && c < state.cfg.cols && state.grid[spawnRow(state)][c] === 0;
}

// The row an orb dropped in column c will come to rest in (or -1 if full).
export function landingRow(state, c) {
  const { rows } = state.cfg;
  let count = 0;
  for (let r = 0; r < rows; r++) if (state.grid[r][c] !== 0) count++;
  if (count >= rows) return -1;
  return state.gravity === 'down' ? rows - 1 - count : count;
}

// A run ends when any column is stacked all the way to the spawn edge once
// the cascade has settled (Endless/Daily/Weekly/Extreme). Zen sweeps instead.
export function isOverflowing(state) {
  const { rows, cols } = state.cfg;
  for (let c = 0; c < cols; c++) {
    let full = true;
    for (let r = 0; r < rows; r++) if (state.grid[r][c] === 0) { full = false; break; }
    if (full) return true;
  }
  return false;
}

export function isBoardFull(state) {
  const r = spawnRow(state);
  for (let c = 0; c < state.cfg.cols; c++) if (state.grid[r][c] === 0) return false;
  return true;
}

export function dropsUntilFlip(state) {
  if (state.cfg.flipEvery === Infinity) return Infinity;
  return Math.max(0, state.nextFlipAt - state.dropCount);
}

function place(state, r, c, v) {
  state.grid[r][c] = v;
  state.ids[r][c] = state.nextId++;
}
function clearCell(state, r, c) {
  state.grid[r][c] = 0;
  state.ids[r][c] = 0;
}

// ---------------------------------------------------------------------------
// Frame recording
// ---------------------------------------------------------------------------
export function snapshot(state, overrides) {
  const orbs = [];
  const { rows, cols } = state.cfg;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = state.grid[r][c];
      if (v !== 0) {
        const id = state.ids[r][c];
        const o = overrides && overrides[id];
        if (o) orbs.push({ id, v, r: o.r, c: o.c, m: 1 });
        else orbs.push({ id, v, r, c });
      }
    }
  }
  return orbs;
}

function record(state, kind, events, overrides) {
  if (!state.rec) return;
  state.rec.push({
    kind,
    orbs: snapshot(state, overrides),
    events: events || [],
    score: state.score,
    gravity: state.gravity,
  });
}

// ---------------------------------------------------------------------------
// Gravity & merging
// ---------------------------------------------------------------------------
function settleColumn(state, c) {
  const { rows } = state.cfg;
  const vals = [];
  const idv = [];
  for (let r = 0; r < rows; r++) {
    if (state.grid[r][c] !== 0) {
      vals.push(state.grid[r][c]);
      idv.push(state.ids[r][c]);
    }
    state.grid[r][c] = 0;
    state.ids[r][c] = 0;
  }
  const start = state.gravity === 'down' ? rows - vals.length : 0;
  for (let i = 0; i < vals.length; i++) {
    state.grid[start + i][c] = vals[i];
    state.ids[start + i][c] = idv[i];
  }
}
export function settleAll(state) {
  for (let c = 0; c < state.cfg.cols; c++) settleColumn(state, c);
}

export function findClusters(state) {
  const { rows, cols } = state.cfg;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const clusters = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (state.grid[r][c] === 0 || state.grid[r][c] === DARK || visited[r][c]) continue;
      const val = state.grid[r][c];
      const stack = [[r, c]];
      visited[r][c] = true;
      const cells = [];
      while (stack.length) {
        const [cr, cc] = stack.pop();
        cells.push([cr, cc]);
        const n = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];
        for (const [nr, nc] of n) {
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && state.grid[nr][nc] === val) {
            visited[nr][nc] = true;
            stack.push([nr, nc]);
          }
        }
      }
      if (cells.length >= 2) clusters.push({ val, cells });
    }
  }
  return clusters;
}

// The merged orb appears at the cell deepest in the direction of gravity;
// ties go to the newest orb so merges happen where the player just dropped.
function pickAnchor(state, cells) {
  let best = cells[0];
  for (const cell of cells) {
    const deeper = state.gravity === 'down' ? cell[0] > best[0] : cell[0] < best[0];
    const sameRowNewer = cell[0] === best[0] && state.ids[cell[0]][cell[1]] > state.ids[best[0]][best[1]];
    if (deeper || sameRowNewer) best = cell;
  }
  return best;
}

// Resolves a full merge cascade. Clusters of 2-3 matching orbs become one orb
// of the next tier; clusters of 4+ jump two tiers ("mega merge"). Two or more
// touching Supernovas collapse into a blast that clears everything around them.
export function resolveCascade(state, flipBonusActive = false) {
  const events = [];
  settleAll(state);
  record(state, 'settle', []);
  const mult = flipBonusActive ? state.cfg.flipBonus : 1;
  let combo = 0;
  for (;;) {
    const clusters = findClusters(state);
    if (clusters.length === 0) break;
    combo++;
    const overrides = {};
    for (const cl of clusters) {
      cl.anchor = pickAnchor(state, cl.cells);
      for (const [r, c] of cl.cells) overrides[state.ids[r][c]] = { r: cl.anchor[0], c: cl.anchor[1] };
    }
    record(state, 'gather', [], overrides);

    const round = [];
    let blasted = false;
    for (const cl of clusters) {
      const [ar, ac] = cl.anchor;
      if (cl.val >= MAX_TIER) {
        // Supernova collision: wipe the cluster and every orb touching it (8-way).
        const hit = new Set();
        for (const [r, c] of cl.cells) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < state.cfg.rows && nc >= 0 && nc < state.cfg.cols && state.grid[nr][nc] !== 0) {
                hit.add(nr * 100 + nc);
              }
            }
          }
        }
        const cells = [];
        for (const k of hit) {
          const r = Math.floor(k / 100);
          const c = k % 100;
          cells.push([r, c, state.grid[r][c]]);
          clearCell(state, r, c);
        }
        const gained = (TIER_POINTS[MAX_TIER] * cl.cells.length + BLAST_POINTS_PER_ORB * (cells.length - cl.cells.length)) * combo * mult;
        state.score += gained;
        state.blasts++;
        blasted = true;
        round.push({ type: 'blast', at: [ar, ac], cells, gained, combo });
      } else {
        const big = cl.cells.length >= 4;
        const newVal = Math.min(cl.val + (big ? 2 : 1), MAX_TIER);
        const keepId = state.ids[ar][ac];
        for (const [r, c] of cl.cells) clearCell(state, r, c);
        state.grid[ar][ac] = newVal;
        state.ids[ar][ac] = keepId;
        const gained = TIER_POINTS[newVal] * (cl.cells.length - 1) * combo * mult;
        state.score += gained;
        state.merges++;
        if (newVal > state.maxTier) state.maxTier = newVal;
        if (newVal === MAX_TIER) state.supernovas++;
        round.push({
          type: 'merge', at: [ar, ac], id: keepId, from: cl.val, newVal, size: cl.cells.length,
          big, gained, combo, flipBonus: flipBonusActive, isMax: newVal === MAX_TIER,
        });
      }
    }
    // Merges shatter any Dark Matter touching the merged cluster.
    const darkCells = [];
    for (const cl of clusters) {
      for (const [r, c] of cl.cells) {
        for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
          if (nr >= 0 && nr < state.cfg.rows && nc >= 0 && nc < state.cfg.cols && state.grid[nr][nc] === DARK) {
            darkCells.push([nr, nc, DARK]);
            clearCell(state, nr, nc);
          }
        }
      }
    }
    if (darkCells.length) {
      const gained = DARK_POINTS * darkCells.length * combo * mult;
      state.score += gained;
      state.darkCleared = (state.darkCleared || 0) + darkCells.length;
      round.push({ type: 'darkClear', cells: darkCells, gained });
    }
    if (combo >= 2) round.push({ type: 'combo', combo, flipBonus: flipBonusActive });
    events.push(...round);
    record(state, blasted ? 'blast' : 'merge', round);
    settleAll(state);
    record(state, 'settle', []);
  }
  if (combo > state.bestCombo) state.bestCombo = combo;
  return events;
}

export function doGravityFlip(state) {
  state.gravity = state.gravity === 'down' ? 'up' : 'down';
  const flipEvent = { type: 'flip', gravity: state.gravity };
  record(state, 'flip', [flipEvent]);
  const events = [flipEvent, ...resolveCascade(state, true)];
  state.nextFlipAt = state.dropCount + state.cfg.flipEvery;
  if (!isOverflowing(state)) state.flipsSurvived++;
  return events;
}

// ---------------------------------------------------------------------------
// Puzzles
// ---------------------------------------------------------------------------
export function checkPuzzleSolved(state) {
  if (!state.puzzle) return false;
  const target = state.puzzle.target;
  if (state.puzzle.goal === 'blast') return state.blasts > 0;
  for (let r = 0; r < state.cfg.rows; r++)
    for (let c = 0; c < state.cfg.cols; c++)
      if (state.grid[r][c] >= target) return true;
  return state.maxTier >= target;
}

// Next move of the stored solution, or null once the player has gone off-path.
export function puzzleHint(state) {
  const sol = state.puzzle && state.puzzle.solution;
  if (!sol || state.gameOver) return null;
  const h = state.history || [];
  for (let i = 0; i < h.length; i++) if (h[i] !== sol[i]) return null;
  return h.length < sol.length ? sol[h.length] : null;
}

export function puzzleStars(puzzle, movesUsed) {
  if (movesUsed <= puzzle.par) return 3;
  if (movesUsed <= puzzle.par + 1) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

// Drops the next queued orb into column c. Returns the list of events, or
// null if the drop was not allowed.
export function dropOrb(state, c) {
  if (!canDrop(state, c)) return null;
  const v = state.queue.shift();
  if (state.history) state.history.push(c);
  state.queue.push(randomSpawnValue(state));
  const r = spawnRow(state);
  place(state, r, c, v);
  const dropEvent = { type: 'drop', col: c, v, id: state.ids[r][c] };
  record(state, 'place', [dropEvent]);

  const events = [dropEvent, ...resolveCascade(state, false)];
  state.dropCount++;
  if (state.mode === 'puzzle') state.movesUsed++;

  if (state.cfg.flipEvery !== Infinity && state.dropCount >= state.nextFlipAt) {
    if (state.gravityLockPending) {
      state.gravityLockPending = false;
      state.nextFlipAt = state.dropCount + state.cfg.flipEvery;
      const e = { type: 'lockAbsorbed' };
      events.push(e);
      record(state, 'note', [e]);
    } else {
      events.push(...doGravityFlip(state));
    }
  }

  if (!state.gameOver && state.cfg.darkMatter && state.dropCount >= state.nextShowerAt) {
    events.push(...meteorShower(state));
  }

  const end = [];
  if (state.mode === 'puzzle') {
    if (checkPuzzleSolved(state)) {
      state.gameOver = true;
      state.result = 'won';
      end.push({ type: 'puzzleWin', stars: puzzleStars(state.puzzle, state.movesUsed) });
    } else if (state.movesUsed >= state.puzzle.moveLimit || isBoardFull(state)) {
      state.gameOver = true;
      state.result = 'lost';
      end.push({ type: 'puzzleFail' });
    }
  } else if (isOverflowing(state)) {
    if (state.cfg.gameOverEnabled) {
      state.gameOver = true;
      state.result = 'lost';
      end.push({ type: 'gameOver' });
    } else {
      end.push(...zenSweep(state));
    }
  }
  if (end.length) {
    events.push(...end);
    record(state, 'end', end);
  }
  return events;
}

// Drops Dark Matter rocks into random columns that still have room. Rocks never
// fill a column's last free cell, so a shower alone can't end the run.
export function meteorShower(state) {
  const { rows, cols } = state.cfg;
  const plan = showerPlan(state.dropCount, state.cfg.showerPace || 1);
  state.nextShowerAt = state.dropCount + plan.every;
  const open = [];
  for (let c = 0; c < cols; c++) {
    let filled = 0;
    for (let r = 0; r < rows; r++) if (state.grid[r][c]) filled++;
    if (filled <= rows - 2) open.push(c);
  }
  for (let i = open.length - 1; i > 0; i--) {
    const j = Math.floor(rand(state) * (i + 1));
    [open[i], open[j]] = [open[j], open[i]];
  }
  const hit = open.slice(0, plan.rocks);
  if (!hit.length) return [];
  const r = spawnRow(state);
  const ids = [];
  for (const c of hit) {
    place(state, r, c, DARK);
    ids.push(state.ids[r][c]);
  }
  const e = { type: 'shower', cols: hit, ids };
  record(state, 'place', [e]);
  settleAll(state);
  record(state, 'settle', []);
  return [e];
}

// Zen never ends: when the board fills, the lowest tiers on the board are
// swept away until at least a third of the board is free again.
export function zenSweep(state) {
  const { rows, cols } = state.cfg;
  const counts = {};
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = state.grid[r][c];
    if (v) counts[v] = (counts[v] || 0) + 1;
  }
  const tiers = Object.keys(counts).map(Number).sort((a, b) => a - b);
  const swept = new Set();
  let freed = 0;
  for (const t of tiers) {
    swept.add(t);
    freed += counts[t];
    if (freed >= Math.ceil((rows * cols) / 3)) break;
  }
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (swept.has(state.grid[r][c])) {
      cells.push([r, c, state.grid[r][c]]);
      clearCell(state, r, c);
    }
  }
  const e = { type: 'sweep', cells };
  record(state, 'blast', [e]);
  return [e, ...resolveCascade(state, false)];
}

// ---- power-ups ----
export function useShuffle(state) {
  if (state.gameOver) return null;
  const { rows, cols } = state.cfg;
  const positions = [];
  const items = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (state.grid[r][c] !== 0) {
        positions.push([r, c]);
        items.push([state.grid[r][c], state.ids[r][c]]);
      }
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand(state) * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  positions.forEach(([r, c], i) => {
    state.grid[r][c] = items[i][0];
    state.ids[r][c] = items[i][1];
  });
  const e = { type: 'shuffle' };
  record(state, 'shuffle', [e]);
  return [e, ...resolveCascade(state, false)];
}

// Bomb: destroys the target orb and its four orthogonal neighbours.
export function useBomb(state, r, c) {
  if (state.gameOver || state.grid[r] == null || !state.grid[r][c]) return null;
  const cells = [];
  for (const [dr, dc] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < state.cfg.rows && nc >= 0 && nc < state.cfg.cols && state.grid[nr][nc]) {
      cells.push([nr, nc, state.grid[nr][nc]]);
      clearCell(state, nr, nc);
    }
  }
  const e = { type: 'bomb', at: [r, c], cells };
  record(state, 'blast', [e]);
  return [e, ...resolveCascade(state, false)];
}

export function useGravityLock(state) {
  if (state.cfg.flipEvery === Infinity || state.gravityLockPending) return null;
  state.gravityLockPending = true;
  return [{ type: 'lock' }];
}

export function useFlipDelay(state) {
  if (state.cfg.flipEvery === Infinity) return null;
  state.nextFlipAt += FLIP_DELAY_DROPS;
  return [{ type: 'delay', drops: FLIP_DELAY_DROPS }];
}

// Second chance (rewarded ad): clears the rows nearest the spawn edge.
export function continueRun(state) {
  if (!state.gameOver || state.mode === 'puzzle') return null;
  const { rows, cols } = state.cfg;
  const cells = [];
  for (let i = 0; i < CONTINUE_CLEAR_ROWS; i++) {
    const r = state.gravity === 'down' ? i : rows - 1 - i;
    for (let c = 0; c < cols; c++) {
      if (state.grid[r][c]) {
        cells.push([r, c, state.grid[r][c]]);
        clearCell(state, r, c);
      }
    }
  }
  state.gameOver = false;
  state.result = null;
  state.continues++;
  const e = { type: 'continue', cells };
  record(state, 'blast', [e]);
  return [e, ...resolveCascade(state, false)];
}

// ---- streak (pure date math; persistence lives in the UI layer) ----
export function computeStreakUpdate(prevStreak, lastDate, now = new Date()) {
  const today = dateKey(now);
  if (lastDate === today) return { streak: prevStreak, lastDate, changed: false };
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const streak = lastDate === dateKey(y) ? prevStreak + 1 : 1;
  return { streak, lastDate: today, changed: true };
}
