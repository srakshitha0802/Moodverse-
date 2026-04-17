import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * No-op on web and when native haptics are unavailable (avoids unhandled rejections).
 */
export async function impactAsync(style) {
  if (Platform.OS === "web") return;
  try {
    await Haptics.impactAsync(style);
  } catch {
    /* optional native module */
  }
}

export async function notificationAsync(type) {
  if (Platform.OS === "web") return;
  try {
    await Haptics.notificationAsync(type);
  } catch {
    /* optional native module */
  }
}

export async function selectionAsync() {
  if (Platform.OS === "web") return;
  try {
    await Haptics.selectionAsync();
  } catch {
    /* optional native module */
  }
}

export const impactLight = () => impactAsync(Haptics.ImpactFeedbackStyle.Light);
export const impactMedium = () =>
  impactAsync(Haptics.ImpactFeedbackStyle.Medium);
export const impactHeavy = () => impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
export const notifySuccess = () =>
  notificationAsync(Haptics.NotificationFeedbackType.Success);
export const notifyWarning = () =>
  notificationAsync(Haptics.NotificationFeedbackType.Warning);
