// One orb on the board. Position and scale are animated on the native driver:
// falling uses an ease-in (gravity), merges pop with a spring, absorbed orbs
// shrink into their anchor.
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Text, StyleSheet, View } from 'react-native';
import Planet from './Planet';
import { FONTS } from '../game/constants';

function Orb({ id, v, r, c, m, cell, gap, dur, skin, showNumber, spawnR }) {
  const step = cell + gap;
  const startR = spawnR != null ? spawnR : r;
  const x = useRef(new Animated.Value(c * step)).current;
  const y = useRef(new Animated.Value(startR * step)).current;
  const scale = useRef(new Animated.Value(spawnR != null ? 0.6 : 0.2)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const prev = useRef({ r: startR, c, v, mounted: false });

  useEffect(() => {
    const p = prev.current;
    const anims = [];
    const moved = p.r !== r || p.c !== c;
    if (moved) {
      const dist = Math.max(Math.abs(p.r - r), Math.abs(p.c - c));
      const d = m ? Math.max(80, dur) : Math.max(60, Math.min(dur || 200, 70 + dist * 30));
      anims.push(
        Animated.timing(x, { toValue: c * step, duration: d, easing: m ? Easing.in(Easing.quad) : Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: r * step, duration: d, easing: m ? Easing.in(Easing.quad) : Easing.in(Easing.quad), useNativeDriver: true }),
      );
      if (!m && p.mounted) {
        // landing squash
        anims.push(Animated.sequence([
          Animated.delay(Math.max(0, d - 20)),
          Animated.timing(scale, { toValue: 0.86, duration: 50, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }),
        ]));
      }
    }
    if (!p.mounted) {
      anims.push(Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }));
    } else if (p.v !== v) {
      scale.setValue(1.45);
      anims.push(Animated.spring(scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }));
    }
    if (m) anims.push(Animated.timing(scale, { toValue: 0.55, duration: Math.max(80, dur), useNativeDriver: true }));
    // Start each animation on its own: in Animated.parallel, interrupting any
    // one of them (e.g. a new pop on `scale`) would stop the fall as well.
    anims.forEach((a) => a.start());
    prev.current = { r, c, v, mounted: true };
  }, [r, c, v, m, step]);

  useEffect(() => {
    if (v !== 8) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v]);

  const pad = cell * 0.04;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { width: cell, height: cell, zIndex: m ? 1 : 2, transform: [{ translateX: x }, { translateY: y }, { scale }] }]}
    >
      <Animated.View style={v === 8 ? { transform: [{ rotate }] } : null}>
        <View style={{ padding: pad }}>
          <Planet tier={v} size={cell - pad * 2} skinId={skin} />
        </View>
      </Animated.View>
      {showNumber && v < 8 && v !== 9 && (
        <View style={[styles.badge, { right: cell * 0.02, bottom: cell * 0.02 }]}>
          <Text style={styles.badgeText}>{v}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, top: 0 },
  badge: {
    position: 'absolute', minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3,
    backgroundColor: 'rgba(6,8,20,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: FONTS.bodyBlack, lineHeight: 11 },
});

export default memo(Orb);
