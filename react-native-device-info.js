import Constants from "expo-constants";

export const getVersion = () => Constants.expoConfig?.version ?? "0.0.0";
export const getBundleId = () =>
  Constants.expoConfig?.ios?.bundleIdentifier ?? "";

export default { getVersion, getBundleId };
