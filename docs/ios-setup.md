# iOS setup checklist (App Store Connect)

Bundle ID: **com.novastack.planetmerge**. Do these in order. Each step says where it happens.

## 1. Paid Apps agreement (required for in-app purchases)
App Store Connect → **Business** → sign the **Paid Apps** agreement and add your
**bank account** and **tax forms**. Until this shows "Active", purchases can't be
tested or sold.

## 2. Register the bundle ID
developer.apple.com → **Certificates, IDs & Profiles → Identifiers → +** → App IDs → App
- Description: `Nova Stack`
- Bundle ID (Explicit): `com.novastack.planetmerge`
- Capabilities: **In-App Purchase** is on by default; nothing else is needed.

(EAS can also register it automatically on the first `eas build`, but doing it here
lets you create the app and products now.)

## 3. Create the app
App Store Connect → **Apps → + → New App**
- Platform: iOS
- Name: `Nova Stack`. If the name is taken, try `Nova Stack: Planet Merge`.
- Primary language: English (U.S.)
- Bundle ID: `com.novastack.planetmerge`
- SKU: `novastack-ios-001` (any unique text; players never see it)
- User access: Full Access

## 4. Create the six in-app purchases
In the app → **Monetization → In-App Purchases → +**. The Product ID must match exactly.

| Type | Reference name | Product ID | Price |
|---|---|---|---|
| Non-Consumable | Starter Bundle | `nova_stack_starter_bundle` | $4.99 |
| Non-Consumable | Remove Ads | `nova_stack_remove_ads` | $3.99 |
| Consumable | Power-Up Pack | `nova_stack_powerup_pack` | $1.99 |
| Consumable | Mega Pack | `nova_stack_mega_pack` | $5.99 |
| Non-Consumable | Golden Hour Skin | `nova_stack_skin_golden` | $1.99 |
| Non-Consumable | Neon Void Skin | `nova_stack_skin_neon` | $1.99 |

For each one, add:
- **Availability:** all countries
- **App Store Localization (English):** display name + description
  - Starter Bundle: "No ads forever plus 5 of every power-up."
  - Remove Ads: "Removes banner and between-game ads. Optional reward videos stay available."
  - Power-Up Pack: "3 Bombs, 3 Shuffles, 3 Locks and 3 Delays."
  - Mega Pack: "12 of every power-up."
  - Golden Hour Skin: "Warm sunset colors on every planet."
  - Neon Void Skin: "Glowing neon planets."
- **Review screenshot:** a screenshot of the in-game Shop (any iPhone simulator screenshot works)
- **Review notes:** "Open the Shop with the ✦ button on the home screen."

New in-app purchases are submitted for review together with the first app version.

## 5. Sandbox tester
App Store Connect → **Users and Access → Sandbox → Testers → +**. Use an email that is
*not* your Apple ID. Sign in with it on a test iPhone under Settings → App Store →
Sandbox Account.

## 6. Connect RevenueCat to Apple
RevenueCat → your project → **Apps → + App Store app**
- Bundle ID: `com.novastack.planetmerge`
- **In-App Purchase Key:** App Store Connect → **Users and Access → Integrations →
  In-App Purchase → Generate**. Download the `.p8` file and upload it to RevenueCat with
  its Key ID and Issuer ID.
- Then in RevenueCat: **Products → Import** the six products, create the entitlements
  `remove_ads` (Remove Ads + Starter Bundle), `skin_golden` and `skin_neon`, and put all
  six products in an offering called `default`, marked Current.
- Copy the app's **public API key** (starts with `appl_`) into `src/config.js →
  revenueCat.iosApiKey`.

## 7. Build
```bash
npm i -g eas-cli
eas login            # free Expo account
eas init             # fills in extra.eas.projectId
npm run preflight
npm run build:ios    # EAS asks for your Apple ID once and manages certificates
npm run submit:ios   # uploads to TestFlight
```
