import { AccessibilityInfo, Platform } from "react-native";
import * as Haptics from "expo-haptics";
/** Haptics are supplementary; OS-disabled vibration must never turn a committed save into an error. */
export async function successFeedback() {
  if (Platform.OS === "web") return;
  try {
    if (await AccessibilityInfo.isReduceMotionEnabled()) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    return;
  }
}
