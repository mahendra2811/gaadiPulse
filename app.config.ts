import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "GaadiPulse",
  slug: "gaadipulse",
  scheme: "gaadipulse",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/android-store-icon.png",
  android: {
    softwareKeyboardLayoutMode: "resize",
    blockedPermissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.RECORD_AUDIO",
      "android.permission.CAMERA",
    ],
    package: process.env.ANDROID_PACKAGE ?? "com.pooniya.gaadipulse",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon-foreground.png",
      backgroundColor: "#122C2A",
    },
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-sharing",
    [
      "expo-notifications",
      { icon: "./assets/notification-icon.png", color: "#147D69" },
    ],
    "expo-secure-store",
    "expo-sqlite",
    [
      "expo-splash-screen",
      {
        image: "./assets/app-icon.png",
        imageWidth: 180,
        backgroundColor: "#122C2A",
      },
    ],
  ],
};
export default config;
