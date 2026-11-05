> Current update (2026-10-24): root assets now use the user's updated `my docs/assets/` pack. Subtype artwork is the 43-image v2 PNG registry, replacing legacy subtype SVGs. See ASSETS.md and assets/vehicle-subtypes/README.md for current provenance/integration. Earlier starter-art descriptions below are historical.

# Visual asset manifest and requirements

## Current logo assets (5 November 2026)

The user-supplied originals are in `assets/media/logo/new/`. The dark square (`02-square-dark.png`) is the main mark and splash source; `03-square-light.png` is available for light surfaces, and `05-circle-light.png` is used for circular marks. The light-background wordmark is `07-header-transparent.png` and the dark-background wordmark is `08-header-dark.png`. These files remain the source of truth for the brand; older logo descriptions below are historical.

`node scripts/build-brand-assets.mjs` derives the launcher icon, adaptive foreground, favicon and monochrome notification icon in `assets/brand/generated/`. Expo config references those generated assets. For an existing local Android native tree, run `node scripts/build-brand-assets.mjs --android` to update its generated resources and notification-icon metadata. The Android directory is ignored by Git, so regenerate or refresh it on other machines. Launcher, notification and splash changes require a new native build and installation; refreshing the web app cannot update an installed app.

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
