import { releaseFeatures } from "@/src/features/release/scope";
import { DeferredFeature } from "@/src/features/release/DeferredFeature";
import Advanced from "@/src/features/members/screens";
export default function Route() {
  return releaseFeatures.advancedTools ? <Advanced /> : <DeferredFeature />;
}
