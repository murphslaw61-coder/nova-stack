import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Board, { BOARD_PAD } from '../components/Board';
import { ScreenFx } from '../components/Fx';
import { ScoreBlock, NextQueue, FlipMeter } from '../components/HUD';
import PowerBar from '../components/PowerBar';
import GameOverOverlay from '../components/GameOverOverlay';
import AdBanner from '../components/AdBanner';
import { IconButton, T, Sheet, Button, GhostButton } from '../components/ui';
import Planet from '../components/Planet';
import { useGame } from '../hooks/useGame';
import * as E from '../game/engine';
import { COLORS, FONTS, POWERUPS, TIER_NAMES, modeMeta } from '../game/constants';
import { newlyUnlocked, ACHIEVEMENTS } from '../game/achievements';
import PUZZLES from '../game/puzzles.json';
import { useProfile, getProfile, updateProfile, consumePowerup, grantItems, saveRun } from '../services/profile';
import { showRewardedAd, maybeShowInterstitial, useAdsStatus } from '../services/ads';
import { sfx } from '../services/audio';

const GAP = 5;
const RESUMABLE = ['endless', 'zen', 'extreme'];

export default function GameScreen({ launch, onHome, onOpenShop, toast }) {
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const ads = useAdsStatus();
  const boardFxRef = useRef(null);
  const screenFxRef = useRef(null);
  const geomRef = useRef({ cell: 40, gap: GAP });
  const shakeX = useRef(new Animated.Value(0)).current;
  const [area, setArea] = useState(null);
  const [armed, setArmed] = useState(null);
  const [paused, setPaused] = useState(false);
  const [hintOn, setHintOn] = useState(false);
  const runInfo = useRef({ prevBest: 0, counted: false });

  const shake = useCallback((amp) => {
    shakeX.stopAnimation();
    const seq = [];
    for (let i = 0; i < 6; i++) {
      const a = amp * (1 - i / 6) * (i % 2 ? -1 : 1);
      seq.push(Animated.timing(shakeX, { toValue: a, duration: 38, useNativeDriver: true }));
    }
    seq.push(Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }));
    Animated.sequence(seq).start();
  }, []);

  // ---- game logic that must run immediately (never waits for animations) ----
  const onActionLogic = useCallback((s, events) => {
    const p = getProfile();
    const stats = { ...p.stats };
    let merges = 0, supernovas = 0, blasts = 0;
    for (const e of events) {
      if (e.type === 'merge') {
        merges++;
        if (e.isMax) supernovas++;
        stats.highestTier = Math.max(stats.highestTier, e.newVal);
      } else if (e.type === 'blast') blasts++;
      else if (e.type === 'darkClear') stats.darkCleared = (stats.darkCleared || 0) + e.cells.length;
      else if (e.type === 'combo') stats.bestCombo = Math.max(stats.bestCombo, e.combo);
    }
    stats.merges += merges;
    stats.supernovas += supernovas;
    stats.blasts += blasts;

    const patch = { stats };
    const ended = events.some((e) => e.type === 'gameOver' || e.type === 'puzzleWin' || e.type === 'puzzleFail');
    if (ended && !runInfo.current.counted) {
      runInfo.current.counted = true;
      stats.games += 1;
      stats.totalScore += s.score;
      patch.runsCompleted = (p.runsCompleted || 0) + 1;
    }
    if (ended && s.mode !== 'puzzle') {
      patch.bests = { ...p.bests, [s.mode]: Math.max(p.bests[s.mode] || 0, s.score) };
    }
    if (ended && s.mode === 'daily') {
      const upd = E.computeStreakUpdate(p.streak, p.lastDailyDate);
      patch.streak = upd.streak;
      patch.lastDailyDate = upd.lastDate;
      if (p.lastDailyRewardDate !== upd.lastDate) {
        patch.lastDailyRewardDate = upd.lastDate;
        grantItems({ bomb: 1, shuffle: 1 });
        setTimeout(() => toast('Daily reward: +1 Bomb, +1 Shuffle'), 1400);
      }
    }
    if (events.some((e) => e.type === 'puzzleWin')) {
      const stars = events.find((e) => e.type === 'puzzleWin').stars;
      patch.puzzleStars = { ...p.puzzleStars, [s.puzzle.id]: Math.max(p.puzzleStars[s.puzzle.id] || 0, stars) };
    }
    updateProfile((cur) => ({ ...cur, ...patch }));

    // achievements
    const cur = getProfile();
    const ctx = {
      stats: cur.stats,
      run: { score: s.score, flipsSurvived: s.flipsSurvived },
      streak: cur.streak,
      puzzlesSolved: Object.keys(cur.puzzleStars).length,
    };
    const unlocked = newlyUnlocked(ctx, cur.achievements);
    if (unlocked.length) {
      const ach = { ...cur.achievements };
      unlocked.forEach((a) => { ach[a.id] = true; grantItems(a.reward); });
      updateProfile((x) => ({ ...x, achievements: ach }));
      unlocked.forEach((a, i) => setTimeout(() => { sfx.unlock(); toast(`★ ${a.name} unlocked! Reward added`); }, 700 + i * 1600));
    }
  }, [toast]);

  const onSettled = useCallback((s) => {
    if (RESUMABLE.includes(s.mode)) saveRun(s.gameOver ? null : E.serializeRun(s));
  }, []);

  const game = useGame({ boardFxRef, screenFxRef, shake, geomRef, skinId: profile.skin, onActionLogic, onSettled });
  const s = game.stateRef.current;
  const v = game.view;

  const begin = useCallback((l) => {
    runInfo.current = { prevBest: getProfile().bests[l.mode] || 0, counted: false };
    setArmed(null);
    setHintOn(false);
    if (l.resume) game.load(l.resume);
    else game.start(l.mode, l.puzzle ? { puzzle: l.puzzle } : {});
    updateProfile((p) => ({ ...p, lastMode: l.mode }));
  }, []);

  useEffect(() => { begin(launch); }, [launch]);

  if (!s) return <View style={{ flex: 1 }} />;
  const cfg = s.cfg;

  // ---- board geometry ----
  let cell = 40;
  if (area) {
    const byW = (area.width - 20 - BOARD_PAD * 2 - GAP * (cfg.cols - 1)) / cfg.cols;
    const byH = (area.height - BOARD_PAD * 2 - GAP * (cfg.rows - 1)) / cfg.rows;
    cell = Math.floor(Math.max(24, Math.min(byW, byH, 72)));
  }
  geomRef.current = { cell, gap: GAP };

  const dangerCols = [];
  if (!s.gameOver) {
    for (let c = 0; c < cfg.cols; c++) {
      let filled = 0;
      for (let r = 0; r < cfg.rows; r++) if (s.grid[r][c]) filled++;
      if (filled >= cfg.rows - 2) dangerCols.push(c);
    }
  }
  const remaining = E.dropsUntilFlip(s);
  const meta = modeMeta(s.mode);
  const best = Math.max(profile.bests[s.mode] || 0, s.mode === 'puzzle' ? 0 : s.score);

  // ---- power-ups ----
  const powerupsOn = cfg.powerupsEnabled;
  const disabledKinds = cfg.flipEvery === Infinity ? ['lock', 'flip'] : [];
  const onPower = async (kind) => {
    if (v.busy) game.flush();
    if (s.gameOver) return;
    if (armed === 'bomb' && kind === 'bomb') { setArmed(null); return; }
    const name = POWERUPS.find((p) => p.key === kind).name;
    if ((profile.powerups[kind] || 0) <= 0) {
      if (ads.rewardedReady) {
        const res = await showRewardedAd();
        if (res.earned) { grantItems({ [kind]: 1 }); sfx.powerup(); toast(`+1 ${name}! Tap it to use.`); }
      } else {
        toast(`Out of ${name}s. Get more in the shop.`);
        onOpenShop();
      }
      return;
    }
    if (kind === 'bomb') { setArmed('bomb'); toast('Tap an orb to blast it'); return; }
    if (kind === 'lock' && s.gravityLockPending) { toast('Gravity is already locked'); return; }
    if (!consumePowerup(kind)) return;
    if (kind === 'shuffle') game.shuffle();
    else if (kind === 'lock') { game.lock(); sfx.powerup(); toast('Next gravity flip will be blocked'); }
    else if (kind === 'flip') { game.delay(); sfx.powerup(); toast(`Flip delayed ${E.FLIP_DELAY_DROPS} drops`); }
  };
  const onCellPress = (r, c) => {
    if (armed !== 'bomb') return;
    if (!s.grid[r][c]) { toast('Tap an orb to blast it'); return; }
    if (!consumePowerup('bomb')) { setArmed(null); return; }
    setArmed(null);
    game.bombAt(r, c);
  };

  // ---- run end flow ----
  const afterRun = async (next) => {
    await maybeShowInterstitial({ adsRemoved: getProfile().adsRemoved, runsCompleted: getProfile().runsCompleted });
    next();
  };
  const restart = () => afterRun(() => begin({ mode: s.mode, puzzle: s.puzzle }));
  const goHome = () => afterRun(onHome);
  const nextPuzzleDef = s.puzzle ? PUZZLES.find((p) => p.id === s.puzzle.id + 1) : null;
  const nextPuzzle = () => afterRun(() => begin({ mode: 'puzzle', puzzle: nextPuzzleDef }));
  const canContinue = ads.ready && s.gameOver && s.continues === 0 && s.mode !== 'puzzle' && s.result === 'lost';
  const doContinue = async () => {
    const res = await showRewardedAd();
    if (res.earned) {
      game.continueRun();
    } else if (!res.shown) toast('No video available right now.');
  };

  const puzzle = s.puzzle;
  const onHint = async () => {
    if (!ads.rewardedReady) { toast('Hint videos are loading. Try again in a moment.'); return; }
    const res = await showRewardedAd();
    if (res.earned) { setHintOn(true); sfx.powerup(); }
  };
  const movesLeft = puzzle ? puzzle.moveLimit - s.movesUsed : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      {/* top bar */}
      <View style={styles.topbar}>
        <IconButton icon="❚❚" label="Pause" size={40} onPress={() => { game.flush(); setPaused(true); }} />
        <View style={[styles.modeChip, { borderColor: meta.color + '66' }]}>
          <Text style={[styles.modeIcon, { color: meta.color }]}>{meta.icon}</Text>
          <Text style={styles.modeName} numberOfLines={1}>
            {puzzle ? `Level ${puzzle.id} · ${puzzle.name}` : meta.name}
          </Text>
        </View>
        <IconButton icon="✦" label="Shop" size={40} color={COLORS.gold} onPress={onOpenShop} />
      </View>

      {cfg.weeklyModifier && (
        <View style={styles.weekly}>
          <Text style={styles.weeklyText}><Text style={{ color: COLORS.gold, fontFamily: FONTS.bodyBlack }}>{cfg.weeklyModifier.name}: </Text>{cfg.weeklyModifier.desc}</Text>
        </View>
      )}

      {/* HUD */}
      <View style={styles.hud}>
        {puzzle ? (
          <View style={styles.goal}>
            <T kind="label">Goal</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Planet tier={puzzle.target} size={30} skinId={profile.skin} />
              <Text style={styles.goalText}>{TIER_NAMES[puzzle.target]}</Text>
            </View>
          </View>
        ) : <View style={{ width: 84 }} />}
        {puzzle ? (
          <View style={{ flex: 1, alignItems: 'center' }}>
            <T kind="label">Drops left</T>
            <Text style={[styles.moves, movesLeft <= 1 && { color: COLORS.coral }]}>{Math.max(0, movesLeft)}</Text>
            <T kind="dim" style={{ fontSize: 11 }}>par {puzzle.par} for ★★★</T>
          </View>
        ) : (
          <ScoreBlock score={v.score} best={best} />
        )}
        <NextQueue queue={s.queue} skin={profile.skin} />
      </View>

      <View style={{ paddingHorizontal: 14, marginBottom: 8 }}>
        <FlipMeter remaining={remaining} flipEvery={cfg.flipEvery} gravity={v.gravity} locked={s.gravityLockPending} showerIn={cfg.darkMatter ? Math.max(0, s.nextShowerAt - s.dropCount) : null} />
      </View>

      {/* board */}
      <Animated.View
        style={[styles.boardArea, { transform: [{ translateX: shakeX }] }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (!area || Math.abs(area.width - width) > 1 || Math.abs(area.height - height) > 1) setArea({ width, height });
        }}
      >
        {area && (
          <Board
            ref={boardFxRef}
            orbs={v.orbs}
            dur={v.dur}
            gravity={v.gravity}
            dropId={v.dropId}
            rows={cfg.rows}
            cols={cfg.cols}
            cell={cell}
            gap={GAP}
            skin={profile.skin}
            showNumbers={profile.settings.tierNumbers}
            bombArmed={armed === 'bomb'}
            flipWarn={remaining === 1 && !s.gravityLockPending && !s.gameOver}
            disabled={s.gameOver}
            nextValue={s.queue[0]}
            landingRowFor={(c) => E.landingRow(s, c)}
            dangerCols={dangerCols}
            hintCol={hintOn && puzzle ? E.puzzleHint(s) : null}
            onColumnPress={(c) => { if (!E.canDrop(s, c)) { shake(3); return; } game.drop(c); }}
            onCellPress={onCellPress}
          />
        )}
      </Animated.View>

      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: profile.adsRemoved ? insets.bottom + 10 : 10 }}>
        {powerupsOn ? (
          <PowerBar counts={profile.powerups} onPress={onPower} armed={armed} disabledKinds={disabledKinds} rewardedReady={ads.rewardedReady} />
        ) : (
          puzzle ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <T kind="dim" style={{ flex: 1 }}>
                {hintOn
                  ? (E.puzzleHint(s) != null ? 'Hint: drop in the glowing column.' : 'You left the solution path. Restart to use your hint.')
                  : 'Power-ups are off in puzzles. Plan every drop.'}
              </T>
              {!hintOn ? (
                <GhostButton label="Hint" icon="💡" style={{ width: 110 }} onPress={onHint} />
              ) : E.puzzleHint(s) == null && !s.gameOver ? (
                <GhostButton label="Restart" icon="↺" style={{ width: 110 }} onPress={() => { const keep = true; begin({ mode: 'puzzle', puzzle }); setHintOn(keep); }} />
              ) : null}
            </View>
          ) : (
            <T kind="dim" style={{ textAlign: 'center' }}>Extreme mode: no power-ups. Good luck.</T>
          )
        )}
      </View>
      {!profile.adsRemoved && <View style={{ paddingBottom: insets.bottom }}><AdBanner /></View>}

      <ScreenFx ref={screenFxRef} />

      {v.ended && s.gameOver && (
        <GameOverOverlay
          key={`${v.n}-${s.continues}`}
          state={s}
          best={profile.bests[s.mode] || s.score}
          isNewBest={s.mode !== 'puzzle' && s.score > runInfo.current.prevBest && s.score > 0}
          streak={profile.streak}
          canContinue={canContinue}
          continueReady={ads.rewardedReady}
          onContinue={doContinue}
          onRestart={restart}
          onHome={goHome}
          onNextPuzzle={nextPuzzle}
          hasNextPuzzle={!!nextPuzzleDef}
          skin={profile.skin}
        />
      )}

      <Sheet visible={paused} onClose={() => setPaused(false)} title="Paused" scroll={false}>
        <View style={{ gap: 10 }}>
          <Button label="RESUME" icon="▶" onPress={() => setPaused(false)} />
          <GhostButton label="Restart" icon="↺" onPress={() => { setPaused(false); saveRun(null); begin({ mode: s.mode, puzzle: s.puzzle }); }} />
          <GhostButton label="Home" icon="⌂" onPress={() => { setPaused(false); onHome(); }} />
          {RESUMABLE.includes(s.mode) && <T kind="dim" style={{ textAlign: 'center' }}>Your run is saved. Continue it any time from Home.</T>}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginBottom: 8 },
  modeChip: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, borderWidth: 1, backgroundColor: COLORS.panel, paddingHorizontal: 10 },
  modeIcon: { fontSize: 16, fontFamily: FONTS.bodyBlack },
  modeName: { color: COLORS.text, fontFamily: FONTS.displayMid, fontSize: 13, letterSpacing: 1 },
  weekly: { marginHorizontal: 14, marginBottom: 6, padding: 8, borderRadius: 12, backgroundColor: 'rgba(124,92,255,0.14)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)' },
  weeklyText: { color: COLORS.text, fontFamily: FONTS.body, fontSize: 12, textAlign: 'center' },
  hud: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 6 },
  goal: { width: 84, alignItems: 'center' },
  goalText: { color: COLORS.text, fontFamily: FONTS.bodyBlack, fontSize: 12 },
  moves: { fontFamily: FONTS.display, fontSize: 32, color: COLORS.text },
  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
});
