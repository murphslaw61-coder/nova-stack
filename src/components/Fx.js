// Juice: particle bursts, floating score popups, shockwave rings (board space)
// plus full-screen flashes and big announcement banners (screen space).
// Each effect drives all of its pieces from ONE Animated.Value on the native
// driver, so even a 6-step cascade stays smooth.
import React, { forwardRef, memo, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../game/constants';

let nextFxId = 1;

function useFxList() {
  const [items, setItems] = useState([]);
  const add = useCallback((item) => {
    const id = nextFxId++;
    setItems((list) => (list.length > 40 ? [...list.slice(-30), { ...item, id }] : [...list, { ...item, id }]));
  }, []);
  const remove = useCallback((id) => setItems((list) => list.filter((i) => i.id !== id)), []);
  return [items, add, remove];
}

// ---------------------------------------------------------------------------
const Burst = memo(function Burst({ x, y, color, count = 12, power = 1, onDone }) {
  const t = useRef(new Animated.Value(0)).current;
  const parts = useRef(
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const d = (26 + Math.random() * 38) * power;
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, s: 3 + Math.random() * 4 * power, c: i % 3 === 0 ? '#FFFFFF' : color };
    })
  ).current;
  React.useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 560 + power * 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(onDone);
  }, []);
  return (
    <View style={[styles.abs, { left: x, top: y }]} pointerEvents="none">
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', width: p.s, height: p.s, borderRadius: p.s, backgroundColor: p.c,
            left: -p.s / 2, top: -p.s / 2,
            opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy + 10] }) },
              { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.3] }) },
            ],
          }}
        />
      ))}
    </View>
  );
});

const Popup = memo(function Popup({ x, y, text, color, big, onDone }) {
  const t = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: big ? 1100 : 850, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(onDone);
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.abs, {
        left: x - 80, top: y - 14, width: 160, alignItems: 'center',
        opacity: t.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, big ? -54 : -40] }) },
          { scale: t.interpolate({ inputRange: [0, 0.15, 0.3, 1], outputRange: [0.4, 1.25, 1, 0.95] }) },
        ],
      }]}
    >
      <Text style={[styles.popup, { color, fontSize: big ? 22 : 15 }]}>{text}</Text>
    </Animated.View>
  );
});

const Ring = memo(function Ring({ x, y, color, size = 160, onDone }) {
  const t = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(onDone);
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.abs, {
        left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2,
        borderWidth: 4, borderColor: color,
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }) }],
      }]}
    />
  );
});

export const BoardFx = forwardRef(function BoardFx(_, ref) {
  const [items, add, remove] = useFxList();
  useImperativeHandle(ref, () => ({
    burst: (x, y, color, count, power) => add({ kind: 'burst', x, y, color, count, power }),
    popup: (x, y, text, color, big) => add({ kind: 'popup', x, y, text, color, big }),
    ring: (x, y, color, size) => add({ kind: 'ring', x, y, color, size }),
  }), [add]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {items.map((it) => {
        const done = () => remove(it.id);
        if (it.kind === 'burst') return <Burst key={it.id} {...it} onDone={done} />;
        if (it.kind === 'popup') return <Popup key={it.id} {...it} onDone={done} />;
        return <Ring key={it.id} {...it} onDone={done} />;
      })}
    </View>
  );
});

// ---------------------------------------------------------------------------
const Banner = memo(function Banner({ text, sub, color, onDone }) {
  const t = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.sequence([
      Animated.spring(t, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.delay(550),
      Animated.timing(t, { toValue: 2, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.bannerWrap, {
        opacity: t.interpolate({ inputRange: [0, 0.4, 1, 2], outputRange: [0, 1, 1, 0] }),
        transform: [
          { scale: t.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1, 1.15] }) },
          { translateY: t.interpolate({ inputRange: [0, 1, 2], outputRange: [20, 0, -30] }) },
        ],
      }]}
    >
      <Text style={[styles.banner, { color, textShadowColor: color }]}>{text}</Text>
      {sub ? <Text style={styles.bannerSub}>{sub}</Text> : null}
    </Animated.View>
  );
});

const Flash = memo(function Flash({ color, strength = 0.55, onDone }) {
  const t = useRef(new Animated.Value(strength)).current;
  React.useEffect(() => {
    Animated.timing(t, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(onDone);
  }, []);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: t }]} />;
});

export const ScreenFx = forwardRef(function ScreenFx(_, ref) {
  const [items, add, remove] = useFxList();
  useImperativeHandle(ref, () => ({
    banner: (text, color = COLORS.gold, sub) => add({ kind: 'banner', text, color, sub }),
    flash: (color = '#FFFFFF', strength) => add({ kind: 'flash', color, strength }),
  }), [add]);
  // Only the newest banner is shown so stacked combos don't overlap.
  const lastBanner = [...items].reverse().find((i) => i.kind === 'banner');
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {items.map((it) => {
        const done = () => remove(it.id);
        if (it.kind === 'flash') return <Flash key={it.id} {...it} onDone={done} />;
        if (it !== lastBanner) return null;
        return <Banner key={it.id} {...it} onDone={done} />;
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  popup: {
    fontFamily: FONTS.display, letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  bannerWrap: { position: 'absolute', left: 0, right: 0, top: '36%', alignItems: 'center' },
  banner: { fontFamily: FONTS.display, fontSize: 38, letterSpacing: 2, textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  bannerSub: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.text, marginTop: 4, letterSpacing: 1 },
});
