# Asset manifest

## Bundled application assets

- `assets/vehicle-subtypes/` — 43 subtype PNGs, their static Metro registry, and the catalog consumed by the garage selector.
- `assets/media/all_vehicle.png` and `assets/images/auth/gaadipulse-auth-hero.png` — onboarding and sign-in artwork.
- `assets/media/logo/new/` — logo source images used in the app and by the brand asset generator.
- `assets/media/banner-{garage,fuel,expenses,progress,reports}.webp` — feature banners, displayed at their 3:1 source ratio with contain scaling.
- `assets/brand/generated/` — Expo launcher icon, adaptive foreground, favicon and notification icon.

`logo_white_background.png` is the source for the launcher icon, favicon and launch splash. The adaptive icon uses the matching transparent logo symbol over white; the notification icon remains a monochrome symbol.

`node scripts/build-brand-assets.mjs` regenerates the derived brand assets. Run it with `--android` to refresh generated resources in an existing local Android project. The app configuration references these generated files and the current logo source for its splash screen.

The remaining bundled images are directly imported by app code or required by the static subtype registry. There is no artwork mirror or asset-copy script. See [ASSETS.md](ASSETS.md) and `assets/vehicle-subtypes/README.md` for integration and provenance.
