import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// Import only the weights we use, so the other font files aren't bundled.
const FONT_FILES = {
  Orbitron_600SemiBold: require('@expo-google-fonts/orbitron/600SemiBold/Orbitron_600SemiBold.ttf'),
  Orbitron_800ExtraBold: require('@expo-google-fonts/orbitron/800ExtraBold/Orbitron_800ExtraBold.ttf'),
  Exo2_500Medium: require('@expo-google-fonts/exo-2/500Medium/Exo2_500Medium.ttf'),
  Exo2_700Bold: require('@expo-google-fonts/exo-2/700Bold/Exo2_700Bold.ttf'),
  Exo2_800ExtraBold: require('@expo-google-fonts/exo-2/800ExtraBold/Exo2_800ExtraBold.ttf'),
};

import SpaceBackground from './src/components/SpaceBackground';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import ShopSheet from './src/components/ShopSheet';
import { SettingsSheet, AchievementsSheet, PuzzleSheet, HowToSheet } from './src/components/Sheets';
import { COLORS, FONTS, modeMeta } from './src/game/constants';
import { deserializeRun } from './src/game/engine';
import { loadProfile, getProfile, updateProfile, useProfile, loadRun } from './src/services/profile';
import { initAudio, startMusic } from './src/services/audio';
import { setHapticsEnabled } from './src/services/haptics';
import { initAds } from './src/services/ads';
import { configurePurchases, syncEntitlements } from './src/services/iap';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Toast({ msg, nonce }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!msg) return;
    a.setValue(0);
    Animated.sequence([
      Animated.spring(a, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      Animated.delay(1900),
      Animated.timing(a, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [nonce]);
  if (!msg) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}
    >
      <Text style={styles.toastText}>{msg}</Text>
    </Animated.View>
  );
}

function Root() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState('home');
  const [launch, setLaunch] = useState(null);
  const [savedRun, setSavedRun] = useState(null);
  const [sheet, setSheet] = useState(null); // 'shop' | 'settings' | 'ach' | 'puzzles' | 'howto'
  const [toastState, setToastState] = useState({ msg: '', nonce: 0 });
  const profile = useProfile();
  const pendingLaunch = useRef(null);

  const toast = useCallback((msg) => setToastState((t) => ({ msg, nonce: t.nonce + 1 })), []);

  const refreshSavedRun = useCallback(async () => {
    const json = await loadRun();
    const st = json ? deserializeRun(json) : null;
    setSavedRun(st && !st.gameOver ? { mode: st.mode, modeName: modeMeta(st.mode).name, score: st.score, state: st } : null);
  }, []);

  useEffect(() => {
    (async () => {
      const p = await loadProfile();
      setHapticsEnabled(p.settings.haptics);
      await refreshSavedRun();
      setReady(true);
      initAudio({ sound: p.settings.sound, music: p.settings.music }).then(startMusic);
      configurePurchases();
      // Consent → ATT → AdMob init happens after first paint so launch stays fast.
      setTimeout(() => {
        initAds();
        syncEntitlements();
      }, 600);
    })();
  }, []);

  const play = useCallback((l) => {
    let next = l;
    if (l.resume && savedRun) next = { mode: savedRun.mode, resume: savedRun.state };
    if (!getProfile().tutorialDone) {
      pendingLaunch.current = next;
      setSheet('howto');
      return;
    }
    setLaunch({ ...next, key: Date.now() });
    setScreen('game');
  }, [savedRun]);

  const goHome = useCallback(() => {
    setScreen('home');
    refreshSavedRun();
  }, [refreshSavedRun]);

  const closeHowTo = () => {
    setSheet(null);
    if (!getProfile().tutorialDone) updateProfile((p) => ({ ...p, tutorialDone: true }));
    if (pendingLaunch.current) {
      const l = pendingLaunch.current;
      pendingLaunch.current = null;
      setLaunch({ ...l, key: Date.now() });
      setScreen('game');
    }
  };

  if (!ready) return null;

  return (
    <View style={styles.root} onLayout={() => SplashScreen.hideAsync().catch(() => {})}>
      <SpaceBackground />
      {screen === 'home' ? (
        <HomeScreen
          savedRun={savedRun}
          onPlay={play}
          onShop={() => setSheet('shop')}
          onSettings={() => setSheet('settings')}
          onAchievements={() => setSheet('ach')}
          onPuzzles={() => setSheet('puzzles')}
        />
      ) : (
        <GameScreen key={launch.key} launch={launch} onHome={goHome} onOpenShop={() => setSheet('shop')} toast={toast} />
      )}

      <ShopSheet visible={sheet === 'shop'} onClose={() => setSheet(null)} toast={toast} />
      <SettingsSheet visible={sheet === 'settings'} onClose={() => setSheet(null)} onHowTo={() => setSheet('howto')} toast={toast} />
      <AchievementsSheet visible={sheet === 'ach'} onClose={() => setSheet(null)} />
      <PuzzleSheet visible={sheet === 'puzzles'} onClose={() => setSheet(null)} onPick={(pz) => { setSheet(null); play({ mode: 'puzzle', puzzle: pz }); }} />
      <HowToSheet visible={sheet === 'howto'} onClose={closeHowTo} />

      <Toast msg={toastState.msg} nonce={toastState.nonce} />
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(FONT_FILES);
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg0 },
  toast: {
    position: 'absolute', bottom: 150, alignSelf: 'center', maxWidth: '88%',
    backgroundColor: 'rgba(16,20,52,0.96)', borderWidth: 1, borderColor: COLORS.strokeHi, borderRadius: 14,
    paddingVertical: 11, paddingHorizontal: 16,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  toastText: { color: COLORS.text, fontFamily: FONTS.bodyBold, fontSize: 13.5, textAlign: 'center' },
});
