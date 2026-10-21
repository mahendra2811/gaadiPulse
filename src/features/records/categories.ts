export function permissionLabel(key: string) {
  const labels: Record<string, string> = {
    "fuel.read": "View fuel and amounts",
    "fuel.create": "Add fuel",
    "fuel.edit_own": "Edit own fuel",
    "expenses.read": "View expenses and amounts",
    "expenses.create": "Add expenses",
    "expenses.edit_own": "Edit own expenses",
    "meters.read": "View meter observations",
    "meters.create": "Add meter observations",
    "progress.submit": "Submit daily progress",
    "progress.view": "View progress history",
    "progress.edit_own": "Edit own progress",
    "reports.read": "View permitted reports and exports",
    "documents.read": "View document details",
    "documents.create": "Add document details",
    "reminders.read": "View shared reminders",
    "reminders.create": "Add reminders",
  };
  return labels[key] ?? key;
}
