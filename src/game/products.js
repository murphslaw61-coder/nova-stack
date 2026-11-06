// Store catalog. `id` must match the product IDs in App Store Connect and
// Google Play Console, and the products must be attached to an offering in
// RevenueCat. Non-consumables grant RevenueCat *entitlements* (so they
// restore on reinstall / new device); consumables grant items locally.
export const PRODUCTS = [
  {
    id: 'nova_stack_starter_bundle', type: 'nonconsumable', featured: true,
    name: 'Starter Bundle', desc: 'No ads forever + 5 of every power-up',
    entitlements: ['remove_ads'], grant: { bomb: 5, shuffle: 5, lock: 5, flip: 5 }, fallbackPrice: '$4.99',
    badge: 'BEST VALUE',
  },
  {
    id: 'nova_stack_remove_ads', type: 'nonconsumable',
    name: 'Remove Ads', desc: 'No banners, no interstitials. Optional reward ads stay available.',
    entitlements: ['remove_ads'], fallbackPrice: '$3.99',
  },
  {
    id: 'nova_stack_powerup_pack', type: 'consumable',
    name: 'Power-Up Pack', desc: '+3 Bomb, +3 Shuffle, +3 Lock, +3 Delay',
    grant: { bomb: 3, shuffle: 3, lock: 3, flip: 3 }, fallbackPrice: '$1.99',
  },
  {
    id: 'nova_stack_mega_pack', type: 'consumable',
    name: 'Mega Pack', desc: '+12 of every power-up',
    grant: { bomb: 12, shuffle: 12, lock: 12, flip: 12 }, fallbackPrice: '$5.99', badge: '-25%',
  },
  {
    id: 'nova_stack_skin_golden', type: 'nonconsumable',
    name: 'Golden Hour Skin', desc: 'Warm sunset tones on every planet',
    entitlements: ['skin_golden'], skin: 'golden', fallbackPrice: '$1.99',
  },
  {
    id: 'nova_stack_skin_neon', type: 'nonconsumable',
    name: 'Neon Void Skin', desc: 'Glowing synthwave planets',
    entitlements: ['skin_neon'], skin: 'neon', fallbackPrice: '$1.99',
  },
];
export const productById = (id) => PRODUCTS.find((p) => p.id === id);

// Map RevenueCat entitlement ids → profile changes.
export function profilePatchForEntitlements(profile, active) {
  let p = profile;
  if (active.includes('remove_ads') && !p.adsRemoved) p = { ...p, adsRemoved: true };
  for (const [ent, skin] of [['skin_golden', 'golden'], ['skin_neon', 'neon']]) {
    if (active.includes(ent) && !p.ownedSkins.includes(skin)) p = { ...p, ownedSkins: [...p.ownedSkins, skin] };
  }
  return p;
}
