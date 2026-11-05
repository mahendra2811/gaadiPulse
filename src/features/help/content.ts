export type HelpSection = {
  title: string;
  questions: { question: string; answer: string }[];
};
export const helpSections: HelpSection[] = [
  {
    title: "Getting started",
    questions: [
      {
        question: "How do I sign in?",
        answer:
          "Use the available Google, email and password, or email-code option on the sign-in screen. Verify your email when asked, then complete your profile.",
      },
      {
        question: "Can I use the app without a vehicle?",
        answer:
          "Yes. Add one later from Garage, or sign in with the verified email an Owner used to grant you access.",
      },
      {
        question: "How do I add a vehicle?",
        answer:
          "Open More → Garage → Add vehicle. Choose its category and details, energy type, meter mode and time zone, then save.",
      },
      {
        question: "What if my vehicle has no registration yet?",
        answer:
          "Provide a vehicle name or model instead. Registration is optional when another identifying detail is supplied.",
      },
      {
        question: "How do I switch vehicles?",
        answer:
          "Use the vehicle switcher when more than one active vehicle is available. Entries and reports apply to the selected vehicle.",
      },
      {
        question: "What do KM, HOURS and BOTH mean?",
        answer:
          "Choose KM for distance, HOURS for engine use, or BOTH if you record both. Readings are optional on fuel and expense entries.",
      },
    ],
  },
  {
    title: "Fuel and efficiency",
    questions: [
      {
        question: "How do I add fuel or charging?",
        answer:
          "Open Fuel and add an entry. Check the vehicle, date, energy type and unit; enter any two of quantity, unit price and amount, then review and save.",
      },
      {
        question: "What is a full or partial fill?",
        answer:
          "Mark a fill as full only when the tank was actually filled. Partial quantities between two qualifying full fills contribute to the full-to-full calculation.",
      },
      {
        question: "Can I save fuel without a meter reading?",
        answer:
          "Yes. Save the entry without KM or HOURS. A missing or incorrectly timed reading can prevent an efficiency interval from qualifying.",
      },
      {
        question: "Can I add a reading later?",
        answer:
          "Yes. Record the actual observed time. Only associate a reading with the original fill time if you truly observed it then; do not guess or backdate it.",
      },
      {
        question: "Why is fuel efficiency unavailable?",
        answer:
          "It needs qualifying full-to-full fills with compatible fuel units and matching, truthful meter readings. Missing readings, resets or inconsistent history can make an interval unavailable.",
      },
      {
        question: "What does the efficiency average mean?",
        answer:
          "Insights uses total distance divided by fuel, or fuel divided by engine hours, across qualifying intervals. An interval is shown under its closing fill date; it is not a measurement for each intervening day.",
      },
    ],
  },
  {
    title: "Expenses and readings",
    questions: [
      {
        question: "How do I add an expense?",
        answer:
          "Open Expenses → Add, check the vehicle, choose a category, enter the amount and date, and save. Add a title, vendor, payment method or notes as needed.",
      },
      {
        question: "Should fuel also be entered as an expense?",
        answer:
          "Record fuel in Fuel. Entering the same purchase as an expense too would count it twice in reports.",
      },
      {
        question: "How are EMI amounts handled?",
        answer:
          "Enter available principal and interest details. Reports distinguish operating cost, financing and unclassified amounts from cash outflow.",
      },
      {
        question: "Can I save an expense without KM or HOURS?",
        answer:
          "Yes. Both are optional. Record a reading only when it was actually observed and give its correct observation time.",
      },
      {
        question: "How do I add a separate meter reading?",
        answer:
          "Open More → Add meter reading, choose the vehicle and meter type, enter the observed value and time, then save.",
      },
      {
        question: "Why was a reading rejected?",
        answer:
          "A reading must fit the surrounding active readings for that meter and vehicle. Check its value and observed time; use the correction or reset workflow when appropriate.",
      },
    ],
  },
  {
    title: "Sharing and roles",
    questions: [
      {
        question: "How do I share a vehicle?",
        answer:
          "An Owner opens the vehicle’s members screen, enters the person’s email, selects Owner or Pilot, reviews permissions and grants access.",
      },
      {
        question: "Does the recipient accept an invitation?",
        answer:
          "No acceptance step is needed. Access resolves after the person signs in with the granted verified email; an existing verified account can receive access immediately.",
      },
      {
        question: "What can an Owner do?",
        answer:
          "Owners manage the vehicle, members and available permissions, and can work with its records and reports. The protected primary administrator has additional safeguards.",
      },
      {
        question: "What can a Pilot do?",
        answer:
          "A Pilot can view or add fuel, expenses and meter readings when permitted. Access is per vehicle and may be restricted by the Owner; Pilot history is limited to today and yesterday in the vehicle time zone.",
      },
      {
        question: "Can a Pilot edit or delete entries?",
        answer:
          "The current Pilot policy does not allow editing or deleting Pilot records. Ask an Owner to review a correction or deletion.",
      },
      {
        question: "Can the same person have different roles?",
        answer:
          "Yes. A person can be an Owner on one vehicle and a Pilot on another. Each vehicle has its own access settings.",
      },
      {
        question: "How do I change or remove access?",
        answer:
          "An Owner opens Members for that vehicle and edits or revokes the member or outstanding grant. Protected administrator rules may prevent certain changes.",
      },
      {
        question: "Why can’t a shared vehicle be seen?",
        answer:
          "Confirm the email was verified, the grant is active, and the right account is signed in. Ask the Owner to check the member and permission settings.",
      },
    ],
  },
  {
    title: "Documents and reminders",
    questions: [
      {
        question: "How do I record a document?",
        answer:
          "Open More → Document details, add its title and available information and expiry date, then save. This records metadata; file upload is not available.",
      },
      {
        question: "Are document details official proof?",
        answer:
          "No. Entries are reminders and personal records, not legal RC or licence documents. Use the relevant official source for proof.",
      },
      {
        question: "How do I create a reminder?",
        answer:
          "Open More → Reminders and add one. Enter a title and at least a due date, KM threshold or HOURS threshold, choose recurrence if needed, and save.",
      },
      {
        question: "What can reminders be used for?",
        answer:
          "Use them for service, insurance, EMI, permits or other vehicle tasks. Set a date or a real meter threshold that suits the task.",
      },
      {
        question: "Can a document or expense create a reminder?",
        answer:
          "Eligible document expiry and EMI expense forms offer linked reminders. Maintenance details can also carry a next service date or meter threshold.",
      },
      {
        question: "How do recurring reminders work?",
        answer:
          "For a dated reminder choose monthly or yearly recurrence. Completing it advances its date; check the next date and meter thresholds after completion.",
      },
      {
        question: "Why didn’t a notification arrive?",
        answer:
          "Enable notifications in Settings and Android settings. Date alerts are local to the device and subject to system limits. Meter alerts depend on recorded readings and app reconciliation; GPS is not used.",
      },
      {
        question: "Can I complete or snooze a reminder?",
        answer:
          "Open the reminder details and use Complete or Snooze when you have permission. A recurring dated reminder advances when completed.",
      },
    ],
  },
  {
    title: "Reports, privacy and account",
    questions: [
      {
        question: "What is the difference between Insights and Reports?",
        answer:
          "Insights visualizes accessible spending, efficiency and measured intervals. Reports provides a period summary and JSON, CSV and PDF export.",
      },
      {
        question: "What is included in an export?",
        answer:
          "The selected period’s accessible records, meter observations, completed intervals and summary. Intervals may start before the selected period. CSV has filterable fields; JSON retains structured data.",
      },
      {
        question: "Who can see my vehicle data?",
        answer:
          "Access is per vehicle and controlled by roles, permissions and server policies. Share only with trusted people; someone who exports data can keep a copy.",
      },
      {
        question: "Does the app need an internet connection?",
        answer:
          "Yes. Loading and saving records requires a connection. Unsaved form changes remain only while the form stays open; they are not a durable offline draft.",
      },
      {
        question: "How do I change the appearance?",
        answer:
          "Open Settings → Appearance and choose System default, Light or Dark. System default follows your device appearance.",
      },
      {
        question: "How do I change my password?",
        answer:
          "Open Settings → Security and data and use Reset password. Follow the email flow for your account.",
      },
      {
        question: "What happens when I sign out?",
        answer:
          "Your session and current unsaved changes are cleared on this device, and scheduled local notifications are cleared. Signing out does not delete your server records.",
      },
      {
        question: "How do I request account deletion?",
        answer:
          "Open Settings → Request account deletion. Review the consequences and archive vehicles you administer as primary administrator first. The request revokes access; completion requires operator review.",
      },
      {
        question: "What if saving or loading fails?",
        answer:
          "Check your connection and permissions. Keep an unsaved form open and retry. For access problems, ask the vehicle Owner to check your grant.",
      },
      {
        question: "Where can I ask for privacy or deletion help?",
        answer:
          "Open Privacy and terms or Security and data for the operator contact. Include enough detail for the operator to identify the issue, but never send passwords or verification codes.",
      },
    ],
  },
];
