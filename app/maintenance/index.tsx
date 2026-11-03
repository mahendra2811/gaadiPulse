import { releaseFeatures } from "@/src/features/release/scope";
import { DeferredFeature } from "@/src/features/release/DeferredFeature";
import { Maintenance as Advanced } from "@/src/features/reports/screens";
export default function Route() {
  return releaseFeatures.advancedTools ? <Advanced /> : <DeferredFeature />;
}
