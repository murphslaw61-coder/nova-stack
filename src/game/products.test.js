import { hasNoAds, hasSkin, profilePatchForEntitlements, PRO_ENTITLEMENT } from './products';

const base = { adsRemoved: false, isPro: false, ownedSkins: ['cosmic'], skin: 'cosmic' };

test('Pro removes ads and unlocks every skin while active', () => {
  const pro = { ...base, isPro: true };
  expect(hasNoAds(pro)).toBe(true);
  expect(hasSkin(pro, 'golden')).toBe(true);
  expect(hasSkin(pro, 'neon')).toBe(true);
});

test('when Pro lapses, one-time purchases are kept and Pro perks go away', () => {
  const lapsed = { ...base, isPro: false, adsRemoved: true, ownedSkins: ['cosmic', 'golden'] };
  expect(hasNoAds(lapsed)).toBe(true); // bought Remove Ads separately
  expect(hasSkin(lapsed, 'golden')).toBe(true); // bought this skin
  expect(hasSkin(lapsed, 'neon')).toBe(false); // was only a Pro perk
  expect(hasSkin(base, 'cosmic')).toBe(true);
  expect(hasNoAds(base)).toBe(false);
});

test('one-time entitlements are added and never removed by a later sync', () => {
  const got = profilePatchForEntitlements(base, ['remove_ads', 'skin_neon', PRO_ENTITLEMENT]);
  expect(got.adsRemoved).toBe(true);
  expect(got.ownedSkins).toContain('neon');
  const again = profilePatchForEntitlements(got, []);
  expect(again.adsRemoved).toBe(true);
  expect(again.ownedSkins).toContain('neon');
});
