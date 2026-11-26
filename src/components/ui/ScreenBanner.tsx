import { Image, View } from "react-native";

const banners = {
  reports: {
    source: require("../../../assets/media/banner-reports.webp"),
    label: "Owners and pilots: access, approvals, and reports.",
  },
};

export type ScreenBannerName = keyof typeof banners;

export function ScreenBanner({ name }: { name: ScreenBannerName }) {
  const banner = banners[name];
  return (
    <View style={{ width: "100%", maxWidth: 900, alignSelf: "center" }}>
      <Image
        source={banner.source}
        accessibilityRole="image"
        accessibilityLabel={banner.label}
        resizeMode="contain"
        style={{ width: "100%", aspectRatio: 3, borderRadius: 16 }}
      />
    </View>
  );
}
