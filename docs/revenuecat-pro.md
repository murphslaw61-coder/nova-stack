# Nova Stack Pro: RevenueCat setup

Nova Stack Pro is the `nova_stack_pro` entitlement. It gives no ads, every planet skin,
and +1 of every power-up per day. The app reads it live from RevenueCat, so it switches
off when a subscription lapses. One-time purchases (Remove Ads, skins, power-up packs)
are separate and never expire.

The app is Expo / React Native, so the SDK is `react-native-purchases` plus
`react-native-purchases-ui` (Paywalls and Customer Center). The native iOS SDK
from Swift Package Manager is bundled automatically by these packages; it isn't added
to Xcode by hand.

## 1. Test Store (works today, no App Store needed)
`src/config.js → revenueCat.testStoreApiKey` holds your `test_…` key. **Development
builds** use it automatically, so you can buy Pro on a dev build and nobody is charged.
Release builds never use it.

In RevenueCat → your project → **Test Store**, create three products:

| Product ID | Type | Duration | Price |
|---|---|---|---|
| `nova_stack_pro_monthly` | Subscription | 1 month | $2.99 |
| `nova_stack_pro_yearly` | Subscription | 1 year | $19.99 |
| `nova_stack_pro_lifetime` | Non-consumable | — | $29.99 |

The six shop items are also in the Test Store, at the prices in `RELEASE.md`, in a
separate non-current offering called `shop`. Test Store prices can't be edited after
creation, so to change one, create a new product and swap it into the package.

## 2. Entitlement
**Product catalog → Entitlements → + New**: identifier `nova_stack_pro`. Attach
the three Pro products (and, later, the App Store / Play versions of them).

## 3. Offering
**Product catalog → Offerings**: make an offering `default`, mark it **Current**, and add:

| Package | Product |
|---|---|
| `$rc_monthly` (Monthly) | `nova_stack_pro_monthly` |
| `$rc_annual` (Annual) | `nova_stack_pro_yearly` |
| `$rc_lifetime` (Lifetime) | `nova_stack_pro_lifetime` |

## 4. Paywall
**Paywalls → + New** on the `default` offering. Pick a template and use the Nova Stack
look: dark background `#04050C`, accent `#FFCF5A`, the Saturn image from
`assets/icon.png`, and the three perks above. The app shows it with
`RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'nova_stack_pro' })`,
so it never appears for someone who already has Pro.

Apple requires your **Terms of Use** and **Privacy Policy** links on any subscription
paywall. Turn them on in the paywall editor.

## 5. Customer Center
**Customer Center** in the dashboard: turn it on and add a support email. Pro members
open it from **Shop → Manage subscription** or **Settings → Manage subscription** to
cancel, restore, or request a refund (iOS).

## 6. Going live on the App Store
1. App Store Connect → your app → **Monetization → Subscriptions**: create a group
   `Nova Stack Pro` with `nova_stack_pro_monthly` ($2.99) and `nova_stack_pro_yearly` ($19.99).
   Under **In-App Purchases**, add the non-consumable `nova_stack_pro_lifetime` ($29.99).
2. RevenueCat: add the App Store app (bundle ID `com.novastack.planetmerge`) with its
   In-App Purchase Key. Import those three products, attach them to `nova_stack_pro`,
   and add them to the same `default` packages next to the Test Store products.
3. Copy the App Store app's public key (`appl_…`) into
   `src/config.js → revenueCat.iosApiKey`.
4. `npm run preflight`, then `npm run build:ios`.

## How the app uses it
| Where | What happens |
|---|---|
| App launch / back to foreground | `syncEntitlements()` refreshes customer info |
| Any purchase, renewal or expiry | `addCustomerInfoUpdateListener` updates Pro on the spot |
| Shop → Pro card → See plans | RevenueCat Paywall |
| Shop / Settings → Manage subscription | RevenueCat Customer Center |
| Pro lapses | ads return, Pro-only skins switch back to Cosmic, own purchases stay |
