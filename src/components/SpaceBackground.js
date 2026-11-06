// Deep-space backdrop: gradient, nebula clouds, twinkling stars and the odd
// shooting star. Everything animates on the native driver (opacity/transform).
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { COLORS } from '../game/constants';
import { mulberry32 } from '../game/engine';

const STAR_GROUPS = 3;

function SpaceBackground({ tint = COLORS.nebula, intensity = 1 }) {
  const { width, height } = useWindowDimensions();
  const twinkle = useRef(Array.from({ length: STAR_GROUPS }, () => new Animated.Value(0))).current;
  const drift = useRef(new Animated.Value(0)).current;
  const shoot = useRef(new Animated.Value(0)).current;

  const stars = useMemo(() => {
    const rng = mulberry32(7);
    return Array.from({ length: 90 }, (_, i) => ({
      x: rng() * width,
      y: rng() * height,
      s: rng() < 0.12 ? 2.4 : rng() < 0.45 ? 1.6 : 1,
      g: i % STAR_GROUPS,
      o: 0.35 + rng() * 0.65,
      c: rng() < 0.15 ? '#BFD4FF' : rng() < 0.25 ? '#FFE7C2' : '#FFFFFF',
    }));
  }, [width, height]);

  useEffect(() => {
    const loops = twinkle.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 700),
          Animated.timing(v, { toValue: 1, duration: 1800 + i * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 1800 + i * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      )
    );
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 22000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 22000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const shootLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(6500),
        Animated.timing(shoot, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(shoot, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loops.forEach((l) => l.start());
    driftLoop.start();
    shootLoop.start();
    return () => { loops.forEach((l) => l.stop()); driftLoop.stop(); shootLoop.stop(); };
  }, []);

  const nebulaShift = drift.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[COLORS.bg1, COLORS.bg0, '#070418']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: 0.9 * intensity, transform: [{ translateX: nebulaShift }] }]}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="neb1" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={tint} stopOpacity={0.45} />
              <Stop offset="1" stopColor={tint} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="neb2" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#2BB8FF" stopOpacity={0.28} />
              <Stop offset="1" stopColor="#2BB8FF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="neb3" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FF4FA8" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#FF4FA8" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={width * 0.15} cy={height * 0.22} rx={width * 0.75} ry={height * 0.22} fill="url(#neb1)" />
          <Ellipse cx={width * 0.95} cy={height * 0.55} rx={width * 0.7} ry={height * 0.25} fill="url(#neb2)" />
          <Ellipse cx={width * 0.3} cy={height * 0.92} rx={width * 0.8} ry={height * 0.2} fill="url(#neb3)" />
        </Svg>
      </Animated.View>
      {twinkle.map((v, g) => (
        <Animated.View
          key={g}
          style={[StyleSheet.absoluteFill, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }]}
        >
          {stars.filter((s) => s.g === g).map((s, i) => (
            <View key={i} style={{ position: 'absolute', left: s.x, top: s.y, width: s.s, height: s.s, borderRadius: s.s, backgroundColor: s.c, opacity: s.o }} />
          ))}
        </Animated.View>
      ))}
      <Animated.View
        style={{
          position: 'absolute', left: width * 0.55, top: height * 0.08, width: 90, height: 2, borderRadius: 2,
          backgroundColor: '#FFFFFF',
          opacity: shoot.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.9, 0.5, 0] }),
          transform: [
            { translateX: shoot.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.5] }) },
            { translateY: shoot.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.18] }) },
            { rotate: '-20deg' },
          ],
        }}
      />
    </View>
  );
}

export default memo(SpaceBackground);
