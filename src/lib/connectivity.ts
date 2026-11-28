import { useEffect, useSyncExternalStore } from "react";
import {
  addEventListener,
  fetch as fetchNetworkState,
  type NetInfoState,
} from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import {
  clearNetworkHealthTimer,
  getNetworkStatus,
  setNetworkAvailability,
  subscribeNetworkStatus,
} from "./networkHealth";

function updateNetwork(state: NetInfoState) {
  const connected = state.isConnected;
  const reachable = state.isInternetReachable;
  onlineManager.setOnline(connected !== false && reachable !== false);
  setNetworkAvailability(connected, reachable);
}

export function useConnectivity() {
  useEffect(() => {
    let active = true;
    let observedEvent = false;
    const unsubscribe = addEventListener((state) => {
      observedEvent = true;
      updateNetwork(state);
    });
    void fetchNetworkState()
      .then((state) => {
        if (active && !observedEvent) updateNetwork(state);
      })
      .catch(() => {
        // NetInfo events remain the source of truth if its one-time fetch fails.
      });
    return () => {
      active = false;
      unsubscribe();
      clearNetworkHealthTimer();
    };
  }, []);
}

export function useNetworkStatus() {
  return useSyncExternalStore(
    subscribeNetworkStatus,
    getNetworkStatus,
    getNetworkStatus,
  );
}
