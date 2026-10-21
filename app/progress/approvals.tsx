import { RecordsList } from "@/src/features/records/screens";
export default function Approvals() {
  return <RecordsList fixedKind="progress" initialStatus="PENDING_REVIEW" />;
}
