// In-app purchases via RevenueCat (react-native-purchases + react-native-purchases-ui).
//
// Keys:
//   - Development builds use the RevenueCat Test Store key (config.js), so the
//     whole flow (paywall, purchases, entitlements, Customer Center) works with
//     no App Store / Play setup and no real charges.
//   - Release builds use the platform keys (appl_… / goog_…). If those are
//     still placeholders the store reports itself unavailable.
//   - A __DEV__ build with no key at all falls back to a local simulated store.
//
// Entitlements:
//   - nova_stack_pro (subscription or lifetime) is tracked LIVE: it switches on
//     and off with RevenueCat's customer info, so an expired subscription
//     removes Pro perks.
//   - One-time unlocks (remove_ads, skin_golden, skin_neon) are only ever
//     added locally, never removed because of a transient network error.
import { Platform } from 'react-native';
import { CONFIG, isPlaceholder } from '../config';
import { PRODUCTS, productById, profilePatchForEntitlements, PRO_ENTITLEMENT, hasSkin } from '../game/products';
import { updateProfile, getProfile } from './profile';
import { applyPurchase } from './purchaseEffects';

let Purchases = null;
let RevenueCatUI = null;
try {
  Purchases = require('react-native-purchases').default;
} catch (e) {
  Purchases = null;
}
try {
  RevenueCatUI = require('react-native-purchases-ui').default;
} catch (e) {
  RevenueCatUI = null;
}

let configured = false;
let simulated = false;
let usingTestStore = false;
let catalog = {}; // productId → { priceString, pkg?, product? }

const activeEntitlements = (info) => Object.keys((info && info.entitlements && info.entitlements.active) || {});

function applyCustomerInfo(info) {
  if (!info) return [];
  const active = activeEntitlements(info);
  const isPro = active.includes(PRO_ENTITLEMENT);
  const proEntitlement = isPro ? info.entitlements.active[PRO_ENTITLEMENT] : null;
  updateProfile((p) => {
    let next = profilePatchForEntitlements(p, active);
    const proExpires = proEntitlement ? proEntitlement.expirationDate || null : null; // null = lifetime
    const proWillRenew = proEntitlement ? !!proEntitlement.willRenew : false;
    if (next.isPro !== isPro || next.proExpires !== proExpires || next.proWillRenew !== proWillRenew) {
      next = { ...next, isPro, proExpires, proWillRenew };
    }
    // A lapsed Pro member keeps their own purchases but loses Pro-only skins.
    if (!hasSkin(next, next.skin)) next = { ...next, skin: 'cosmic' };
    return next;
  });
  return active;
}

function pickApiKey() {
  const platformKey = Platform.select({ ios: CONFIG.revenueCat.iosApiKey, android: CONFIG.revenueCat.androidApiKey });
  if (__DEV__ && !isPlaceholder(CONFIG.revenueCat.testStoreApiKey)) {
    return { key: CONFIG.revenueCat.testStoreApiKey, test: true };
  }
  if (!isPlaceholder(platformKey)) return { key: platformKey, test: false };
  return { key: null, test: false };
}

export function configurePurchases() {
  if (configured || simulated) return;
  const { key, test } = pickApiKey();
  if (!Purchases || !key) {
    simulated = __DEV__;
    return;
  }
  try {
    if (__DEV__) Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: key });
    configured = true;
    usingTestStore = test;
    Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
  } catch (e) {
    configured = false;
  }
}

// 'live' | 'test' (RevenueCat Test Store) | 'simulated' (local, dev only) | 'unavailable'
export const storeMode = () => (configured ? (usingTestStore ? 'test' : 'live') : simulated ? 'simulated' : 'unavailable');
export const paywallAvailable = () => configured && !!RevenueCatUI;

// Pull the latest customer info from RevenueCat and apply it (launch, app foreground).
export async function syncEntitlements() {
  if (!configured) return [];
  try {
    return applyCustomerInfo(await Purchases.getCustomerInfo());
  } catch (e) {
    return [];
  }
}

// Customer info for display (e.g. "Pro renews on …"). Returns null on failure.
export async function getCustomerInfo() {
  if (!configured) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    applyCustomerInfo(info);
    return info;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Nova Stack Pro: RevenueCat Paywall + Customer Center
// ---------------------------------------------------------------------------

// Shows the paywall configured for the current offering in the RevenueCat
// dashboard, unless the player already has Pro.
// Resolves { result: 'purchased' | 'restored' | 'cancelled' | 'already_pro' | 'error', error? }
export async function presentProPaywall() {
  if (simulated) {
    await new Promise((r) => setTimeout(r, 400));
    updateProfile((p) => ({ ...p, isPro: true, proExpires: null, proWillRenew: false }));
    return { result: 'purchased' };
  }
  if (!paywallAvailable()) return { result: 'error', error: 'The store is not available right now.' };
  try {
    const R = RevenueCatUI.PAYWALL_RESULT;
    const res = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PRO_ENTITLEMENT,
      displayCloseButton: true,
    });
    await syncEntitlements();
    switch (res) {
      case R.PURCHASED: return { result: 'purchased' };
      case R.RESTORED: return { result: 'restored' };
      case R.NOT_PRESENTED: return { result: 'already_pro' };
      case R.ERROR: return { result: 'error', error: 'The purchase could not be completed. You have not been charged.' };
      default: return { result: 'cancelled' };
    }
  } catch (e) {
    return { result: 'error', error: (e && e.message) || 'Could not open the store.' };
  }
}

// RevenueCat Customer Center: manage / cancel subscription, restore,
// request refunds (iOS), contact support. Configure it in the dashboard.
export async function presentCustomerCenter() {
  if (!paywallAvailable()) return { error: 'Subscription management is not available right now.' };
  try {
    await RevenueCatUI.presentCustomerCenter();
    await syncEntitlements();
    return { success: true };
  } catch (e) {
    return { error: (e && e.message) || 'Could not open subscription management.' };
  }
}

// ---------------------------------------------------------------------------
// One-time products (power-up packs, Remove Ads, skins, Starter Bundle)
// ---------------------------------------------------------------------------

// Returns { [productId]: { priceString } } for everything the store knows about.
export async function loadCatalog() {
  if (simulated) {
    catalog = Object.fromEntries(PRODUCTS.map((p) => [p.id, { priceString: p.fallbackPrice }]));
    return catalog;
  }
  if (!configured) return {};
  const next = {};
  try {
    const offerings = await Purchases.getOfferings();
    const all = [offerings.current, ...Object.values(offerings.all || {})].filter(Boolean);
    for (const off of all) {
      for (const pkg of off.availablePackages || []) {
        const id = pkg.product.identifier;
        if (!next[id]) next[id] = { priceString: pkg.product.priceString, pkg };
      }
    }
  } catch (e) {}
  const missing = PRODUCTS.map((p) => p.id).filter((id) => !next[id]);
  if (missing.length) {
    try {
      const products = await Purchases.getProducts(missing, Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
      for (const product of products) next[product.identifier] = { priceString: product.priceString, product };
    } catch (e) {}
  }
  catalog = next;
  return catalog;
}

// Resolves { success } | { cancelled } | { error }
export async function purchase(productId) {
  const def = productById(productId);
  if (!def) return { error: 'Unknown product' };
  if (simulated) {
    await new Promise((r) => setTimeout(r, 500));
    applyPurchase(def);
    return { success: true, simulated: true };
  }
  if (!configured) return { error: 'The store is not available right now.' };
  let entry = catalog[productId];
  if (!entry) {
    await loadCatalog();
    entry = catalog[productId];
  }
  if (!entry) return { error: 'This item is not available yet. Please try again later.' };
  try {
    const result = entry.pkg ? await Purchases.purchasePackage(entry.pkg) : await Purchases.purchaseStoreProduct(entry.product);
    applyPurchase(def);
    if (result && result.customerInfo) applyCustomerInfo(result.customerInfo);
    return { success: true };
  } catch (e) {
    if (e && e.userCancelled) return { cancelled: true };
    return { error: (e && e.message) || 'Purchase failed. You have not been charged.' };
  }
}

export async function restorePurchases() {
  if (simulated) return { success: true, restored: [] };
  if (!configured) return { error: 'The store is not available right now.' };
  try {
    const info = await Purchases.restorePurchases();
    return { success: true, restored: applyCustomerInfo(info) };
  } catch (e) {
    return { error: (e && e.message) || 'Restore failed. Please try again.' };
  }
}

// Exposed for the daily Pro bonus check.
export const isProNow = () => !!getProfile().isPro;
