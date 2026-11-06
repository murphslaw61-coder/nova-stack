import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Sheet, T, Toggle, GhostButton, Button } from './ui';
import Planet from './Planet';
import { COLORS, FONTS, TIER_NAMES, POWERUPS } from '../game/constants';
import { ACHIEVEMENTS } from '../game/achievements';
import PUZZLES from '../game/puzzles.json';
import { useProfile, setSetting } from '../services/profile';
import { showPrivacyOptions, useAdsStatus } from '../services/ads';
import { restorePurchases } from '../services/iap';
import { setSoundEnabled, setMusicEnabled } from '../services/audio';
import { setHapticsEnabled } from '../services/haptics';
import { CONFIG, isPlaceholder } from '../config';

// ---------------------------------------------------------------------------
export function SettingsSheet({ visible, onClose, onHowTo, toast }) {
  const p = useProfile();
  const ads = useAdsStatus();
  const s = p.settings;
  const version = Constants.expoConfig?.version || '1.0.0';
  return (
    <Sheet visible={visible} onClose={onClose} title="Settings">
      <Toggle label="Sound effects" value={s.sound} onChange={(v) => { setSetting('sound', v); setSoundEnabled(v); }} />
      <Toggle label="Music" value={s.music} onChange={(v) => { setSetting('music', v); setMusicEnabled(v); }} />
      <Toggle label="Vibration" value={s.haptics} onChange={(v) => { setSetting('haptics', v); setHapticsEnabled(v); }} />
      <Toggle label="Show tier numbers on planets" value={s.tierNumbers} onChange={(v) => setSetting('tierNumbers', v)} />
      <View style={{ gap: 8, marginTop: 16 }}>
        <GhostButton label="How to play" icon="?" onPress={onHowTo} />
        <GhostButton label="Restore purchases" icon="↺" onPress={async () => { const r = await restorePurchases(); toast(r.success ? 'Purchases restored' : r.error); }} />
        {ads.privacyOptionsRequired && <GhostButton label="Privacy & ad choices" icon="⚙" onPress={showPrivacyOptions} />}
        {!isPlaceholder(CONFIG.links.privacyPolicy) && (
          <GhostButton label="Privacy policy" icon="§" onPress={() => Linking.openURL(CONFIG.links.privacyPolicy)} />
        )}
        {!isPlaceholder(CONFIG.links.support) && (
          <GhostButton label="Contact support" icon="✉" onPress={() => Linking.openURL(CONFIG.links.support)} />
        )}
      </View>
      <T kind="dim" style={{ textAlign: 'center', marginTop: 16 }}>Nova Stack v{version}</T>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
const rewardText = (r) => Object.entries(r).map(([k, n]) => `+${n} ${POWERUPS.find((x) => x.key === k).name}`).join('  ');

export function AchievementsSheet({ visible, onClose }) {
  const p = useProfile();
  const done = ACHIEVEMENTS.filter((a) => p.achievements[a.id]).length;
  return (
    <Sheet visible={visible} onClose={onClose} title={`Achievements  ${done}/${ACHIEVEMENTS.length}`}>
      <View style={styles.statsGrid}>
        <Stat label="Runs" value={p.stats.games} />
        <Stat label="Merges" value={p.stats.merges} />
        <Stat label="Best combo" value={`×${p.stats.bestCombo}`} />
        <Stat label="Supernovas" value={p.stats.supernovas} />
      </View>
      {ACHIEVEMENTS.map((a) => {
        const got = !!p.achievements[a.id];
        return (
          <View key={a.id} style={[styles.ach, got && { borderColor: 'rgba(255,207,90,0.45)' }]}>
            <Text style={[styles.achIcon, { color: got ? COLORS.gold : COLORS.textFaint }]}>{got ? '★' : '☆'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.achName, !got && { color: COLORS.textDim }]}>{a.name}</Text>
              <Text style={styles.achDesc}>{a.desc}</Text>
            </View>
            <Text style={[styles.achReward, got && { color: COLORS.green }]}>{got ? 'Claimed' : rewardText(a.reward)}</Text>
          </View>
        );
      })}
    </Sheet>
  );
}
function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <T kind="label" style={{ fontSize: 9 }}>{label}</T>
    </View>
  );
}

// ---------------------------------------------------------------------------
export function PuzzleSheet({ visible, onClose, onPick }) {
  const p = useProfile();
  const totalStars = Object.values(p.puzzleStars).reduce((a, b) => a + b, 0);
  // A level unlocks once the previous one is solved (first 3 always open).
  const unlocked = (i) => i < 3 || !!p.puzzleStars[PUZZLES[i - 1].id];
  return (
    <Sheet visible={visible} onClose={onClose} title={`Puzzles  ★ ${totalStars}/${PUZZLES.length * 3}`}>
      <View style={styles.levels}>
        {PUZZLES.map((pz, i) => {
          const stars = p.puzzleStars[pz.id] || 0;
          const open = unlocked(i);
          return (
            <Pressable
              key={pz.id}
              accessibilityRole="button"
              accessibilityLabel={open ? `Puzzle ${pz.id}, ${pz.name}, ${stars} stars` : `Puzzle ${pz.id}, locked`}
              disabled={!open}
              onPress={() => onPick(pz)}
              style={({ pressed }) => [styles.level, stars > 0 && styles.levelDone, !open && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.94 }] }]}
            >
              <Text style={styles.levelNum}>{open ? pz.id : '🔒'}</Text>
              <View style={{ position: 'absolute', top: 4, right: 4 }}><Planet tier={pz.target} size={18} /></View>
              <Text style={styles.levelStars}>{'★'.repeat(stars)}<Text style={{ color: COLORS.textFaint }}>{'★'.repeat(3 - stars)}</Text></Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
const STEPS = [
  { title: 'Drop & merge', body: 'Tap a column to drop the next orb. Two or more touching orbs of the same planet merge into the next one.', tiers: [1, 1, 2] },
  { title: 'Grow the cosmos', body: 'Asteroid → Moon → Mercury → Mars → Earth → Neptune → Saturn → Supernova. Clusters of 4+ jump TWO tiers.', tiers: [4, 5, 6, 7] },
  { title: 'Gravity flips!', body: 'Every few drops gravity flips and everything falls the other way. Watch the meter and plan for it. Merges right after a flip score bonus points.', tiers: [6] },
  { title: 'Big Bang', body: 'Make a Supernova, then collide two of them. They detonate and clear everything around them for a huge score.', tiers: [8, 8] },
  { title: 'Meteor showers', body: 'Later on, Dark Matter rains down. It never merges, but any merge right next to it shatters it.', tiers: [9, 9] },
  { title: "Don't overflow", body: 'New orbs enter from the glowing edge. If any column fills all the way up, the run is over. Red columns are close!', tiers: [] },
];

export function HowToSheet({ visible, onClose }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <Sheet visible={visible} onClose={() => { setI(0); onClose(); }} title="How to play" scroll={false}>
      <View style={styles.howArt}>
        {step.tiers.length ? step.tiers.map((t, k) => <Planet key={k} tier={t} size={step.tiers.length > 2 ? 58 : 76} />) : (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 40, color: COLORS.coral }}>▼▼▼</Text>
            <T kind="label">Spawn edge</T>
          </View>
        )}
      </View>
      {i === 1 && (
        <Text style={styles.tierLine}>{TIER_NAMES.slice(1).join(' → ')}</Text>
      )}
      <T kind="title" style={{ textAlign: 'center', marginBottom: 8 }}>{step.title}</T>
      <T style={{ textAlign: 'center', color: COLORS.textDim, lineHeight: 21, minHeight: 64 }}>{step.body}</T>
      <View style={styles.dots}>
        {STEPS.map((_, k) => <View key={k} style={[styles.dot, k === i && { backgroundColor: COLORS.cyan, width: 18 }]} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {i > 0 && <GhostButton label="Back" onPress={() => setI(i - 1)} style={{ flex: 1 }} />}
        <Button label={last ? "LET'S GO" : 'NEXT'} onPress={() => (last ? (setI(0), onClose()) : setI(i + 1))} style={{ flex: 2 }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.stroke },
  statValue: { fontFamily: FONTS.display, color: COLORS.text, fontSize: 16 },
  ach: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, marginBottom: 7, backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: COLORS.stroke },
  achIcon: { fontSize: 22 },
  achName: { fontFamily: FONTS.bodyBlack, color: COLORS.text, fontSize: 14 },
  achDesc: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 12, marginTop: 1 },
  achReward: { fontFamily: FONTS.bodyBold, color: COLORS.textDim, fontSize: 10.5, maxWidth: 110, textAlign: 'right' },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  level: { width: '18%', aspectRatio: 0.9, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.stroke },
  levelDone: { borderColor: 'rgba(92,255,176,0.4)', backgroundColor: 'rgba(92,255,176,0.07)' },
  levelNum: { fontFamily: FONTS.display, color: COLORS.text, fontSize: 18 },
  levelStars: { color: COLORS.gold, fontSize: 10, marginTop: 4, letterSpacing: 1 },
  howArt: { height: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 },
  tierLine: { fontFamily: FONTS.bodyBold, color: COLORS.violet, fontSize: 11, textAlign: 'center', marginBottom: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
});
