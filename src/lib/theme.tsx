import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";
import { resolveTheme, type ThemeMode } from "./themeMode";
export const palettes = {
  light: {
    background: "#F4F7FB",
    surface: "#FFFFFF",
    ink: "#182B40",
    muted: "#5B6C80",
    line: "#DCE5EE",
    primary: "#147D69",
    accent: "#24C48E",
    danger: "#AD3039",
  },
  dark: {
    background: "#101B29",
    surface: "#1A2B3C",
    ink: "#F0F8F5",
    muted: "#B8CADA",
    line: "#354C62",
    primary: "#8CE2BF",
    accent: "#24C48E",
    danger: "#FFADB4",
  },
};
export { resolveTheme, type ThemeMode } from "./themeMode";
export const ThemeContext = createContext<ThemeMode>("system");
export function useTheme() {
  const mode = useContext(ThemeContext);
  const system = useColorScheme();
  return palettes[resolveTheme(mode, system)];
}
export const tokens = { space: 4, radius: 20, controlHeight: 52, motion: 200 };
export function useThemeMode() {
  return useContext(ThemeContext);
}
