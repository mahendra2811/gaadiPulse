# Asset production and provenance

The supplied `my docs/assets` kit is preserved. Its programmatically authored SVGs and corresponding local PNGs are copied into root `assets/`; no manufacturer photos or remote image requests are used. Source provenance is the supplied project kit. `assets/brand/selected-logo-reference.png` is reference material; the starter SVG is a newly authored approximation, not an identical approved final logo.

`npm run assets` uses Sharp to regenerate the opaque Android store icon (1024×1024), adaptive foreground (432×432) and splash (1080×1920), then writes checked dimensions to `docs/asset-validation.json`. Adaptive background is forest green in app.config.ts. Source SVGs remain editable. `scripts/generate_assets.py` is the preserved full source-art generator and requires CairoSVG/Pillow if you wish to regenerate the entire original illustration set.

The five category images, three onboarding images, logo and empty-state art are statically bundled in `src/lib/assets.ts`. PNGs are the rasterized supplied SVG artwork and render on Android without unsupported SVG requires. Category illustrations use contain sizing. No asset implies an actual vehicle model photograph or uploaded user file.

To replace the logo, retain the chosen reference, replace `app-icon.svg` and `adaptive-icon-foreground.svg` with approved vector artwork inside the Android safe region, run the asset script, inspect round/squircle masks and rebuild native binaries. Do not add text to the launcher mark.

The source prompts and additional optional asset specifications remain in `PROJECT_REFERENCE.md` and `docs/IMAGE_GENERATION_PROMPTS.md`. A store feature graphic and screenshots must be produced from an approved final build; no fabricated Play screenshots or claims are included. Capture actual devices in light/dark at 320–430dp, with no private account data; inspect safe areas, keyboards and enlarged type. The 1024px store icon is provided; final feature graphic/store screenshots await a verified release build.
