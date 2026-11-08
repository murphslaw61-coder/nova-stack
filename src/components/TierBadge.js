// The small tier number shown at a planet's lower-right. Shared by the board
// and the up-next queue so both always look the same.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS } from '../game/constants';

export default function TierBadge({ tier, inset = 0 }) {
  return (
    <View pointerEvents="none" style={[styles.badge, { right: inset, bottom: inset }]}>
      <Text style={styles.text}>{tier}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3,
    backgroundColor: 'rgba(6,8,20,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  text: { color: '#fff', fontSize: 9, fontFamily: FONTS.bodyBlack, lineHeight: 11 },
});
