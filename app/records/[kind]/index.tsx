import { Redirect, useLocalSearchParams } from "expo-router";
import { supportsRecord } from "@/src/features/release/scope";
import { DeferredFeature } from "@/src/features/release/DeferredFeature";
import { RecordsList } from "@/src/features/records/screens";
export default function Route() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  if (kind === "progress") return <Redirect href="/(tabs)" />;
  return supportsRecord(kind) ? <RecordsList /> : <DeferredFeature />;
}
