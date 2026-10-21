import { useEffect } from "react";
import { AppState } from "react-native";
import { addEventListener } from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
export function useConnectivity() {
  useEffect(() => {
    const network = addEventListener((s) =>
      onlineManager.setOnline(
        s.isConnected !== false && s.isInternetReachable !== false,
      ),
    );
    const focus = AppState.addEventListener("change", (s) =>
      focusManager.setFocused(s === "active"),
    );
    return () => {
      network();
      focus.remove();
    };
  }, []);
}
