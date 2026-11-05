import { Image, View } from "react-native";

const banners = {
  garage: {
    source: require("../../../assets/media/banner-garage.webp"),
    label: "All vehicles, one garage: vehicle profiles and meter tracking.",
  },
  fuel: {
    source: require("../../../assets/media/banner-fuel.webp"),
    label: "Fuel and charging: track fills and energy use.",
  },
  expenses: {
    source: require("../../../assets/media/banner-expenses.webp"),
    label: "Expenses and service: keep track of vehicle costs.",
  },
  progress: {
    source: require("../../../assets/media/banner-progress.webp"),
    label: "Daily progress: record trips, meter readings, and custom fields.",
  },
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
