import { releaseFeatures } from "@/src/features/release/scope";
import { DeferredFeature } from "@/src/features/release/DeferredFeature";
import Advanced from "@/src/features/progress/Builder";
export default function Route() {
  return releaseFeatures.advancedTools ? <Advanced /> : <DeferredFeature />;
}
