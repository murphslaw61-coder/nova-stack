# Releasing Nova Stack

Work top to bottom. `npm run preflight` checks the config steps for you.

## 0. Accounts you need
- Apple Developer Program ($99/yr) and Google Play Console ($25 one-time)
- Expo account (free): `npm i -g eas-cli && eas login`
- RevenueCat (free tier is fine) and Google AdMob

## 1. App identity
1. In `app.json`, set `ios.bundleIdentifier` and `android.package` (e.g. `com.yourstudio.novastack`). **You can't change these after the first store upload.**
2. Run `eas init` to fill in `extra.eas.projectId`.
3. Create the app in App Store Connect and in Play Console with the same identifiers.

## 2. In-app purchases (store side)
Create these products. IDs must match `src/game/products.js` exactly:

| Product ID | Type (Apple / Google) | Suggested price |
|---|---|---|
| `nova_stack_starter_bundle` | Non-Consumable / One-time product | $4.99 |
| `nova_stack_remove_ads` | Non-Consumable / One-time product | $3.99 |
| `nova_stack_powerup_pack` | Consumable / One-time product (consumable) | $1.99 |
| `nova_stack_mega_pack` | Consumable / One-time product (consumable) | $5.99 |
| `nova_stack_skin_golden` | Non-Consumable / One-time product | $1.99 |
| `nova_stack_skin_neon` | Non-Consumable / One-time product | $1.99 |

Prices shown in the app always come from the store (localized), so change them freely.

## 3. RevenueCat
1. Create a project and add an **App Store** app and a **Play Store** app (follow RevenueCat's guide to connect App Store Connect API and the Play service account).
2. **Products:** import all six products for both platforms.
3. **Entitlements:** create exactly these three identifiers:
   - `remove_ads` → attach `nova_stack_remove_ads` **and** `nova_stack_starter_bundle`
   - `skin_golden` → attach `nova_stack_skin_golden`
   - `skin_neon` → attach `nova_stack_skin_neon`
4. **Offerings:** make a `default` offering marked *current*, with one package per product (custom package identifiers are fine). Products not in an offering still work through a fallback, but offerings let you run price experiments.
5. **API keys:** copy the public SDK keys (`appl_…`, `goog_…`) into `src/config.js → revenueCat`.

## 4. AdMob
1. Create **two apps** (iOS and Android). Put their App IDs (`ca-app-pub-…~…`) into `app.json` under the `react-native-google-mobile-ads` plugin, replacing Google's sample IDs.
2. Create three ad units per app (**Banner**, **Interstitial**, **Rewarded**) and paste the six unit IDs into `src/config.js → admob`.
3. **Privacy & messaging:** create a **GDPR (European regulations)** message for both apps, and an **IDFA explainer** message for iOS. The app calls Google UMP on launch and shows them automatically. A "Privacy & ad choices" button appears in Settings wherever the law requires one.
4. Add `app-ads.txt` to your developer website (AdMob → Apps → app-ads.txt).
5. Don't tap your own live ads. Dev builds use test ads automatically. For a production build on your own phone, add it as a test device in AdMob.

Ad pacing lives in `src/config.js → ads`. By default interstitials only show between runs, at most every 2nd run and 90 s apart, never in a player's first 3 runs, and never after Remove Ads. Rewarded videos are always opt-in: free power-ups, a second chance, puzzle hints, and the shop's daily freebies.

## 5. Links
In `src/config.js → links`, set:
- `privacyPolicy`: publish `docs/privacy-policy.md` (fill in the brackets) at a public URL
- `support`: a `mailto:` or web URL
- `storeUrl`: added to share messages once the app is live

## 6. Preflight + build
```bash
npm test
npm run preflight          # must print "All set"
npm run build:ios          # eas build --platform ios --profile production
npm run build:android
```

## 7. Test the release candidate (TestFlight / Play internal testing)
- [ ] Buy each product with a sandbox / license-tester account; consumables add items, and Remove Ads hides the banner and stops interstitials
- [ ] Delete and reinstall → **Restore Purchases** brings back Remove Ads and skins
- [ ] Rewarded: free power-up, Second Chance, and Hint grant only after the video completes
- [ ] EU test: AdMob → Privacy & messaging → test devices, set the debug geography to EEA, and confirm the consent form shows
- [ ] iOS: ATT prompt appears once, after the consent form
- [ ] Play a Daily run on two consecutive days: the streak goes 1 → 2 and the daily reward is granted once per day
- [ ] Close the app mid-Endless-run, reopen, and Continue Run works
- [ ] VoiceOver / TalkBack: columns, power-ups and shop buttons are announced

## 8. Store listing
- Copy text from `docs/app-store-listing.md`.
- Fill **App Privacy** (Apple) and **Data safety** (Google) from `docs/data-safety-mapping.md`.
- Age rating: no objectionable content, but declare **ads** and **in-app purchases**.
- Screenshots: run on a simulator and capture what `docs/app-store-listing.md` lists.
- **App Review notes (Apple):** "No login required. IAPs are in Shop (✦ icon). Restore Purchases is at the bottom of the Shop and in Settings."
