# Nova Stack

A cosmic merge puzzler for iOS and Android, built with Expo SDK 58 / React Native.
Drop planets, merge matching ones into bigger ones (Asteroid → … → Saturn →
Supernova), survive gravity flips and meteor showers, and collide two
Supernovas for a Big Bang.

Monetization: **RevenueCat** in-app purchases + **Google AdMob** (banner,
interstitial, rewarded), with Google UMP consent and Apple ATT built in.

> Shipping it? Follow **[RELEASE.md](RELEASE.md)**. `npm run preflight` lists what's left.

## Run it

```bash
npm install
npm test                 # engine + 30 puzzle-solution replays
npx expo start --web     # quick look in a browser (no ads / IAP on web)
```

AdMob and RevenueCat are native modules, so **Expo Go can't load them**. To play on a phone:

```bash
npx eas build --profile development --platform ios   # or android (one-time)
npm start                                             # then open the dev build
```

Dev builds use Google's official **test ads**. Until you add RevenueCat keys, a
**simulated store** lets you exercise every purchase. Both of these only happen in
`__DEV__`; release builds never simulate.

## What's in the game

| | |
|---|---|
| **Modes** | Endless · Daily (same board for everyone, streaks + daily reward) · Weekly (5 rotating rule twists) · 30 Puzzles (3-star ratings, hints) · Zen · Extreme |
| **Core rules** | Clusters of 2+ matching planets merge up one tier; clusters of 4+ jump two tiers. Gravity flips every few drops, and merges right after a flip score a bonus. Any column filled to the spawn edge ends the run. |
| **Late game** | Spawns ramp up over a run. From drop 40, meteor showers drop **Dark Matter**, which never merges and is shattered by merging next to it. Showers get faster and heavier over time. |
| **Power-ups** | Bomb (plus-shaped blast), Shuffle, Gravity Lock, Delay (+3 drops). Earned from achievements and daily play, from rewarded videos, or bought. |
| **Meta** | 19 achievements with power-up rewards, lifetime stats, per-mode bests, auto-saved runs (resume Endless/Zen/Extreme after closing the app), 3 planet skins |
| **Feel** | Animated falls/merges/flips, particle bursts, score popups, shockwaves, screen shake, combo banners; 20 synthesized SFX (pentatonic merge chimes) + ambient music loop; haptics |

### Difficulty tuning (measured, not guessed)

Simulated with bots against the real engine (`src/game/engine.js`), 24 seeds each:

| Bot | Endless | Extreme | Daily |
|---|---|---|---|
| Random tapping | ~100 drops | ~110 | ~100 |
| "Attentive human" heuristic | ~510 drops | ~260 | ~550 |

Knobs: `RAMP` and `SHOWERS` in `engine.js`.

## Project layout

```
App.js                    root: fonts, splash, service startup, navigation, sheets, toasts
src/config.js             ← every account-specific ID (RevenueCat, AdMob units, links)
src/game/engine.js        pure game logic (no React); records animation frames
src/game/puzzles.json     30 generated puzzles, each with a proven solution
src/game/products.js      IAP catalog (product ids → entitlements / grants)
src/game/achievements.js  achievements + rewards
src/game/skins.js         planet palettes (Cosmic, Golden Hour, Neon Void)
src/hooks/useGame.js      plays engine frames back as animation + sound + haptics + FX
src/screens/              HomeScreen, GameScreen
src/components/           Board, Orb, Planet (SVG art), Fx, HUD, PowerBar, sheets, overlays
src/services/             profile (persistence), audio, haptics, ads(.web), iap(.web)
scripts/                  preflight, puzzle generator/solver, sound synth, icon renderer
assets/                   icon, adaptive icon, splash, favicon, sounds
docs/                     store listing, privacy policy, data-safety answers
```

## Regenerating assets

```bash
npm run gen:puzzles      # rebuild + re-prove all puzzles (a few minutes)
npm run gen:sounds       # resynthesize every sound effect + music loop
node scripts/render-art.js   # re-render icon / adaptive icon / splash / favicon
```
