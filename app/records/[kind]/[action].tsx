import { useLocalSearchParams } from "expo-router";
import {
  RecordForm,
  RecordDetail,
  RecordAnalytics,
} from "@/src/features/records/screens";
export default function RecordAction() {
  const { action } = useLocalSearchParams<{ action: string }>();
  return action === "add" || action === "edit" ? (
    <RecordForm />
  ) : action === "analytics" ? (
    <RecordAnalytics />
  ) : (
    <RecordDetail />
  );
}
