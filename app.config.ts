import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "GaadiPulse",
  slug: "gaadipulse",
  owner: "mahi0092-org",
  extra: {
    eas: { projectId: "ce82f4c1-96f7-4b68-9a4a-7334b3370332" },
  },
  scheme: "gaadipulse",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/brand/generated/app-icon.png",
  web: { favicon: "./assets/brand/generated/favicon.png" },
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
      foregroundImage: "./assets/brand/generated/adaptive-foreground.png",
      backgroundColor: "#122C2A",
    },
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-sharing",
    "@react-native-community/datetimepicker",
    [
      "expo-notifications",
      {
        icon: "./assets/brand/generated/notification-icon.png",
        color: "#147D69",
      },
    ],
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/media/logo/new/02-square-dark.png",
        imageWidth: 180,
        backgroundColor: "#122C2A",
      },
    ],
  ],
};
export default config;
