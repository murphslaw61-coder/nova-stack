import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;
export const setHapticsEnabled = (on) => { enabled = on; };

const safe = (fn) => {
  if (!enabled || Platform.OS === 'web') return;
  try { fn(); } catch (e) {}
};

export const haptic = {
  tap: () => safe(() => Haptics.selectionAsync()),
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  flip: () => safe(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)), 140);
  }),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
