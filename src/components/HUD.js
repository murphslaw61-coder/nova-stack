import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Planet from './Planet';
import { T, formatScore } from './ui';
import { COLORS, FONTS } from '../game/constants';

export const ScoreBlock = memo(function ScoreBlock({ score, best, label = 'Score' }) {
  const bump = useRef(new Animated.Value(1)).current;
  const last = useRef(score);
  useEffect(() => {
    if (score > last.current) {
      bump.setValue(1.18);
      Animated.spring(bump, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
    }
    last.current = score;
  }, [score]);
  const newBest = best > 0 && score >= best && score > 0;
  return (
    <View style={styles.scoreBlock}>
      <T kind="label">{label}</T>
      <Animated.Text style={[styles.score, { transform: [{ scale: bump }] }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatScore(score)}
      </Animated.Text>
      <Text style={[styles.best, newBest && { color: COLORS.gold }]}>
        {newBest ? '★ NEW BEST' : `BEST ${formatScore(best)}`}
      </Text>
    </View>
  );
});

export const NextQueue = memo(function NextQueue({ queue, skin }) {
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    pop.setValue(0.6);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start();
  }, [queue[0], queue[1]]);
  return (
    <View style={styles.next} accessibilityLabel={`Next orb tier ${queue[0]}, then tier ${queue[1]}`}>
      <T kind="label" style={{ marginBottom: 2 }}>Next</T>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <Planet tier={queue[0]} size={40} skinId={skin} />
        </Animated.View>
        <View style={{ opacity: 0.55, marginBottom: 2 }}>
          <Planet tier={queue[1]} size={24} skinId={skin} />
        </View>
      </View>
    </View>
  );
});

export const FlipMeter = memo(function FlipMeter({ remaining, flipEvery, gravity, locked, showerIn }) {
  const spin = useRef(new Animated.Value(gravity === 'down' ? 0 : 1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(spin, { toValue: gravity === 'down' ? 0 : 1, friction: 6, tension: 60, useNativeDriver: true }).start();
  }, [gravity]);
  const warn = remaining <= 1 && !locked;
  useEffect(() => {
    if (!warn) { pulse.setValue(0); return; }
    const l = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, [warn]);

  if (flipEvery === Infinity) {
    return (
      <View style={styles.meter}>
        <Text style={styles.arrowStatic}>▼</Text>
        <T kind="label">Gravity is calm — no flips in this mode</T>
      </View>
    );
  }
  const pips = Math.min(flipEvery, 12);
  const filled = Math.round(((flipEvery - Math.min(remaining, flipEvery)) / flipEvery) * pips);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  return (
    <View style={styles.meter} accessibilityLabel={`${remaining} drops until gravity flips`}>
      <Animated.Text style={[styles.arrow, { transform: [{ rotate: rot }] }, warn && { color: COLORS.orange }]}>▼</Animated.Text>
      <View style={styles.pips}>
        {Array.from({ length: pips }, (_, i) => (
          <View key={i} style={[styles.pip, i < filled && { backgroundColor: warn ? COLORS.orange : COLORS.violet }]} />
        ))}
      </View>
      <Animated.Text style={[styles.meterText, warn && { color: COLORS.orange, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]}>
        {locked ? 'LOCKED' : warn ? 'FLIP NEXT DROP' : `FLIP IN ${remaining}`}
      </Animated.Text>
      {showerIn != null && showerIn <= 9 && (
        <Text style={[styles.shower, showerIn <= 1 && { color: COLORS.coral }]} accessibilityLabel={`Meteor shower in ${showerIn} drops`}>☄{showerIn}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  scoreBlock: { alignItems: 'center', flex: 1 },
  score: { fontFamily: FONTS.display, fontSize: 30, color: COLORS.text, letterSpacing: 1, textShadowColor: 'rgba(124,92,255,0.7)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
  best: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.textDim, letterSpacing: 1.2 },
  next: { alignItems: 'center', width: 84 },
  meter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(10,12,34,0.6)', borderWidth: 1, borderColor: COLORS.stroke },
  arrow: { color: COLORS.cyan, fontSize: 14, fontFamily: FONTS.bodyBlack },
  arrowStatic: { color: COLORS.textFaint, fontSize: 12 },
  pips: { flexDirection: 'row', gap: 3, flex: 1 },
  pip: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  shower: { fontFamily: FONTS.bodyBlack, fontSize: 12, color: COLORS.violet, marginLeft: 2 },
  meterText: { fontFamily: FONTS.bodyBlack, fontSize: 11, color: COLORS.text, letterSpacing: 1.2, minWidth: 92, textAlign: 'right' },
});
