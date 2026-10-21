# Codex Terminal — Correct vehicle subtype illustrations and selection screen

Copy the prompt below into Codex from the GaadiPulse repository root, **after** extracting this folder into `assets/vehicle-subtypes/`.

---

You are working on GaadiPulse. Replace the old distorted vehicle subtype assets and fully implement the subtype selector using the supplied `assets/vehicle-subtypes/` directory.

1. Read `assets/vehicle-subtypes/README.md`, `INTEGRATION.md`, `vehicle-catalog.v2.json`, `index.ts`, and `VehicleSubtypeSelector.example.tsx`.
2. Remove/stop importing old flat SVG silhouettes and wrongly stretched PNG assets. Preserve any unrelated assets.
3. Import from `assets/vehicle-subtypes/index.ts`; do NOT form dynamic require strings. Use exact static mappings for every subtype ID.
4. Use 2-column responsive cards; on small Android devices (320–360dp) cards must not overlap or crop. Use `resizeMode="contain"`, stable image frames, rounded cards, emerald selected border, subtle press animation, optional haptics and accessibility selected state.
5. Show the current category's common choices first; support See All and search; use `other` for manual entry.
6. Implement category → subtype → optional brand/model → details → meter mode selection. Preserve KM/HOURS/BOTH defaults as suggestions only; owner must be allowed to override.
7. Ensure garage cards and vehicle switcher use the selected subtype image in addition to the subtype selection wizard. Fallback safely to `other` if an old stored subtype is unknown.
8. Keep subtype images as purely illustrative; never auto-populate model year, VIN, fuel type or tank capacity from the image.
9. Add testing: image integrity/nonzero load, all catalog IDs have an asset, category filtering, subtype selection, reset invalid subtype on category change, small-screen layout and rotation.
10. Run type-check, lint, tests and an Expo build/resolution check. Fix errors before reporting completion. Provide changed files and actual command outcomes.

---
