# Implemented design system

`src/lib/theme.tsx` owns light/dark tokens: forest `#122C2A`, emerald `#147D69`, mint `#24C48E`, background `#F7F8FA`; dark backgrounds preserve readable ink and controls. Profile theme is persisted to the server, defaults to device setting, and applies through ThemeContext. English is selected; Hindi stays disabled.

Shared controls use 52dp minimum button/input heights, 16dp control radius, 20dp card radius and 20dp gutters. All text permits system scaling. Four floating tabs have 18dp margins, 12dp safe-area gap and a selected pill; secondary routes cover the tabs. Forms use a keyboard-aware fixed bottom Save/Continue action. Scroll padding includes floating controls and system inset.

LoadingLine is indeterminate unless a measured progress value is explicitly supplied; reduced motion uses a stationary accessible indicator. PageLoadCoordinator ignores stale route generations, clears on errors and counts only completed prerequisites. Query-driven screens keep loading until required queries settle. Alerts confirm draft navigation and archive actions. Toast messages announce to accessibility and can be dismissed manually.

`src/components/ui` contains AppText, AppButton, InputField, Card, Screen, Sheet, ConfirmDialog, ToastProvider, LoadingLine, Skeleton, EmptyState, ErrorState, ErrorBoundary and typed form primitives. Product strings live in `src/lib/i18n.ts`; make/model labels and entered subtype identifiers are data. Native TalkBack, 320dp, large-font and keyboard testing require the documented manual verification; automated checks alone do not prove accessibility.

## UI refresh — 2026-10-24

Home now uses an emerald/teal/blue vehicle hero, paired monthly spending cards, colorful icon actions, compact activity/reminder rows and expandable secondary tools. Neutral slate surfaces support light/dark themes. Gradients use bundled SVG drawing primitives; no new native dependency or remote artwork is required. Shallow elevation gives cards depth without changing data semantics.

The four floating tabs remain; More opens an animated right drawer at 82% viewport width, capped at 460dp on larger screens. It retains per-vehicle permission gates and groups quick add, vehicle tools, owner controls and account/support. Direct More links open the drawer over Home. Backdrop, close control and Android modal Back dismiss it. Press feedback and drawer/section transitions honor system reduced motion.

Garage uses two-column compact cards with square subtype art, name/type and role/meter badges; tapping a card opens details. Add Vehicle category choices use updated subtype artwork rather than the old category silhouettes. Its five choices form a tight two-column grid with the final machinery option spanning the row. The six-stage wizard shows step count and stage markers, allows returning to earlier steps, scrolls to top when stages change, validates the current step and uses a raised gradient Continue/Save footer. Brand/model and energy/meter controls use wrapping chips; review uses a compact image and labeled values.

Only source implementation and formatting were performed in this refresh. Browser/device layout, animations, TalkBack, keyboard and large-text behavior have not been verified. The user-reported missing useEffect import and web SVG accessible-attribute warning were corrected in source; no runtime success is claimed.

## Secondary pages — 2026-10-24 follow-up

Home stays as approved. Secondary headers have a subtle surface tint/border. More now slides from the **left**, using 75% width (460dp cap). A shared FloatingNavigation bar covers browsing destinations outside the tab navigator, while action forms and sensitive Auth/security flows remain focused without the bar.

RecordCard and RecordSummary standardize fuel/expense/progress/document/reminder/meter lists and details. SearchField offers a leading icon, clear control and focus treatment. FilterChips avoids tall stacks of period/status buttons; InfoRows gives compact wrapping label/value pairs. Owner grant/default controls and additional filters expand only when requested. Read/write permission gates remain server-authoritative.

DatePickerField uses calendar/clock UI for Android, a picker sheet for iOS and browser date/time inputs on web. ISO timestamps remain internal values. Date-only answers remain date-only; no inferred meter timestamps were added. These changes were formatted but have not been tested on devices or in browsers.

Fuel fields are constrained by the chosen vehicle profile; units are read-only. Shared Timestamp components display readable dates and clock-icon 12-hour times. Meter history uses compact reading cards with expandable provenance/correction controls rather than tall metadata blocks. Confirmation dialogs use the app theme with explicit Keep editing/Leave actions. Toasts are compact, content-sized, closable pills with a three-second auto-dismiss and a maximum width of 360dp. These source changes passed TypeScript checks; browser/device visual and timing QA remain pending.

The original inline toast has been removed. ToastHost is now a separate content-sized surface (max 300dp), centered text, small tonal icon, X and a real three-second countdown line. Confirmation dialogs share compact icon-led styling but keep explicit decisions and do not auto-close. The More drawer header is similarly compact. Foreground reminders use the toast; background reminder appearance remains platform-controlled.
