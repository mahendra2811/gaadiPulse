# Asset source and integration

The user-maintained `my docs/assets/` directory is the authoritative supplied artwork. Root `assets/` contains the app's imported copy. The 2026-10-24 update replaces the earlier subtype folder, including its obsolete SVG silhouettes, with the corrected v2 pack: 43 square PNG illustrations and a static Metro registry. The source folder remains unchanged.

`npm run assets` imports the supplied files exactly; it does not rasterize older SVGs over the updated PNGs. The Python compatibility entrypoint delegates to the same importer. Edit artwork in `my docs/assets/`, then import it again. Do not run the original starter-art generator from the reference kit against the current app assets.

`assets/vehicle-subtypes/index.ts` supplies all static requires. `src/lib/assets.ts` re-exports that mapping and resolves saved subtype IDs; unknown/custom IDs fall back to `other`. Add Vehicle uses a two-column selector with contained square images, common/all choices, search and manual Other entry. The same images appear on Garage cards, vehicle details, wizard review and the vehicle context/switcher.

The supplied catalog combines agricultural and heavy equipment. The app adapts that catalog to its existing five persisted categories: tractor/harvester remain agricultural; construction/stationary equipment remains heavy machinery. Other is available in every category. Existing records and subtype IDs are preserved. Meter defaults are suggestions only; energy type, model and meter mode remain separately editable.

All user-visible selector labels are in the English catalog. The copied example component remains reference material and is excluded from compilation; the actual component lives under `src/features/garage/`.

Provenance: see `assets/vehicle-subtypes/README.md`. The supplied subtype pack describes generated composition sheets cropped and upscaled to 512px; these are illustrative images, not native vector artwork or guaranteed model/year photographs. No additional image generation or external image download was performed. Other branding/onboarding/empty-state images come directly from the same supplied directory.

Expo launcher/adaptive/notification/splash references continue pointing at the copied PNGs in app.config.ts. Native launcher and splash changes require a rebuilt binary. Metro may retain cached images: restart with `npx expo start --clear` when previewing this update.

Source import, integration and formatting were performed. No tests, typecheck, lint, Expo build or device visual QA were run, per the user's testing deferral. Earlier dimension evidence in asset-validation.json describes the old generated set and is historical, not validation of this replacement. Store screenshots and final visual/native acceptance remain pending.
