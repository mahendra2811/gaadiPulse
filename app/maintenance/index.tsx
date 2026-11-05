import { Redirect } from "expo-router";

export default function MaintenanceRedirect() {
  return <Redirect href="/(tabs)/expenses" />;
}
