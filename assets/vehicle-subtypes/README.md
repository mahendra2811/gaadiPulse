# GaadiPulse — Corrected Vehicle Subtypes (v2)

This is the replacement **`vehicle-subtypes/`** folder for the GaadiPulse Add Vehicle wizard. It corrects the previous overly abstract/distorted illustrations (especially motorcycle, scooter, sedan/SUV, truck and tipper) with distinct, consistently styled vehicle pictures.

## What is included

- **43** individual, square **512 × 512 PNG** illustrations, each with a clear name and separate background.
- `PREVIEW.png`: contact sheet for a visual review.
- `index.ts`: **static** Expo/Metro-friendly asset registry using `require('./filename.png')`. Do not construct dynamic `require()` paths at runtime.
- `vehicle-subtypes.json`: subtype IDs, labels and category associations.
- `vehicle-catalog.v2.json`: recommended visible subtype choices, extended choices, and meter defaults.
- `VehicleSubtypeSelector.example.tsx`: a mobile-first selector with 2-column cards, labels, accessibility and a More types toggle.
- `INTEGRATION.md`: exact instructions for removing old distorted assets and wiring the new ones.
- `ASSET_PROMPTS.md`: high-resolution per-subtype regeneration instructions if original artwork is required later.

## How to install

Move the **entire** folder into `GaadiPulse/assets/vehicle-subtypes/` (or your project's equivalent). Replace the old contents; old `.svg` illustrations may still be distorted, so remove unused legacy SVGs and update any imports that refer to them.

```text
GaadiPulse/
  assets/
    vehicle-subtypes/
      motorcycle.png
      scooter.png
      electric_scooter.png
      hatchback.png
      sedan.png
      compact_suv.png
      suv.png
      muv.png
      jeep.png
      pickup.png
      truck.png
      tipper.png
      tractor.png
      excavator.png
      ...
      index.ts
      vehicle-subtypes.json
```

Example:

```tsx
import { Image } from 'react-native';
import { getVehicleSubtypeImage } from '../assets/vehicle-subtypes';

<Image
  source={getVehicleSubtypeImage('motorcycle')}
  style={{ width: '100%', height: 128 }}
  resizeMode="contain"
/>
```

### IMPORTANT: prevent distortion

- **Never** use `resizeMode="stretch"` for these images.
- Use `contain` and a stable frame (`aspectRatio: 1`, or a centered fixed height).
- Do not overlay a second vehicle category picture over a subtype image.
- Do not use `ImageBackground` with `cover` and crop away the wheels.
- Use the exact subtype ID instead of fuzzy string matching (e.g. `motorcycle` versus `scooter`).
- The pictures are illustrative references, **not guaranteed to be exact model/year photos**.

## Default meter preferences

- Two-wheelers and four-wheelers: `KM` (editable).
- Road commercial vehicles: `KM` (editable). Tipper can *suggest* `BOTH`.
- Tractor, construction machinery and agricultural equipment: `HOURS` or `BOTH` suggestions as appropriate; always editable by the owner.
- Vehicle meter modes govern future forms: `KM`, `HOURS`, or `BOTH`. They are not derived from the illustration or registration number.

## Technical notes

The source art was generated in composition sheets and carefully cropped as individual assets. The supplied 512px images are upscaled from the source compositions; **these are not hand-drawn SVG vectors or individually native-512 source paintings**. They are intended for subtype selection cards on phones, not billboard-sized marketing graphics. For any particularly important standalone or branded vehicle artwork, regenerate it individually using `ASSET_PROMPTS.md`.

## License / use

Generated specifically for the GaadiPulse project. No manufacturer logos or accurate product representations are claimed. Do not imply affiliation with manufacturers based on illustrative appearances.
