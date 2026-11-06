import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, POWERUPS } from '../game/constants';
import { haptic } from '../services/haptics';

function PowerBar({ counts, onPress, armed, disabledKinds = [], rewardedReady }) {
  return (
    <View style={styles.row}>
      {POWERUPS.map((p) => {
        const n = counts[p.key] || 0;
        const off = disabledKinds.includes(p.key);
        const isArmed = armed === p.key;
        return (
          <Pressable
            key={p.key}
            accessibilityRole="button"
            accessibilityLabel={`${p.name}: ${p.desc} ${n} left`}
            disabled={off}
            onPress={() => { haptic.tap(); onPress(p.key); }}
            style={({ pressed }) => [
              styles.btn,
              { borderColor: isArmed ? p.color : COLORS.stroke, opacity: off ? 0.3 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
              isArmed && { backgroundColor: 'rgba(255,92,122,0.18)' },
            ]}
          >
            <Text style={[styles.icon, { color: p.color }]}>{p.icon}</Text>
            <Text style={styles.name}>{isArmed ? 'Cancel' : p.name}</Text>
            <View style={[styles.count, n === 0 && { backgroundColor: rewardedReady ? COLORS.green : 'rgba(255,255,255,0.12)' }]}>
              <Text style={[styles.countText, n === 0 && { color: '#04101A' }]}>{n > 0 ? n : rewardedReady ? '▶' : '+'}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default memo(PowerBar);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, width: '100%' },
  btn: {
    flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 7, borderRadius: 14, borderWidth: 1.5,
    backgroundColor: 'rgba(18,22,52,0.78)',
  },
  icon: { fontSize: 20, fontFamily: FONTS.bodyBlack, lineHeight: 24 },
  name: { color: COLORS.textDim, fontFamily: FONTS.bodyBold, fontSize: 10.5, marginTop: 1, letterSpacing: 0.4 },
  count: {
    position: 'absolute', top: -7, right: -5, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: COLORS.nebula, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.bg0,
  },
  countText: { color: '#fff', fontSize: 10.5, fontFamily: FONTS.bodyBlack },
});
