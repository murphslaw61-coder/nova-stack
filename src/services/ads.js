// AdMob via react-native-google-mobile-ads.
//
// Startup order (required for EU/UK and Apple review):
//   1. Google UMP consent form (GDPR/TCF), when the player is in a region
//      that needs it. Configure the message in AdMob → Privacy & messaging.
//   2. App Tracking Transparency prompt (iOS).
//   3. Initialize the Mobile Ads SDK, then preload interstitial + rewarded.
//
// Every call is defensive: if the native module is missing (Expo Go, web) or
// ad loading fails, the game keeps running without ads and never blocks.
import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { CONFIG, isPlaceholder } from '../config';

let M = null;
try {
  M = require('react-native-google-mobile-ads');
} catch (e) {
  M = null; // Expo Go / unsupported runtime
}

const status = { ready: false, canRequestAds: false, privacyOptionsRequired: false, rewardedReady: false };
const listeners = new Set();
const emit = () => { snapshotCache = { ...status }; listeners.forEach((l) => l()); };
let snapshotCache = { ...status };
export function useAdsStatus() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => snapshotCache, () => snapshotCache);
}

function unitId(kind) {
  if (!M) return null;
  if (__DEV__) {
    return { banner: M.TestIds.ADAPTIVE_BANNER || M.TestIds.BANNER, interstitial: M.TestIds.INTERSTITIAL, rewarded: M.TestIds.REWARDED }[kind];
  }
  const ids = Platform.OS === 'ios' ? CONFIG.admob.ios : CONFIG.admob.android;
  const id = ids && ids[kind];
  return isPlaceholder(id) ? null : id;
}
export const bannerUnitId = () => unitId('banner');
export const BannerModule = () => M;

let initStarted = false;
export async function initAds() {
  if (!M || initStarted) return;
  initStarted = true;

  // 1. Consent (UMP)
  try {
    const info = await M.AdsConsent.gatherConsent();
    status.canRequestAds = !!info.canRequestAds;
    status.privacyOptionsRequired = info.privacyOptionsRequirementStatus === M.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  } catch (e) {
    // Network error etc. — fall back to the consent state from a previous session.
    try {
      const info = await M.AdsConsent.getConsentInfo();
      status.canRequestAds = !!info.canRequestAds;
      status.privacyOptionsRequired = info.privacyOptionsRequirementStatus === M.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
    } catch (e2) {
      status.canRequestAds = false;
    }
  }

  // 2. App Tracking Transparency (iOS only; resolves immediately elsewhere)
  if (Platform.OS === 'ios') {
    try {
      const ATT = require('expo-tracking-transparency');
      const { status: s } = await ATT.getTrackingPermissionsAsync();
      if (s === 'undetermined') await ATT.requestTrackingPermissionsAsync();
    } catch (e) {}
  }

  if (!status.canRequestAds) { emit(); return; }

  // 3. SDK init
  try {
    await M.default().setRequestConfiguration({
      maxAdContentRating: M.MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await M.default().initialize();
    status.ready = true;
    loadInterstitial();
    loadRewarded();
  } catch (e) {
    status.ready = false;
  }
  emit();
}

export async function showPrivacyOptions() {
  if (!M) return false;
  try {
    const info = await M.AdsConsent.showPrivacyOptionsForm();
    status.canRequestAds = !!info.canRequestAds;
    emit();
    return true;
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Interstitial — shown only between runs, paced by CONFIG.ads.
// ---------------------------------------------------------------------------
let interstitial = null;
let interstitialLoaded = false;
let interstitialRetry = 0;
let lastInterstitialAt = 0;
let runsSinceInterstitial = 0;

function loadInterstitial() {
  const id = unitId('interstitial');
  if (!M || !status.ready || !id) return;
  interstitialLoaded = false;
  interstitial = M.InterstitialAd.createForAdRequest(id);
  interstitial.addAdEventListener(M.AdEventType.LOADED, () => { interstitialLoaded = true; interstitialRetry = 0; });
  interstitial.addAdEventListener(M.AdEventType.ERROR, () => {
    interstitialLoaded = false;
    interstitialRetry++;
    setTimeout(loadInterstitial, Math.min(120000, 5000 * 2 ** interstitialRetry));
  });
  interstitial.load();
}

function showFullScreen(ad, { rewarded = false } = {}) {
  return new Promise((resolve) => {
    let earned = false;
    let opened = false;
    let done = false;
    const subs = [];
    const finish = (val) => {
      if (done) return;
      done = true;
      subs.forEach((u) => { try { u(); } catch (e) {} });
      resolve(val);
    };
    subs.push(ad.addAdEventListener(M.AdEventType.OPENED, () => { opened = true; }));
    subs.push(ad.addAdEventListener(M.AdEventType.CLOSED, () => finish(rewarded ? earned : true)));
    subs.push(ad.addAdEventListener(M.AdEventType.ERROR, () => finish(rewarded ? earned : false)));
    if (rewarded) subs.push(ad.addAdEventListener(M.RewardedAdEventType.EARNED_REWARD, () => { earned = true; }));
    // Never let a stuck ad freeze the game.
    setTimeout(() => { if (!opened) finish(false); }, 4000);
    ad.show().catch(() => finish(false));
  });
}

// Call at a natural break (after a run ends, when the player taps to move on).
export async function maybeShowInterstitial({ adsRemoved, runsCompleted }) {
  runsSinceInterstitial++;
  if (adsRemoved || !M || !status.ready) return false;
  const cfg = CONFIG.ads;
  if (runsCompleted < cfg.graceRunsForNewPlayers) return false;
  if (runsSinceInterstitial < cfg.interstitialEveryNRuns) return false;
  if (Date.now() - lastInterstitialAt < cfg.interstitialMinIntervalSec * 1000) return false;
  if (!interstitialLoaded || !interstitial) return false;
  const shown = await showFullScreen(interstitial);
  interstitialLoaded = false;
  loadInterstitial();
  if (shown) {
    lastInterstitialAt = Date.now();
    runsSinceInterstitial = 0;
  }
  return shown;
}

// ---------------------------------------------------------------------------
// Rewarded — optional, player-initiated (free power-ups, second chance).
// ---------------------------------------------------------------------------
let rewarded = null;
let rewardedRetry = 0;

function loadRewarded() {
  const id = unitId('rewarded');
  if (!M || !status.ready || !id) return;
  status.rewardedReady = false;
  emit();
  rewarded = M.RewardedAd.createForAdRequest(id);
  rewarded.addAdEventListener(M.RewardedAdEventType.LOADED, () => { status.rewardedReady = true; rewardedRetry = 0; emit(); });
  rewarded.addAdEventListener(M.AdEventType.ERROR, () => {
    status.rewardedReady = false;
    emit();
    rewardedRetry++;
    setTimeout(loadRewarded, Math.min(120000, 5000 * 2 ** rewardedRetry));
  });
  rewarded.load();
}

// Resolves { shown, earned }. Only grant rewards when earned === true.
export async function showRewardedAd() {
  if (!M || !status.ready || !status.rewardedReady || !rewarded) return { shown: false, earned: false };
  status.rewardedReady = false;
  emit();
  const earned = await showFullScreen(rewarded, { rewarded: true });
  loadRewarded();
  return { shown: true, earned };
}

export const adsSupported = () => !!M;
