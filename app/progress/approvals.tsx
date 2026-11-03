import { releaseFeatures } from "@/src/features/release/scope";
import { DeferredFeature } from "@/src/features/release/DeferredFeature";
import { RecordsList } from "@/src/features/records/screens";
export default function Approvals() {
  return !releaseFeatures.advancedTools ? (
    <DeferredFeature />
  ) : (
    <RecordsList fixedKind="progress" initialStatus="PENDING_REVIEW" />
  );
}
