const { withAndroidManifest } = require("expo/config-plugins");

const OPTIONAL_FEATURES = [
  "android.hardware.screen.portrait",
  "android.hardware.wifi",
];

module.exports = function withOptionalAndroidFeatures(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const features = manifest["uses-feature"] ?? [];

    for (const name of OPTIONAL_FEATURES) {
      const feature = features.find(
        (entry) => entry.$["android:name"] === name,
      );
      if (feature) {
        feature.$["android:required"] = "false";
      } else {
        features.push({
          $: { "android:name": name, "android:required": "false" },
        });
      }
    }

    manifest["uses-feature"] = features;
    return mod;
  });
};
