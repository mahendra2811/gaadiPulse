import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";
export const palettes = {
  light: {
    background: "#F7F8FA",
    surface: "#FFFFFF",
    ink: "#122C2A",
    muted: "#526762",
    line: "#CBD8D3",
    primary: "#147D69",
    accent: "#24C48E",
    danger: "#AD3039",
  },
  dark: {
    background: "#0C1C1B",
    surface: "#18332F",
    ink: "#F0F8F5",
    muted: "#BDD1C8",
    line: "#3D5D53",
    primary: "#8CE2BF",
    accent: "#24C48E",
    danger: "#FFADB4",
  },
};
export type ThemeMode = "light" | "dark" | "system";
export const ThemeContext = createContext<ThemeMode>("system");
export function useTheme() {
  const mode = useContext(ThemeContext);
  const system = useColorScheme();
  return palettes[
    mode === "system" ? (system === "dark" ? "dark" : "light") : mode
  ];
}
export const tokens = { space: 4, radius: 20, controlHeight: 52, motion: 200 };
