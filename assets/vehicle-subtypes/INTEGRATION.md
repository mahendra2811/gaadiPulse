# Integration guide — Replace the distorted vehicle-subtypes folder

## Replacement

1. Remove the old app's `assets/vehicle-subtypes/` files after backing up any custom assets.
2. Copy this folder as `assets/vehicle-subtypes/`.
3. Replace old imports and deprecated filenames with `getVehicleSubtypeImage(id)` from `assets/vehicle-subtypes/index.ts`.
4. If you had an app-side subtype catalog, merge it with `vehicle-catalog.v2.json` using subtype IDs, **not their visible labels**.
5. Do not duplicate categories or apply fuel type directly as the vehicle subtype; electric scooter is a visual subtype, but `energyType` and `meterMode` remain separate fields on Vehicle.
6. Test the chooser with 1, 2 and 3 columns at 320/360/430dp; use a two-column layout by default.
7. Confirm category changes reset invalid subtype selections but do not erase unrelated vehicle details.
8. Verify selected subtype renders properly in Garage cards, Add Vehicle flow and vehicle details.
9. After changes, run `npx expo start --clear` to invalidate Metro's asset cache.

## Example mapper

```ts
import { getVehicleSubtypeImage } from '@/assets/vehicle-subtypes';
const image = getVehicleSubtypeImage(vehicle.subtypeId ?? 'other');
```

## Screen behavior

- Category selection (`two_wheeler` / `four_wheeler` / `commercial` / `agriculture_heavy`) comes before subtype selection.
- Show recommended choices first and a **See all** control for rarer vehicles.
- Brand/model is optional and entered in the next step.
- A user can select **Other** and provide a free-text subtype name; **never** force a model from a fixed catalog.
- Default selected subtype is none for a new vehicle, except when editing an existing vehicle.
- For personal one-vehicle Garage, never force selection again on entry forms.

## Example card

```tsx
<Pressable
  accessibilityRole="radio"
  accessibilityState={{ selected: selectedId === subtype.id }}
  onPress={() => onChange(subtype.id)}
  style={{ padding: 12, borderRadius: 20, borderWidth: selectedId === subtype.id ? 2 : 1 }}
>
  <Image
    source={subtype.image}
    resizeMode="contain"
    style={{ width: '100%', height: 120 }}
  />
  <Text numberOfLines={2}>{subtype.label}</Text>
</Pressable>
```

## Replacing old snake/kebab names

The catalog uses snake_case for multi-word IDs (`compact_suv`, `electric_scooter`, `mini_truck`). These are database-friendly stable IDs. Do not convert them into dynamic file import paths. `index.ts` maps each ID to a static require.

## Visual acceptance

- Motorcycle has two recognizable wheels, fork, fuel tank, seat and handlebars.
- Scooter/moped have step-through/scooter styling and are distinct from motorcycle.
- Sedan and hatchback visibly differ in trunk/body shape.
- SUV/MUV have larger/taller cabins with distinct profiles.
- Pickup has an open cargo bed; truck has a distinct cargo body.
- Tipper has a raised dump bed.
- Tractor has unequal-size wheels and agricultural proportions.
- Excavator, backhoe, crane, loader and forklift appear as separate machines.
- All images are **square with `contain`**; no cut-off wheels or stretched body.
