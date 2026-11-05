import { releaseFeatures, supportsRecord } from "@/src/features/release/scope";
import { DeferredFeature } from "@/src/features/release/DeferredFeature";
import { Redirect, useLocalSearchParams } from "expo-router";
import {
  RecordForm,
  RecordDetail,
  RecordAnalytics,
} from "@/src/features/records/screens";
export default function RecordAction() {
  const { action, kind } = useLocalSearchParams<{
    action: string;
    kind: string;
  }>();
  if (kind === "progress") return <Redirect href="/(tabs)" />;
  if (
    !supportsRecord(kind) ||
    (action === "analytics" && !releaseFeatures.advancedTools)
  )
    return <DeferredFeature />;
  return action === "add" || action === "edit" ? (
    <RecordForm />
  ) : action === "analytics" ? (
    <RecordAnalytics />
  ) : (
    <RecordDetail />
  );
}
