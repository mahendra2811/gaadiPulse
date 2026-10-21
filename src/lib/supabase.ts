import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { env } from "./env";
// Chunk tokens because SecureStore values have platform-dependent size limits.
export const secureStorage = {
  async getItem(key: string) {
    if (Platform.OS === "web")
      return typeof sessionStorage === "undefined"
        ? null
        : sessionStorage.getItem(key);
    const count = Number((await SecureStore.getItemAsync(`${key}.count`)) ?? 0);
    if (!count) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.getItemAsync(`${key}.${i}`),
      ),
    );
    return chunks.every((v) => v !== null) ? chunks.join("") : null;
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web") {
      if (typeof sessionStorage !== "undefined")
        sessionStorage.setItem(key, value);
      return;
    }
    await this.removeItem(key);
    const chunks = value.match(/.{1,500}/gs) ?? [];
    for (let i = 0; i < chunks.length; i++)
      await SecureStore.setItemAsync(`${key}.${i}`, chunks[i]);
    await SecureStore.setItemAsync(`${key}.count`, String(chunks.length));
  },
  async removeItem(key: string) {
    if (Platform.OS === "web") {
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(key);
      return;
    }
    const count = Number((await SecureStore.getItemAsync(`${key}.count`)) ?? 0);
    await SecureStore.deleteItemAsync(`${key}.count`);
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.deleteItemAsync(`${key}.${i}`),
      ),
    );
  },
};
export const supabase = env
  ? createClient(env.url, env.key, {
      auth: {
        storage: secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;
export function client() {
  if (!supabase)
    throw new Error(
      "Configure Supabase using .env.example, then restart Expo.",
    );
  return supabase;
}
