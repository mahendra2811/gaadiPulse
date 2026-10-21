import { useEffect } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
export function useConnectivity() {
  useEffect(() => {
    const network = NetInfo.addEventListener((s) =>
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
