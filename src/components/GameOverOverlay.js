import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, GhostButton, T, formatScore } from './ui';
import Planet from './Planet';
import { COLORS, FONTS, TIER_NAMES, modeMeta } from '../game/constants';
import { puzzleStars } from '../game/engine';
import { CONFIG } from '../config';

export default function GameOverOverlay({ state, best, isNewBest, streak, canContinue, continueReady, onContinue, onRestart, onHome, onNextPuzzle, hasNextPuzzle, skin }) {
  const t = useRef(new Animated.Value(0)).current;
  const count = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = React.useState(0);
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    const id = count.addListener(({ value }) => setShown(Math.round(value)));
    Animated.timing(count, { toValue: state.score, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => count.removeListener(id);
  }, []);

  const meta = modeMeta(state.mode);
  const puzzle = state.puzzle;
  const won = state.result === 'won';
  const stars = puzzle && won ? puzzleStars(puzzle, state.movesUsed) : 0;
  const tier = Math.max(1, state.maxTier);

  const share = async () => {
    const lines = [
      puzzle ? `NOVA STACK · Puzzle ${puzzle.id} "${puzzle.name}" ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} in ${state.movesUsed} drops`
        : `NOVA STACK · ${meta.name}${state.dayKey ? ` ${state.dayKey}` : ''}`,
      !puzzle && `Score ${formatScore(state.score)} · reached ${TIER_NAMES[tier]} · best combo ×${state.bestCombo} · ${state.flipsSurvived} flips survived`,
      CONFIG.links.storeUrl || null,
    ].filter(Boolean);
    try { await Share.share({ message: lines.join('\n') }); } catch (e) {}
  };

  let title = 'Board Overflow';
  let titleColor = COLORS.coral;
  if (puzzle) { title = won ? 'Puzzle Solved!' : 'Out of Moves'; titleColor = won ? COLORS.green : COLORS.coral; }
  else if (isNewBest) { title = 'New Best!'; titleColor = COLORS.gold; }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
      <Animated.View style={[styles.card, { transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
        <LinearGradient colors={['#1D2358', '#0C0F2E']} style={[StyleSheet.absoluteFill, { borderRadius: 26 }]} />
        <T kind="label" style={{ textAlign: 'center', color: meta.color }}>
          {meta.name}{state.dayKey ? ` · ${state.dayKey}` : ''}{puzzle ? ` · Level ${puzzle.id}` : ''}
        </T>
        <Text style={[styles.title, { color: titleColor, textShadowColor: titleColor }]}>{title}</Text>

        {puzzle ? (
          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <Text style={styles.stars}>{won ? '★'.repeat(stars) : ''}<Text style={{ color: 'rgba(255,255,255,0.15)' }}>{'★'.repeat(won ? 3 - stars : 3)}</Text></Text>
            <T kind="dim" style={{ marginTop: 6 }}>{won ? `${state.movesUsed} drops · par ${puzzle.par}` : `Goal: create a ${TIER_NAMES[puzzle.target]} in ${puzzle.moveLimit} drops`}</T>
          </View>
        ) : (
          <>
            <Text style={styles.score}>{formatScore(shown)}</Text>
            <T kind="dim" style={{ textAlign: 'center' }}>Best {formatScore(best)}</T>
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Planet tier={tier} size={34} skinId={skin} />
                <T kind="label" style={styles.statLabel}>{TIER_NAMES[tier]}</T>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>×{state.bestCombo}</Text>
                <T kind="label" style={styles.statLabel}>Best combo</T>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{state.flipsSurvived}</Text>
                <T kind="label" style={styles.statLabel}>Flips</T>
              </View>
            </View>
            {state.mode === 'daily' && <T kind="dim" style={{ textAlign: 'center', marginBottom: 6 }}>🔥 Daily streak: {streak} day{streak === 1 ? '' : 's'}</T>}
          </>
        )}

        <View style={{ gap: 9, marginTop: 8 }}>
          {canContinue && (
            <Button
              label="SECOND CHANCE"
              sub={continueReady ? 'Watch a short video to clear 3 rows' : 'Video loading…'}
              icon="▶"
              colors={[COLORS.green, '#1FCB8A']}
              disabled={!continueReady}
              onPress={onContinue}
            />
          )}
          {puzzle && won && hasNextPuzzle ? (
            <Button label="NEXT PUZZLE" onPress={onNextPuzzle} />
          ) : (
            <Button label={puzzle ? 'RETRY' : 'PLAY AGAIN'} onPress={onRestart} colors={canContinue ? ['#3B4AA8', '#2A3480'] : undefined} textColor={canContinue ? COLORS.text : undefined} />
          )}
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <GhostButton label="Home" icon="⌂" onPress={onHome} style={{ flex: 1 }} />
            <GhostButton label="Share" icon="↗" onPress={share} style={{ flex: 1 }} />
          </View>
          {puzzle && won && <GhostButton label="Retry for more stars" onPress={onRestart} />}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(3,4,12,0.78)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 360, borderRadius: 26, padding: 22, borderWidth: 1, borderColor: COLORS.strokeHi, overflow: 'hidden' },
  title: { fontFamily: FONTS.display, fontSize: 28, textAlign: 'center', marginTop: 6, letterSpacing: 1.5, textShadowRadius: 16, textShadowOffset: { width: 0, height: 0 } },
  score: { fontFamily: FONTS.display, fontSize: 44, color: COLORS.text, textAlign: 'center', marginTop: 8, letterSpacing: 1 },
  stars: { fontSize: 46, color: COLORS.gold, letterSpacing: 6 },
  statsRow: { flexDirection: 'row', marginVertical: 14, gap: 8 },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 62, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingBottom: 6 },
  statValue: { fontFamily: FONTS.display, fontSize: 20, color: COLORS.text, marginBottom: 4 },
  statLabel: { fontSize: 9 },
});
