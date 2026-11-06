// ============================================================================
//  RELEASE CONFIG — every account-specific value lives here (plus the AdMob
//  App IDs in app.json). Run `npm run preflight` before a store build: it
//  fails if anything below is still a placeholder.
// ============================================================================
import { Platform } from 'react-native';

export const CONFIG = {
  // RevenueCat → Project settings → API keys (public SDK keys, safe to ship).
  revenueCat: {
    iosApiKey: 'appl_REPLACE_ME',
    androidApiKey: 'goog_REPLACE_ME',
  },

  // AdMob → Apps → Ad units. One of each format per platform.
  admob: {
    ios: {
      banner: 'ca-app-pub-REPLACE_ME/IOS_BANNER',
      interstitial: 'ca-app-pub-REPLACE_ME/IOS_INTERSTITIAL',
      rewarded: 'ca-app-pub-REPLACE_ME/IOS_REWARDED',
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
    privacyPolicy: 'https://REPLACE_ME/nova-stack/privacy',
    termsOfUse: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
    support: 'mailto:REPLACE_ME@example.com',
    // Added to share text once the app is live (leave '' until then).
    storeUrl: Platform.select({ ios: '', android: '', default: '' }),
  },
};

export const isPlaceholder = (v) => !v || /REPLACE_ME/.test(v);
