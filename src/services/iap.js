// In-app purchases via RevenueCat (react-native-purchases).
//
// - Prices always come from the store (localized), never hard-coded.
// - Non-consumables are backed by RevenueCat entitlements and restored on
//   launch, on "Restore Purchases", and whenever RevenueCat pushes an update.
// - In a __DEV__ build without API keys, a simulated store lets you test the
//   whole shop flow. Release builds never simulate.
import { Platform } from 'react-native';
import { CONFIG, isPlaceholder } from '../config';
import { PRODUCTS, productById, profilePatchForEntitlements } from '../game/products';
import { updateProfile, grantItems, getProfile } from './profile';

let Purchases = null;
try {
  Purchases = require('react-native-purchases').default;
} catch (e) {
  Purchases = null;
}

let configured = false;
let simulated = false;
let catalog = {}; // productId → { priceString, pkg?, product? }

const activeEntitlements = (info) => Object.keys((info && info.entitlements && info.entitlements.active) || {});

function applyCustomerInfo(info) {
  const active = activeEntitlements(info);
  // Only ever *add* ownership locally; never strip a purchase because of a
  // transient network / config issue.
  updateProfile((p) => profilePatchForEntitlements(p, active));
  return active;
}

export function configurePurchases() {
  if (configured || simulated) return;
  const key = Platform.select({ ios: CONFIG.revenueCat.iosApiKey, android: CONFIG.revenueCat.androidApiKey });
  if (!Purchases || isPlaceholder(key)) {
    simulated = __DEV__;
    return;
  }
  try {
    if (__DEV__) Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: key });
    configured = true;
    Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
  } catch (e) {
    configured = false;
  }
}

export const storeMode = () => (configured ? 'live' : simulated ? 'simulated' : 'unavailable');

export async function syncEntitlements() {
  if (!configured) return [];
  try {
    return applyCustomerInfo(await Purchases.getCustomerInfo());
  } catch (e) {
    return [];
  }
}

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

function applyPurchase(def) {
  const p = getProfile();
  if (def.grant && !(def.id === 'nova_stack_starter_bundle' && p.starterBundleOwned)) grantItems(def.grant);
  updateProfile((prof) => {
    let next = prof;
    if (def.entitlements && def.entitlements.includes('remove_ads')) next = { ...next, adsRemoved: true };
    if (def.id === 'nova_stack_starter_bundle') next = { ...next, starterBundleOwned: true };
    if (def.skin && !next.ownedSkins.includes(def.skin)) next = { ...next, ownedSkins: [...next.ownedSkins, def.skin], skin: def.skin };
    return next;
  });
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
