# Visual asset manifest and requirements

All included imagery is newly created for this project and saved locally; no remote links or vendor/manufacturer copyrighted artwork required. Use Expo asset imports / bundled image static references. Local assets are real images; user receipts and vehicle photo uploads are **not** part of Phase 1.

## Initial assets already present
- `assets/app-icon.svg` / `.png`: generic brand-matched speedometer/pulse starter icon.
- `assets/onboarding-{1,2,3}.svg/.png`: welcome illustrations.
- `assets/vehicle-{two-wheeler,four-wheeler,commercial,agricultural,heavy-machinery}.svg/.png`: vehicle category art.

## Extension assets generated in this pack
- `assets/splash-hero.svg/.png` and `assets/auth-hero.svg/.png` for first-run flows.
- `assets/empty-{garage,fuel,expenses,progress,documents,reminders,offline,error}.svg/.png` contextual states.
- `assets/vehicle-subtypes/` compact vehicle-specific vector images and PNGs for `scooter`, `motorcycle`, `hatchback`, `sedan`, `suv`, `pickup`, `tipper`, `bus`, `tractor`, `excavator`, `loader`, `other`.
- `assets/adaptive-icon-foreground.png`, `assets/notification-icon.png`, `assets/splash-screen.png`, `assets/android-store-icon.png` and `assets/brand/selected-logo-reference.png`.

## Integration rules
- Reference `assets/` images through explicit static require/import (Metro can't require arbitrary calculated strings). Asset registry maps subtype ID to import.
- Preserve `assets/brand/selected-logo-reference.png` as reference to the user's preferred logo concept; never claim source SVG is identical to the generated PNG.
- Splash/launcher must fit Android adaptive icon mask; test dark/light/small density, exact pixel dimensions, no clipped speedometer pointer.
- Illustrations may be replaced in the future without schema or screen changes.
- Do not invent vehicle photos if model has no asset; category illustration is the fallback.
- PNG dimensions and actual generated file list can be inspected via `scripts/generate_assets.py`.

## Source provenance
Programmatically authored SVG and locally rasterized PNG images, bundled as editable project assets. No remote images fetched and no font files distributed.
