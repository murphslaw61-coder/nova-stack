// Bridges the pure engine and the screen. Every player action runs instantly
// in the engine (so game logic is never delayed), then the recorded frames are
// played back to the board with short, tuned delays. Tapping during a cascade
// fast-forwards it, so the game never feels sluggish.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as E from '../game/engine';
import { sfx } from '../services/audio';
import { haptic } from '../services/haptics';
import { skinById } from '../game/skins';
import { TIER_NAMES, COLORS } from '../game/constants';
import { formatScore } from '../components/ui';

const FIXED = { place: 70, gather: 120, merge: 170, blast: 380, flip: 380, shuffle: 360, note: 420, end: 0 };

function frameDuration(frame, prevOrbs) {
  if (frame.kind !== 'settle') return FIXED[frame.kind] ?? 120;
  const before = new Map(prevOrbs.map((o) => [o.id, o]));
  let maxDist = 0;
  for (const o of frame.orbs) {
    const p = before.get(o.id);
    if (p) maxDist = Math.max(maxDist, Math.abs(p.r - o.r), Math.abs(p.c - o.c));
  }
  return maxDist === 0 ? 0 : Math.min(320, 70 + maxDist * 32);
}

const emptyView = { orbs: [], dur: 0, score: 0, gravity: 'down', dropId: null, busy: false, ended: false, n: 0 };

export function useGame({ boardFxRef, screenFxRef, shake, geomRef, skinId, onActionLogic, onSettled }) {
  const stateRef = useRef(null);
  const [view, setView] = useState(emptyView);
  const viewRef = useRef(emptyView);
  const timers = useRef([]);
  const [, force] = useState(0);
  const cbs = useRef({});
  cbs.current = { onActionLogic, onSettled, skinId };

  const commit = useCallback((v) => {
    viewRef.current = v;
    setView(v);
  }, []);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const center = (r, c) => {
    const { cell, gap } = geomRef.current;
    return [c * (cell + gap) + cell / 2, r * (cell + gap) + cell / 2];
  };
  const tierColor = (v) => {
    const pal = skinById(cbs.current.skinId).palette[v] || {};
    return pal.glow || pal.light || '#fff';
  };

  const fire = useCallback((events) => {
    const bfx = boardFxRef.current;
    const sfxr = screenFxRef.current;
    for (const e of events) {
      switch (e.type) {
        case 'drop':
          sfx.drop();
          break;
        case 'merge': {
          const [x, y] = center(e.at[0], e.at[1]);
          sfx.merge(e.newVal);
          if (bfx) {
            bfx.burst(x, y, tierColor(e.newVal), e.big ? 18 : 11, e.big ? 1.4 : 1);
            bfx.popup(x, y - 6, `+${formatScore(e.gained)}`, e.flipBonus ? COLORS.cyan : COLORS.gold, e.big || e.isMax);
          }
          if (e.isMax) {
            sfx.supernova();
            haptic.heavy();
            if (bfx) bfx.ring(x, y, COLORS.gold, 220);
            if (sfxr) { sfxr.flash('#FFE9A8', 0.5); sfxr.banner('SUPERNOVA!', COLORS.gold, 'Collide two to trigger a Big Bang'); }
            shake(10);
          } else if (e.big) {
            haptic.medium();
            if (sfxr) sfxr.banner('MEGA MERGE', COLORS.violet, `+2 tiers → ${TIER_NAMES[e.newVal]}`);
            shake(4);
          } else {
            haptic.light();
          }
          break;
        }
        case 'combo':
          sfx.combo();
          haptic.medium();
          if (sfxr) sfxr.banner(`COMBO ×${e.combo}`, e.combo >= 4 ? COLORS.coral : COLORS.cyan, e.flipBonus ? 'Flip bonus!' : undefined);
          break;
        case 'flip':
          sfx.flip();
          haptic.flip();
          if (sfxr) { sfxr.flash(COLORS.cyan, 0.18); sfxr.banner('GRAVITY FLIP', COLORS.cyan, e.gravity === 'up' ? '▲ everything falls up' : '▼ everything falls down'); }
          shake(7);
          break;
        case 'blast': {
          sfx.blast();
          haptic.heavy();
          const [x, y] = center(e.at[0], e.at[1]);
          if (bfx) {
            bfx.ring(x, y, '#FFFFFF', 320);
            bfx.ring(x, y, COLORS.gold, 200);
            for (const [r, c, v] of e.cells) { const [cx, cy] = center(r, c); bfx.burst(cx, cy, tierColor(v), 10, 1.3); }
            bfx.popup(x, y, `+${formatScore(e.gained)}`, COLORS.gold, true);
          }
          if (sfxr) { sfxr.flash('#FFFFFF', 0.8); sfxr.banner('BIG BANG!', '#FFFFFF', `${e.cells.length} orbs obliterated`); }
          shake(16);
          break;
        }
        case 'bomb':
        case 'sweep':
        case 'continue':
          sfx.blast();
          haptic.heavy();
          if (bfx) for (const [r, c, v] of e.cells) { const [cx, cy] = center(r, c); bfx.burst(cx, cy, tierColor(v), 9, 1.1); }
          if (e.type === 'sweep' && sfxr) sfxr.banner('COSMIC SWEEP', COLORS.violet, 'Zen clears the small stuff');
          if (e.type === 'continue' && sfxr) sfxr.banner('SECOND CHANCE', COLORS.green);
          shake(8);
          break;
        case 'shower':
          sfx.warn();
          haptic.warning();
          if (sfxr) sfxr.banner('METEOR SHOWER', COLORS.violet, 'Merge next to Dark Matter to shatter it');
          shake(6);
          break;
        case 'darkClear':
          sfx.blast();
          haptic.medium();
          if (bfx) {
            for (const [r, c] of e.cells) { const [cx, cy] = center(r, c); bfx.burst(cx, cy, '#B47CFF', 10, 1.2); bfx.ring(cx, cy, '#B47CFF', 90); }
            const [px, py] = center(e.cells[0][0], e.cells[0][1]);
            bfx.popup(px, py, `+${formatScore(e.gained)}`, '#C9A4FF', false);
          }
          break;
        case 'shuffle':
          sfx.powerup();
          haptic.medium();
          break;
        case 'lockAbsorbed':
          sfx.powerup();
          if (sfxr) sfxr.banner('FLIP BLOCKED', COLORS.cyan, 'Gravity Lock held');
          break;
        case 'gameOver':
        case 'puzzleFail':
          sfx.gameover();
          haptic.error();
          shake(6);
          break;
        case 'puzzleWin':
          sfx.win();
          haptic.success();
          if (sfxr) sfxr.banner('SOLVED!', COLORS.green, '★'.repeat(e.stars) + '☆'.repeat(3 - e.stars));
          break;
        default:
          break;
      }
    }
  }, [shake]);

  const settle = useCallback((events) => {
    const s = stateRef.current;
    if (!s) return;
    const v = { ...viewRef.current, orbs: E.snapshot(s), score: s.score, gravity: s.gravity, busy: false, ended: s.gameOver, dur: 120 };
    commit(v);
    if (!s.gameOver && E.dropsUntilFlip(s) === 1 && events.some((e) => e.type === 'drop')) {
      sfx.warn();
      haptic.warning();
    }
    cbs.current.onSettled && cbs.current.onSettled(s, events);
  }, [commit]);

  const play = useCallback((events) => {
    const s = stateRef.current;
    const frames = s.rec || [];
    s.rec = [];
    clearTimers();
    const dropId = (events.find((e) => e.type === 'drop') || {}).id ?? null;
    let t = 0;
    let prev = viewRef.current.orbs;
    for (const f of frames) {
      const d = frameDuration(f, prev);
      const at = t;
      timers.current.push(setTimeout(() => {
        commit({ ...viewRef.current, orbs: f.orbs, dur: d, score: f.score, gravity: f.gravity, dropId, busy: true, ended: false });
        if (f.events.length) fire(f.events);
      }, at));
      t += d;
      prev = f.orbs;
    }
    timers.current.push(setTimeout(() => settle(events), t + 10));
  }, [commit, fire, settle]);

  // Jump straight to the end of any in-flight animation.
  const flush = useCallback(() => {
    if (!viewRef.current.busy) return;
    clearTimers();
    settle([]);
  }, [settle]);

  const act = useCallback((fn) => {
    const s = stateRef.current;
    if (!s) return null;
    flush();
    s.rec = [];
    const events = fn(s);
    if (!events) { s.rec = null; return null; }
    cbs.current.onActionLogic && cbs.current.onActionLogic(s, events);
    play(events);
    force((n) => n + 1);
    return events;
  }, [flush, play]);

  const load = useCallback((state) => {
    clearTimers();
    stateRef.current = state;
    commit({ ...emptyView, orbs: E.snapshot(state), score: state.score, gravity: state.gravity, ended: state.gameOver, n: viewRef.current.n + 1 });
  }, [commit]);

  return {
    stateRef,
    view,
    load,
    start: (mode, opts) => load(E.createInitialState(mode, opts)),
    drop: (c) => act((s) => E.dropOrb(s, c)),
    bombAt: (r, c) => act((s) => E.useBomb(s, r, c)),
    shuffle: () => act((s) => E.useShuffle(s)),
    lock: () => act((s) => E.useGravityLock(s)),
    delay: () => act((s) => E.useFlipDelay(s)),
    continueRun: () => act((s) => E.continueRun(s)),
    flush,
    rerender: () => force((n) => n + 1),
  };
}
