# Implemented design system

`src/lib/theme.tsx` owns light/dark tokens: forest `#122C2A`, emerald `#147D69`, mint `#24C48E`, background `#F7F8FA`; dark backgrounds preserve readable ink and controls. Profile theme is persisted to the server, defaults to device setting, and applies through ThemeContext. English is selected; Hindi stays disabled.

Shared controls use 52dp minimum button/input heights, 16dp control radius, 20dp card radius and 20dp gutters. All text permits system scaling. Four floating tabs have 18dp margins, 12dp safe-area gap and a selected pill; secondary routes cover the tabs. Forms use a keyboard-aware fixed bottom Save/Continue action. Scroll padding includes floating controls and system inset.

LoadingLine is indeterminate unless a measured progress value is explicitly supplied; reduced motion uses a stationary accessible indicator. PageLoadCoordinator ignores stale route generations, clears on errors and counts only completed prerequisites. Query-driven screens keep loading until required queries settle. Alerts confirm draft navigation and archive actions. Toast messages announce to accessibility and can be dismissed manually.

`src/components/ui` contains AppText, AppButton, InputField, Card, Screen, Sheet, ConfirmDialog, ToastProvider, LoadingLine, Skeleton, EmptyState, ErrorState, ErrorBoundary and typed form primitives. Product strings live in `src/lib/i18n.ts`; make/model labels and entered subtype identifiers are data. Native TalkBack, 320dp, large-font and keyboard testing require the documented manual verification; automated checks alone do not prove accessibility.
