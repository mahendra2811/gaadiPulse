# GaadiPulse design system

## Brand
Forest `#122C2A`; emerald `#147D69`; vibrant mint `#24C48E`; background `#F5F7F6`; surface white; secondary text `#697672`. Dark theme palette must preserve AA contrast and avoid neon-green-on-white text.

## Layout
- Safe-area aware; mobile widths 320–430dp primary; Android nav gestures and three-button system modes.
- Horizontal gutters 16–20dp, card radii 16–20dp, input radii 12–16dp, sticky CTA 54–58dp.
- Floating tab bar margin-x 16–20dp, bottom gap 12–16dp above safe inset, 64–72dp height, radius 24–28dp; 48dp min hit targets. Bottom list padding accounts for bar + inset.
- Header height responsive; 2dp loader directly below header. Vehicle summary below header on transactional forms.
- Loading: skeleton first, route-essential fetch line as actual measurable/indeterminate, toast after successful persistent write. Avoid full-screen blocking overlays during navigation after initial auth initialization.

## Motion
- 180–240ms motion for tab active pill, vehicle switcher spring, card opacity/translate entrance only when appropriate.
- `prefers-reduced-motion`/Android accessibility setting suppresses motion, including ongoing shimmer where needed.
- Haptics only on critical deliberate interactions, not on every scroll, with disabled support.

## Inputs
- Amount displays localized INR; integer paise persisted. Numeric keyboard for meter/amount, decimal validation for litres/hours.
- Progressive expense fields. Required label + meaningful inline validation + error summary for long dynamic forms.
- Top vehicle card selected from active vehicle; user can switch before saving and confirmation is required to move existing record.
- For unpaid/unknown/pending figures use explicit labels; never convert null to zero.

## Toast, dialogs and feedback
- Success toast brief with check icon and minimal motion.
- Error toast includes Retry when applicable and doesn't disappear during accessibility reading.
- Destructive confirmation dialog includes specific vehicle and record label.
- Empty state illustrates exact category and gives enabled first action.
- No nested native dropdowns that clip on small screens; use sheets.

## Typography
- System or bundled freely distributable font, scalable sizes from 12 to 28sp, tabular numerals for amounts/meters, accessible large-font layouts. Never package unrelated commercial fonts.
