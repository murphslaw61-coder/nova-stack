// What owning a product does to the player's profile. Shared by the real
// RevenueCat store (iap.js) and the browser demo store (iap.web.js) so both
// grant exactly the same things.
import { getProfile, updateProfile, grantItems } from './profile';

export function applyPurchase(def) {
  const p = getProfile();
  // The Starter Bundle's power-ups are granted once, never again on restore.
  if (def.grant && !(def.id === 'nova_stack_starter_bundle' && p.starterBundleOwned)) grantItems(def.grant);
  updateProfile((prof) => {
    let next = prof;
    if (def.entitlements && def.entitlements.includes('remove_ads')) next = { ...next, adsRemoved: true };
    if (def.id === 'nova_stack_starter_bundle') next = { ...next, starterBundleOwned: true };
    if (def.skin && !next.ownedSkins.includes(def.skin)) next = { ...next, ownedSkins: [...next.ownedSkins, def.skin], skin: def.skin };
    return next;
  });
}
