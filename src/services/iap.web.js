// Browser build: real payments only exist in the iOS and Android apps, so the
// web version runs a clearly labelled demo store. Every product can be
// "bought" for free and grants exactly what the real purchase grants, so the
// whole shop flow can be tried in a browser.
import { PRODUCTS, productById } from '../game/products';
import { applyPurchase } from './purchaseEffects';
import { getProfile } from './profile';

export function configurePurchases() {}
export const storeMode = () => 'demo';
export async function syncEntitlements() { return []; }

export async function loadCatalog() {
  return Object.fromEntries(PRODUCTS.map((p) => [p.id, { priceString: p.fallbackPrice }]));
}

export async function purchase(productId) {
  const def = productById(productId);
  if (!def) return { error: 'Unknown product' };
  await new Promise((r) => setTimeout(r, 450));
  applyPurchase(def);
  return { success: true, demo: true };
}

// Demo ownership lives in this browser's saved profile, so "restoring" just
// reports what is already owned here.
export async function restorePurchases() {
  const p = getProfile();
  const restored = [];
  if (p.adsRemoved) restored.push('remove_ads');
  if (p.ownedSkins.includes('golden')) restored.push('skin_golden');
  if (p.ownedSkins.includes('neon')) restored.push('skin_neon');
  return { success: true, restored };
}
