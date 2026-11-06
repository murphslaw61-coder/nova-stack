// Persistent player profile: a tiny external store (useSyncExternalStore) so
// every screen reads the same, always-current data and saves are debounced.
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'nova_stack_profile_v2';
const LEGACY_KEY = 'nova_stack_save_v1';
const RUN_KEY = 'nova_stack_run_v1';

export const DEFAULT_PROFILE = {
  version: 2,
  bests: {},
  streak: 0,
  lastDailyDate: null,
  lastDailyRewardDate: null,
  powerups: { bomb: 2, shuffle: 2, lock: 1, flip: 1 },
  adsRemoved: false,
  starterBundleOwned: false,
  ownedSkins: ['cosmic'],
  skin: 'cosmic',
  puzzleStars: {},
  achievements: {},
  stats: { games: 0, merges: 0, supernovas: 0, blasts: 0, highestTier: 0, bestCombo: 0, totalScore: 0, darkCleared: 0 },
  settings: { sound: true, music: true, haptics: true, tierNumbers: true },
  tutorialDone: false,
  runsCompleted: 0,
  lastMode: 'endless',
};

let profile = DEFAULT_PROFILE;
let loaded = false;
const listeners = new Set();
let saveTimer = null;

function emit() {
  for (const l of listeners) l();
}
function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export const getProfile = () => profile;
export const isProfileLoaded = () => loaded;

export function useProfile() {
  return useSyncExternalStore(subscribe, getProfile, getProfile);
}

export function updateProfile(fn) {
  const next = typeof fn === 'function' ? fn(profile) : { ...profile, ...fn };
  if (next === profile) return;
  profile = next;
  emit();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushProfile, 400);
}

export async function flushProfile() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  } catch (e) {
    // Storage failure must never crash the game.
  }
}

function merge(base, saved) {
  return {
    ...base,
    ...saved,
    powerups: { ...base.powerups, ...(saved.powerups || {}) },
    stats: { ...base.stats, ...(saved.stats || {}) },
    settings: { ...base.settings, ...(saved.settings || {}) },
    bests: { ...(saved.bests || {}) },
    ownedSkins: Array.from(new Set([...(base.ownedSkins || []), ...(saved.ownedSkins || [])])),
  };
}

export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      profile = merge(DEFAULT_PROFILE, JSON.parse(raw));
    } else {
      // Migrate the 1.0 prototype save so early testers keep purchases.
      const legacy = await AsyncStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const old = JSON.parse(legacy);
        profile = merge(DEFAULT_PROFILE, {
          streak: old.streak || 0,
          lastDailyDate: old.lastPlayedDate || null,
          powerups: old.powerups || undefined,
          adsRemoved: !!old.adsRemoved,
          ownedSkins: old.skinOwned ? ['cosmic', 'golden'] : ['cosmic'],
          tutorialDone: true,
        });
      }
    }
  } catch (e) {
    profile = DEFAULT_PROFILE;
  }
  loaded = true;
  emit();
  return profile;
}

AppState.addEventListener('change', (s) => {
  if (s !== 'active') flushProfile();
});

// ---- helpers used across the app ----
export function grantItems(items) {
  updateProfile((p) => {
    const powerups = { ...p.powerups };
    for (const [k, n] of Object.entries(items || {})) powerups[k] = (powerups[k] || 0) + n;
    return { ...p, powerups };
  });
}
export function consumePowerup(kind) {
  if ((profile.powerups[kind] || 0) <= 0) return false;
  updateProfile((p) => ({ ...p, powerups: { ...p.powerups, [kind]: p.powerups[kind] - 1 } }));
  return true;
}
export function setSetting(key, value) {
  updateProfile((p) => ({ ...p, settings: { ...p.settings, [key]: value } }));
}

// ---- in-progress run (resume after the app is closed) ----
export async function saveRun(json) {
  try {
    if (json) await AsyncStorage.setItem(RUN_KEY, json);
    else await AsyncStorage.removeItem(RUN_KEY);
  } catch (e) {}
}
export async function loadRun() {
  try {
    return await AsyncStorage.getItem(RUN_KEY);
  } catch (e) {
    return null;
  }
}
