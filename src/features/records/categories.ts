import { t } from "@/src/lib/i18n";

export function permissionLabel(key: string) {
  const labels: Record<string, Parameters<typeof t>[0]> = {
    "fuel.read": "permissionFuelRead",
    "fuel.create": "permissionFuelCreate",
    "fuel.edit_own": "permissionFuelEditOwn",
    "expenses.read": "permissionExpensesRead",
    "expenses.create": "permissionExpensesCreate",
    "expenses.edit_own": "permissionExpensesEditOwn",
    "meters.read": "permissionMetersRead",
    "meters.create": "permissionMetersCreate",
    "progress.submit": "permissionProgressSubmit",
    "progress.view": "permissionProgressView",
    "progress.edit_own": "permissionProgressEditOwn",
    "reports.read": "permissionReportsRead",
    "documents.read": "permissionDocumentsRead",
    "documents.create": "permissionDocumentsCreate",
    "reminders.read": "permissionRemindersRead",
    "reminders.create": "permissionRemindersCreate",
  };
  const label = labels[key];
  return label ? t(label) : key;
}
