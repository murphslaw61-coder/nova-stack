// ============================================================================
//  RELEASE CONFIG — every account-specific value lives here (plus the AdMob
//  App IDs in app.json). Run `npm run preflight` before a store build: it
//  fails if anything below is still a placeholder.
// ============================================================================
import { Platform } from 'react-native';

export const CONFIG = {
  // RevenueCat → Project settings → API keys (public SDK keys, safe to ship).
  revenueCat: {
    iosApiKey: 'appl_qASzHriCSCvTDTcUuSojsQGbGbQ',
    androidApiKey: 'goog_REPLACE_ME',
    // RevenueCat Test Store key: real RevenueCat purchase flow (paywall,
    // entitlements, Customer Center) with no App Store / Play setup and no
    // charges. Used only in development builds; release builds always use the
    // platform keys above. Never ship it in a store build.
    testStoreApiKey: 'test_MXgAYhjPZAnlsDnLKzdJJYAvOQw',
  },

  // AdMob → Apps → Ad units. One of each format per platform.
  admob: {
    ios: {
      banner: 'ca-app-pub-3826443332909957/1907851643',
      interstitial: 'ca-app-pub-3826443332909957/4643193172',
      rewarded: 'ca-app-pub-3826443332909957/5183917524',
    },
    android: {
      banner: 'ca-app-pub-REPLACE_ME/ANDROID_BANNER',
      interstitial: 'ca-app-pub-REPLACE_ME/ANDROID_INTERSTITIAL',
      rewarded: 'ca-app-pub-REPLACE_ME/ANDROID_REWARDED',
    },
  },

  // Interstitial pacing. Interstitials only ever show between runs, never mid-game.
  ads: {
    interstitialEveryNRuns: 2,
    interstitialMinIntervalSec: 90,
    graceRunsForNewPlayers: 3, // no interstitials during a new player's first runs
  },

  links: {
    privacyPolicy: 'https://legendary-dolphin-c17f60.netlify.app/',
    termsOfUse: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
    support: 'mailto:murphslaw61@gmail.com',
    // Added to share text once the app is live (leave '' until then).
    storeUrl: Platform.select({ ios: '', android: '', default: '' }),
  },
};

export const isPlaceholder = (v) => !v || /REPLACE_ME/.test(v);
