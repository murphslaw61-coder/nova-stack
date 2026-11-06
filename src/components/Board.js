import React, { forwardRef, memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Orb from './Orb';
import Planet from './Planet';
import { BoardFx } from './Fx';
import { COLORS } from '../game/constants';

export const BOARD_PAD = 8;

const Cells = memo(function Cells({ rows, cols, cell, gap }) {
  const out = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push(
        <View
          key={`${r}-${c}`}
          style={[styles.cell, { left: c * (cell + gap), top: r * (cell + gap), width: cell, height: cell, borderRadius: cell * 0.28 }]}
        />
      );
  return <>{out}</>;
});

function Board(
  {
    orbs, dur, gravity, dropId, rows, cols, cell, gap, skin, showNumbers,
    bombArmed, flipWarn, disabled, nextValue, landingRowFor, dangerCols, hintCol,
    onColumnPress, onCellPress,
  },
  fxRef
) {
  const [aim, setAim] = useState(null);
  const step = cell + gap;
  const w = cols * step - gap;
  const h = rows * step - gap;
  const pulse = useRef(new Animated.Value(0)).current;
  const hintPulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (hintCol == null) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(hintPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(hintPulse, { toValue: 0.35, duration: 500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [hintCol]);

  useEffect(() => {
    if (!flipWarn && !bombArmed) { pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [flipWarn, bombArmed]);

  const spawnTop = gravity === 'down';
  const aimRow = aim != null && !bombArmed ? landingRowFor(aim) : -1;
  const warnColor = bombArmed ? COLORS.coral : COLORS.orange;

  const orbEls = useMemo(
    () => orbs.map((o) => (
      <Orb
        key={o.id} id={o.id} v={o.v} r={o.r} c={o.c} m={o.m} cell={cell} gap={gap} dur={dur}
        skin={skin} showNumber={showNumbers}
        spawnR={o.id === dropId ? (spawnTop ? -1 : rows) : undefined}
      />
    )),
    [orbs, cell, gap, dur, skin, showNumbers, dropId, spawnTop, rows]
  );

  return (
    <View style={[styles.frame, { width: w + BOARD_PAD * 2, height: h + BOARD_PAD * 2 }]}>
      <LinearGradient
        colors={['rgba(40,46,110,0.55)', 'rgba(14,16,44,0.82)']}
        style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.warnBorder, { borderColor: warnColor, opacity: pulse }]}
      />
      {/* spawn-edge glow shows where new orbs enter */}
      <LinearGradient
        pointerEvents="none"
        colors={spawnTop ? ['rgba(62,230,242,0.35)', 'rgba(62,230,242,0)'] : ['rgba(62,230,242,0)', 'rgba(62,230,242,0.35)']}
        style={[styles.spawnGlow, spawnTop ? { top: 0 } : { bottom: 0 }]}
      />
      <View style={{ position: 'absolute', left: BOARD_PAD, top: BOARD_PAD, width: w, height: h }}>
        <Cells rows={rows} cols={cols} cell={cell} gap={gap} />
        {dangerCols.map((c) => (
          <LinearGradient
            key={`d${c}`}
            pointerEvents="none"
            colors={spawnTop ? ['rgba(255,92,122,0.45)', 'rgba(255,92,122,0)'] : ['rgba(255,92,122,0)', 'rgba(255,92,122,0.45)']}
            style={{ position: 'absolute', left: c * step, top: 0, width: cell, height: h, borderRadius: cell * 0.28 }}
          />
        ))}
        {hintCol != null && (
          <Animated.View pointerEvents="none" style={[styles.hintCol, { left: hintCol * step, width: cell, height: h, borderRadius: cell * 0.3, opacity: hintPulse }]} />
        )}
        {aim != null && !bombArmed && (
          <View pointerEvents="none" style={[styles.aimCol, { left: aim * step, width: cell, height: h, borderRadius: cell * 0.3 }]} />
        )}
        {aimRow >= 0 && (
          <View pointerEvents="none" style={{ position: 'absolute', left: aim * step, top: aimRow * step, opacity: 0.45 }}>
            <Planet tier={nextValue} size={cell} skinId={skin} />
          </View>
        )}
        {orbEls}
        <BoardFx ref={fxRef} />
        <View style={StyleSheet.absoluteFill}>
          {Array.from({ length: cols }, (_, c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={bombArmed ? `Column ${c + 1}: tap an orb to bomb it` : `Drop orb in column ${c + 1}`}
              disabled={disabled}
              onPressIn={() => setAim(c)}
              onPressOut={() => setAim(null)}
              onPress={(e) => {
                if (bombArmed) {
                  const r = Math.max(0, Math.min(rows - 1, Math.floor((e.nativeEvent.locationY - BOARD_PAD) / step)));
                  onCellPress(r, c);
                } else onColumnPress(c);
              }}
              style={{ position: 'absolute', left: c * step - gap / 2, top: -BOARD_PAD, width: step, height: h + BOARD_PAD * 2 }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export default memo(forwardRef(Board));

const styles = StyleSheet.create({
  frame: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(150,170,255,0.22)',
    overflow: 'visible',
  },
  warnBorder: { borderRadius: 22, borderWidth: 2.5 },
  spawnGlow: { position: 'absolute', left: 14, right: 14, height: 26, borderRadius: 12 },
  cell: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(170,190,255,0.06)',
  },
  hintCol: { position: 'absolute', top: 0, backgroundColor: 'rgba(92,255,176,0.16)', borderWidth: 2, borderColor: 'rgba(92,255,176,0.8)' },
  aimCol: { position: 'absolute', top: 0, backgroundColor: 'rgba(62,230,242,0.10)', borderWidth: 1, borderColor: 'rgba(62,230,242,0.35)' },
});
