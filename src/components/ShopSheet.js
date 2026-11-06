import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sheet, T, GhostButton } from './ui';
import Planet from './Planet';
import { COLORS, FONTS } from '../game/constants';
import { PRODUCTS } from '../game/products';
import { SKINS, SKIN_ORDER } from '../game/skins';
import { loadCatalog, purchase, restorePurchases, storeMode } from '../services/iap';
import { showRewardedAd, useAdsStatus } from '../services/ads';
import { useProfile, updateProfile, grantItems } from '../services/profile';
import { CONFIG, isPlaceholder } from '../config';
import { sfx } from '../services/audio';
import { haptic } from '../services/haptics';
import { dateKey } from '../game/engine';

const FREE_REWARDS_PER_DAY = 5;
const KINDS = ['bomb', 'shuffle', 'lock', 'flip'];
const KIND_NAMES = { bomb: 'Bomb', shuffle: 'Shuffle', lock: 'Lock', flip: 'Delay' };

export default function ShopSheet({ visible, onClose, toast }) {
  const profile = useProfile();
  const ads = useAdsStatus();
  const [catalog, setCatalog] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    setCatalog(null);
    loadCatalog().then((c) => live && setCatalog(c));
    return () => { live = false; };
  }, [visible]);

  const mode = storeMode();
  const today = dateKey();
  const freeUsed = profile.freeRewardDate === today ? profile.freeRewardCount || 0 : 0;

  const buy = async (p) => {
    if (busy) return;
    setBusy(p.id);
    const res = await purchase(p.id);
    setBusy(null);
    if (res.success) {
      sfx.unlock();
      haptic.success();
      toast(`${p.name} unlocked${res.simulated ? ' (test store)' : ''}`);
    } else if (!res.cancelled) {
      toast(res.error || 'Purchase failed');
    }
  };

  const restore = async () => {
    setBusy('restore');
    const res = await restorePurchases();
    setBusy(null);
    toast(res.success ? 'Purchases restored' : res.error);
  };

  const watchForReward = async () => {
    if (freeUsed >= FREE_REWARDS_PER_DAY) return;
    setBusy('reward');
    const res = await showRewardedAd();
    setBusy(null);
    if (res.earned) {
      const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
      grantItems({ [kind]: 1 });
      updateProfile((p) => ({ ...p, freeRewardDate: today, freeRewardCount: freeUsed + 1 }));
      sfx.powerup();
      toast(`+1 ${KIND_NAMES[kind]}!`);
    } else if (!res.shown) {
      toast('No video available right now. Try again soon.');
    }
  };

  const priceFor = (p) => (catalog && catalog[p.id] ? catalog[p.id].priceString : null);
  const owned = (p) =>
    (p.id === 'nova_stack_remove_ads' && profile.adsRemoved) ||
    (p.id === 'nova_stack_starter_bundle' && profile.starterBundleOwned) ||
    (p.skin && profile.ownedSkins.includes(p.skin));

  const starter = PRODUCTS.find((p) => p.featured);
  const showStarter = !profile.starterBundleOwned && !profile.adsRemoved;

  return (
    <Sheet visible={visible} onClose={onClose} title="Shop">
      {mode === 'simulated' && (
        <View style={styles.notice}><T kind="dim">Test store: RevenueCat keys aren't set, so purchases are simulated (dev builds only).</T></View>
      )}
      {mode === 'unavailable' && (
        <View style={styles.notice}><T kind="dim">The store isn't available right now. Check your connection and try again.</T></View>
      )}

      {showStarter && (
        <Pressable onPress={() => buy(starter)} accessibilityRole="button" accessibilityLabel={`${starter.name}, ${starter.desc}`}>
          <LinearGradient colors={['#6A4DFF', '#C04DFF', '#FF6A9A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featured}>
            <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>{starter.badge}</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Planet tier={8} size={64} />
              <View style={{ flex: 1 }}>
                <Text style={styles.featuredTitle}>{starter.name}</Text>
                <Text style={styles.featuredDesc}>{starter.desc}</Text>
              </View>
            </View>
            <View style={styles.featuredBuy}>
              {busy === starter.id ? <ActivityIndicator color="#3A1A6A" /> : <Text style={styles.featuredPrice}>{priceFor(starter) || '—'}</Text>}
            </View>
          </LinearGradient>
        </Pressable>
      )}

      <T kind="label" style={styles.section}>Free</T>
      <Row
        icon="▶" iconColor={COLORS.green} name="Watch a video" desc={`+1 random power-up · ${FREE_REWARDS_PER_DAY - freeUsed} left today`}
        action={freeUsed >= FREE_REWARDS_PER_DAY ? 'Tomorrow' : ads.rewardedReady ? 'Watch' : ads.ready ? 'Loading' : 'Unavailable'}
        disabled={freeUsed >= FREE_REWARDS_PER_DAY || !ads.rewardedReady}
        busy={busy === 'reward'}
        onPress={watchForReward}
      />

      <T kind="label" style={styles.section}>Power-ups</T>
      {PRODUCTS.filter((p) => p.type === 'consumable').map((p) => (
        <Row key={p.id} icon="✸" iconColor={COLORS.coral} name={p.name} desc={p.desc} badge={p.badge}
          action={priceFor(p) || '—'} disabled={!priceFor(p)} busy={busy === p.id} onPress={() => buy(p)} />
      ))}

      <T kind="label" style={styles.section}>Ads</T>
      {PRODUCTS.filter((p) => p.id === 'nova_stack_remove_ads').map((p) => (
        <Row key={p.id} icon="⊘" iconColor={COLORS.cyan} name={p.name} desc={p.desc}
          action={owned(p) ? 'Owned' : priceFor(p) || '—'} disabled={owned(p) || !priceFor(p)} owned={owned(p)} busy={busy === p.id} onPress={() => buy(p)} />
      ))}

      <T kind="label" style={styles.section}>Planet skins</T>
      <View style={styles.skins}>
        {SKIN_ORDER.map((sid) => {
          const s = SKINS[sid];
          const product = PRODUCTS.find((p) => p.skin === sid);
          const has = profile.ownedSkins.includes(sid);
          const equipped = profile.skin === sid;
          const label = equipped ? 'Equipped' : has ? 'Equip' : (product && priceFor(product)) || '—';
          return (
            <Pressable
              key={sid}
              accessibilityRole="button"
              accessibilityLabel={`${s.name} skin, ${label}`}
              style={[styles.skinCard, equipped && { borderColor: COLORS.cyan }]}
              onPress={() => {
                if (has) { updateProfile((p) => ({ ...p, skin: sid })); haptic.tap(); }
                else if (product && priceFor(product)) buy(product);
              }}
            >
              <View style={styles.skinPlanets}>
                {[5, 7, 4].map((t) => <Planet key={t} tier={t} size={t === 7 ? 44 : 30} skinId={sid} />)}
              </View>
              <Text style={styles.skinName}>{s.name}</Text>
              <View style={[styles.skinBtn, equipped && { backgroundColor: 'rgba(62,230,242,0.15)' }, !has && { backgroundColor: COLORS.gold }]}>
                {busy === product?.id ? <ActivityIndicator size="small" color="#000" /> :
                  <Text style={[styles.skinBtnText, !has && { color: '#1A1200' }]}>{label}</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>

      <GhostButton label={busy === 'restore' ? 'Restoring…' : 'Restore Purchases'} onPress={restore} disabled={busy === 'restore'} style={{ marginTop: 18 }} />
      <View style={styles.legal}>
        {!isPlaceholder(CONFIG.links.privacyPolicy) && (
          <Text style={styles.link} onPress={() => Linking.openURL(CONFIG.links.privacyPolicy)}>Privacy Policy</Text>
        )}
        <Text style={styles.link} onPress={() => Linking.openURL(CONFIG.links.termsOfUse)}>Terms of Use</Text>
      </View>
    </Sheet>
  );
}

function Row({ icon, iconColor, name, desc, action, onPress, disabled, busy, owned, badge }) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { borderColor: iconColor }]}><Text style={{ color: iconColor, fontSize: 18, fontFamily: FONTS.bodyBlack }}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.rowName}>{name}</Text>
          {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
        </View>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}: ${action}`}
        disabled={disabled || busy}
        onPress={onPress}
        style={({ pressed }) => [styles.buy, owned && styles.buyOwned, (disabled && !owned) && { opacity: 0.45 }, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        {busy ? <ActivityIndicator size="small" color="#04101A" /> : <Text style={[styles.buyText, owned && { color: COLORS.textDim }]}>{action}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: 'rgba(255,207,90,0.1)', borderRadius: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,207,90,0.25)' },
  section: { marginTop: 16, marginBottom: 8 },
  featured: { borderRadius: 20, padding: 14, overflow: 'hidden' },
  featuredBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#FFE14D', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  featuredBadgeText: { fontFamily: FONTS.bodyBlack, fontSize: 10, color: '#3A1A00', letterSpacing: 1 },
  featuredTitle: { fontFamily: FONTS.display, fontSize: 18, color: '#fff', letterSpacing: 1 },
  featuredDesc: { fontFamily: FONTS.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  featuredBuy: { marginTop: 12, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  featuredPrice: { fontFamily: FONTS.display, fontSize: 16, color: '#3A1A6A', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.stroke },
  rowIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  rowName: { fontFamily: FONTS.bodyBlack, color: COLORS.text, fontSize: 14.5 },
  rowDesc: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  badge: { backgroundColor: COLORS.coral, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontFamily: FONTS.bodyBlack, color: '#fff', fontSize: 9.5 },
  buy: { backgroundColor: COLORS.cyan, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9, minWidth: 74, alignItems: 'center' },
  buyOwned: { backgroundColor: 'rgba(255,255,255,0.08)' },
  buyText: { fontFamily: FONTS.bodyBlack, color: '#04101A', fontSize: 13 },
  skins: { flexDirection: 'row', gap: 8 },
  skinCard: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 10, borderWidth: 1.5, borderColor: COLORS.stroke },
  skinPlanets: { flexDirection: 'row', alignItems: 'center', height: 48 },
  skinName: { fontFamily: FONTS.bodyBlack, color: COLORS.text, fontSize: 12.5, marginTop: 6 },
  skinBtn: { marginTop: 8, borderRadius: 9, paddingVertical: 6, alignSelf: 'stretch', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  skinBtnText: { fontFamily: FONTS.bodyBlack, color: COLORS.text, fontSize: 12 },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 14 },
  link: { color: COLORS.textDim, fontFamily: FONTS.body, fontSize: 12, textDecorationLine: 'underline' },
});
