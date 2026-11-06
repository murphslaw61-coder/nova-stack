// Web build (browser preview): no AdMob. Same API, no-ops.
import { useSyncExternalStore } from 'react';
const snap = { ready: false, canRequestAds: false, privacyOptionsRequired: false, rewardedReady: false };
export const useAdsStatus = () => useSyncExternalStore(() => () => {}, () => snap, () => snap);
export const bannerUnitId = () => null;
export const BannerModule = () => null;
export async function initAds() {}
export async function showPrivacyOptions() { return false; }
export async function maybeShowInterstitial() { return false; }
export async function showRewardedAd() { return { shown: false, earned: false }; }
export const adsSupported = () => false;
