// Shared UI primitives: buttons, panels, bottom sheet, text.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../game/constants';
import { sfx } from '../services/audio';
import { haptic } from '../services/haptics';

export function T({ style, kind = 'body', children, ...rest }) {
  const base = {
    display: styles.tDisplay, title: styles.tTitle, body: styles.tBody, bold: styles.tBold, dim: styles.tDim, label: styles.tLabel,
  }[kind];
  return <Text style={[base, style]} {...rest}>{children}</Text>;
}

function useLiftOnPress() {
  const s = useRef(new Animated.Value(1)).current;
  return {
    scale: s,
    onPressIn: () => Animated.spring(s, { toValue: 0.95, friction: 6, tension: 300, useNativeDriver: true }).start(),
    onPressOut: () => Animated.spring(s, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }).start(),
  };
}

export function Button({ label, sub, onPress, colors = [COLORS.cyan, '#2A9DF4'], textColor = '#04101A', icon, style, disabled, small, accessibilityLabel }) {
  const lift = useLiftOnPress();
  return (
    <Animated.View style={[{ transform: [{ scale: lift.scale }], opacity: disabled ? 0.45 : 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        disabled={disabled}
        onPressIn={lift.onPressIn}
        onPressOut={lift.onPressOut}
        onPress={() => { sfx.tap(); haptic.tap(); onPress && onPress(); }}
      >
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, small && styles.btnSmall]}>
          <View style={styles.btnShine} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {icon ? <Text style={[styles.btnIcon, { color: textColor }]}>{icon}</Text> : null}
            <Text style={[styles.btnText, small && { fontSize: 13 }, { color: textColor }]}>{label}</Text>
          </View>
          {sub ? <Text style={[styles.btnSub, { color: textColor }]}>{sub}</Text> : null}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export function GhostButton({ label, onPress, style, icon, color = COLORS.text, disabled }) {
  const lift = useLiftOnPress();
  return (
    <Animated.View style={[{ transform: [{ scale: lift.scale }], opacity: disabled ? 0.45 : 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPressIn={lift.onPressIn}
        onPressOut={lift.onPressOut}
        onPress={() => { sfx.tap(); haptic.tap(); onPress && onPress(); }}
        style={styles.ghost}
      >
        {icon ? <Text style={[styles.ghostIcon, { color }]}>{icon}</Text> : null}
        <Text style={[styles.ghostText, { color }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({ icon, onPress, label, badge, size = 42, color = COLORS.text, style }) {
  const lift = useLiftOnPress();
  return (
    <Animated.View style={[{ transform: [{ scale: lift.scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={lift.onPressIn}
        onPressOut={lift.onPressOut}
        onPress={() => { sfx.tap(); haptic.tap(); onPress && onPress(); }}
        style={[styles.iconBtn, { width: size, height: size, borderRadius: size * 0.32 }]}
      >
        <Text style={{ color, fontSize: size * 0.45, fontFamily: FONTS.bodyBold }}>{icon}</Text>
        {badge ? <View style={styles.iconBadge}><Text style={styles.iconBadgeText}>{badge}</Text></View> : null}
      </Pressable>
    </Animated.View>
  );
}

export function Panel({ style, children, glow }) {
  return <View style={[styles.panel, glow && { borderColor: glow, shadowColor: glow, shadowOpacity: 0.5, shadowRadius: 12 }, style]}>{children}</View>;
}

export function Sheet({ visible, onClose, title, children, scroll = true }) {
  const insets = useSafeAreaInsets();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) Animated.timing(t, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    else t.setValue(0);
  }, [visible]);
  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: t }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }] }]}
      >
        <LinearGradient colors={['#1A1F4C', '#0D1030']} style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 26, borderTopRightRadius: 26 }]} />
        <View style={styles.handle} />
        <View style={styles.sheetHeader}>
          <T kind="title">{title}</T>
          <IconButton icon="✕" size={34} onPress={onClose} label="Close" />
        </View>
        <Body style={{ maxHeight: 560 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {children}
        </Body>
      </Animated.View>
    </Modal>
  );
}

export function Toggle({ label, value, onChange }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => { haptic.tap(); onChange(!value); }}
      style={styles.toggleRow}
    >
      <T kind="bold" style={{ flex: 1 }}>{label}</T>
      <View style={[styles.track, value && { backgroundColor: COLORS.cyan }]}>
        <View style={[styles.knob, value && { transform: [{ translateX: 20 }] }]} />
      </View>
    </Pressable>
  );
}

export const formatScore = (n) => Math.round(n).toLocaleString('en-US');

const styles = StyleSheet.create({
  tDisplay: { fontFamily: FONTS.display, color: COLORS.text, letterSpacing: 1.5 },
  tTitle: { fontFamily: FONTS.displayMid, color: COLORS.text, fontSize: 18, letterSpacing: 1 },
  tBody: { fontFamily: FONTS.body, color: COLORS.text, fontSize: 14 },
  tBold: { fontFamily: FONTS.bodyBold, color: COLORS.text, fontSize: 14 },
  tDim: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 12.5 },
  tLabel: { fontFamily: FONTS.bodyBold, color: COLORS.textDim, fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase' },
  btn: { borderRadius: 16, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', overflow: 'hidden' },
  btnSmall: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  btnShine: { position: 'absolute', left: 0, right: 0, top: 0, height: '48%', backgroundColor: 'rgba(255,255,255,0.18)' },
  btnText: { fontFamily: FONTS.display, fontSize: 16, letterSpacing: 1.5 },
  btnIcon: { fontSize: 17, fontFamily: FONTS.bodyBlack },
  btnSub: { fontFamily: FONTS.bodyBold, fontSize: 11, opacity: 0.8, marginTop: 2 },
  ghost: {
    flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center',
    borderRadius: 14, paddingVertical: 13, borderWidth: 1, borderColor: COLORS.strokeHi, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ghostIcon: { fontSize: 15, fontFamily: FONTS.bodyBlack },
  ghostText: { fontFamily: FONTS.bodyBold, fontSize: 14, letterSpacing: 0.5 },
  iconBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.stroke },
  iconBadge: {
    position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: COLORS.coral, alignItems: 'center', justifyContent: 'center',
  },
  iconBadgeText: { color: '#fff', fontSize: 10, fontFamily: FONTS.bodyBlack },
  panel: { backgroundColor: COLORS.panel, borderRadius: 18, borderWidth: 1, borderColor: COLORS.stroke },
  backdrop: { backgroundColor: 'rgba(2,3,10,0.7)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10,
    borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: COLORS.strokeHi, maxWidth: 560, alignSelf: 'center', width: '100%',
  },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, alignSelf: 'center', marginBottom: 10 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  track: { width: 46, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.15)', padding: 3 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
});
