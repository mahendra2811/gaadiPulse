// Implementation TEMPLATE — Codex will merge into root app.config.ts after Expo initialization.
// Do not commit private signing keys or provider client secrets.
import type { ExpoConfig, ConfigContext } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'GaadiPulse', slug: 'gaadipulse', scheme: 'gaadipulse',
  orientation: 'portrait', userInterfaceStyle: 'automatic',
  icon: './assets/brand/generated/app-icon.png',
  splash: { image: './assets/media/logo/new/02-square-dark.png', resizeMode: 'contain', backgroundColor: '#122C2A' },
  android: {
    package: 'com.pooniya.gaadipulse',
    adaptiveIcon: { foregroundImage: './assets/brand/generated/adaptive-foreground.png', backgroundColor: '#122C2A' },
    permissions: ['POST_NOTIFICATIONS'],
  },
  plugins: ['expo-router', 'expo-localization'],
  extra: { appName: 'GaadiPulse', eas: { projectId: process.env.EAS_PROJECT_ID } },
});
