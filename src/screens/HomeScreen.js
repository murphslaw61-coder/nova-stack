import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Planet from '../components/Planet';
import AdBanner from '../components/AdBanner';
import { Button, IconButton, T, formatScore } from '../components/ui';
import { COLORS, FONTS, MODE_META } from '../game/constants';
import { ACHIEVEMENTS } from '../game/achievements';
import { dateKey, weeklyModifierFor } from '../game/engine';
import { useProfile } from '../services/profile';
import { haptic } from '../services/haptics';
import { sfx } from '../services/audio';

function Hero({ skin }) {
  const float = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const f = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const o = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    f.start(); o.start();
    return () => { f.stop(); o.stop(); };
  }, []);
  const ty = float.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });
  const rot = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const counter = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  return (
    <View style={styles.hero}>
      <Animated.View style={{ transform: [{ translateY: ty }] }}>
        <Planet tier={7} size={150} skinId={skin} />
      </Animated.View>
      <Animated.View style={[styles.orbit, { transform: [{ rotate: rot }] }]}>
        <Animated.View style={{ position: 'absolute', left: -4, top: 70, transform: [{ rotate: counter }] }}>
          <Planet tier={2} size={26} skinId={skin} />
        </Animated.View>
        <Animated.View style={{ position: 'absolute', right: -2, top: 60, transform: [{ rotate: counter }] }}>
          <Planet tier={5} size={34} skinId={skin} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export default function HomeScreen({ savedRun, onPlay, onShop, onSettings, onAchievements, onPuzzles }) {
  const insets = useSafeAreaInsets();
  const p = useProfile();
  const today = dateKey();
  const playedToday = p.lastDailyDate === today;
  const weekly = weeklyModifierFor();
  const achDone = ACHIEVEMENTS.filter((a) => p.achievements[a.id]).length;
  const intro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  const rise = (i) => ({
    opacity: intro,
    transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [20 + i * 10, 0] }) }],
  });

  const pick = (key) => {
    if (key === 'puzzle') onPuzzles();
    else onPlay({ mode: key });
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.topRow}>
        <View style={styles.streak}>
          <Text style={{ fontSize: 15 }}>🔥</Text>
          <Text style={styles.streakText}>{p.streak}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="★" label="Achievements" color={COLORS.gold} onPress={onAchievements} />
          <IconButton icon="✦" label="Shop" color={COLORS.violet} onPress={onShop} />
          <IconButton icon="⚙" label="Settings" onPress={onSettings} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Hero skin={p.skin} />
        <Animated.View style={rise(0)}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>NOVA STACK</Text>
          <Text style={styles.tagline}>MERGE THE COSMOS · MIND THE GRAVITY</Text>
        </Animated.View>

        <Animated.View style={[{ marginTop: 18, gap: 10 }, rise(1)]}>
          {savedRun ? (
            <>
              <Button label="CONTINUE RUN" icon="▶" sub={`${savedRun.modeName} · ${formatScore(savedRun.score)} pts`} onPress={() => onPlay({ mode: savedRun.mode, resume: true })} />
              <Button label="NEW GAME" small colors={['#3B4AA8', '#2A3480']} textColor={COLORS.text} onPress={() => onPlay({ mode: 'endless' })} />
            </>
          ) : (
            <Button label="PLAY" icon="▶" sub={p.bests.endless ? `Best ${formatScore(p.bests.endless)}` : 'Endless mode'} onPress={() => onPlay({ mode: 'endless' })} />
          )}
        </Animated.View>

        <Animated.View style={rise(2)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play the daily challenge"
            onPress={() => { sfx.tap(); haptic.tap(); onPlay({ mode: 'daily' }); }}
            style={({ pressed }) => [{ marginTop: 14 }, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient colors={['rgba(255,207,90,0.22)', 'rgba(255,122,61,0.12)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.daily}>
              <View style={{ flex: 1 }}>
                <T kind="label" style={{ color: COLORS.gold }}>Daily challenge · {today}</T>
                <Text style={styles.dailyTitle}>{playedToday ? 'Beat your score' : 'Today’s board is live'}</Text>
                <T kind="dim">{playedToday ? `Today’s best: ${formatScore(p.bests.daily || 0)}` : `Keep your 🔥 ${p.streak}-day streak · free power-ups`}</T>
              </View>
              <Planet tier={8} size={56} skinId={p.skin} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.grid, rise(3)]}>
          {MODE_META.filter((m) => m.key !== 'daily').map((m) => {
            const sub = m.key === 'weekly' ? weekly.name
              : m.key === 'puzzle' ? `★ ${Object.values(p.puzzleStars).reduce((a, b) => a + b, 0)}/90`
              : p.bests[m.key] ? `Best ${formatScore(p.bests[m.key])}` : m.desc.split('.')[0];
            return (
              <Pressable
                key={m.key}
                accessibilityRole="button"
                accessibilityLabel={`${m.name}. ${m.desc}`}
                onPress={() => { sfx.tap(); haptic.tap(); pick(m.key); }}
                style={({ pressed }) => [styles.modeCard, { borderColor: m.color + '55' }, pressed && { transform: [{ scale: 0.96 }] }]}
              >
                <Text style={[styles.modeIcon, { color: m.color, textShadowColor: m.color }]}>{m.icon}</Text>
                <Text style={styles.modeName}>{m.name}</Text>
                <Text style={styles.modeSub} numberOfLines={1}>{sub}</Text>
              </Pressable>
            );
          })}
        </Animated.View>
      </ScrollView>
      {!p.adsRemoved && <View style={{ paddingBottom: insets.bottom }}><AdBanner /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 14, borderRadius: 14, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.stroke },
  streakText: { color: COLORS.text, fontFamily: FONTS.display, fontSize: 15 },
  hero: { height: 190, alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', width: 230, height: 170 },
  title: {
    fontFamily: FONTS.display, fontSize: 36, color: COLORS.text, textAlign: 'center', letterSpacing: 4,
    textShadowColor: COLORS.nebula, textShadowRadius: 22, textShadowOffset: { width: 0, height: 0 },
  },
  tagline: { fontFamily: FONTS.bodyBold, color: COLORS.cyan, textAlign: 'center', fontSize: 11.5, letterSpacing: 3, marginTop: 4 },
  daily: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,207,90,0.4)' },
  dailyTitle: { fontFamily: FONTS.displayMid, color: COLORS.text, fontSize: 16, marginVertical: 3, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  modeCard: { width: '48%', flexGrow: 1, padding: 14, borderRadius: 18, backgroundColor: COLORS.panel, borderWidth: 1 },
  modeIcon: { fontSize: 24, fontFamily: FONTS.bodyBlack, textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } },
  modeName: { fontFamily: FONTS.displayMid, color: COLORS.text, fontSize: 14.5, marginTop: 6, letterSpacing: 0.8 },
  modeSub: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 11.5, marginTop: 2 },
});
