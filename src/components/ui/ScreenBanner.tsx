import { Image } from "expo-image";
import { View } from "react-native";
import { t } from "@/src/lib/i18n";

const banners = {
  garage: {
    source: require("../../../assets/media/banner-garage.webp"),
    labelKey: "bannerGarage",
  },
  fuel: {
    source: require("../../../assets/media/banner-fuel.webp"),
    labelKey: "bannerFuel",
  },
  expenses: {
    source: require("../../../assets/media/banner-expenses.webp"),
    labelKey: "bannerExpenses",
  },
  progress: {
    source: require("../../../assets/media/banner-progress.webp"),
    labelKey: "bannerProgress",
  },
  reports: {
    source: require("../../../assets/media/banner-reports.webp"),
    labelKey: "bannerReports",
  },
} as const;

export type ScreenBannerName = keyof typeof banners;

export function ScreenBanner({ name }: { name: ScreenBannerName }) {
  const banner = banners[name];
  const label = t(banner.labelKey);
  return (
    <View style={{ width: "100%", maxWidth: 900, alignSelf: "center" }}>
      <Image
        source={banner.source}
        accessibilityLabel={label}
        contentFit="contain"
        priority="low"
        cachePolicy="memory-disk"
        transition={0}
        style={{ width: "100%", aspectRatio: 3, borderRadius: 16 }}
      />
    </View>
  );
}
