# Single-image regeneration prompts — GaadiPulse vehicle subtypes

Use these prompts if a particular image needs higher fidelity than the included composited 512px card asset. **Generate one vehicle per image**, not a sheet of many images, to avoid small-source details and distorted wheels.

## Universal style instructions (prepend to every prompt)

> Create a single photorealistic-but-stylized 3D editorial vehicle illustration for a premium Indian Android app called GaadiPulse. Exactly one vehicle, correct real-world vehicle geometry, convincing wheels/axles/handlebars and body type, clean 3/4 side view, entirely visible in frame, not cropped. No extra vehicle, no manufacturer logo, no labels, no words, no watermark, no license plate details. Soft off-white background with very faint mint circular halo and subtle ground shadow. Balanced framing for a 1:1 app card, subject centered and filling about 75–85% of canvas. Teal/forest-green plus neutral vehicle palette; accurate wheel count and appropriate proportions, consistent soft studio lighting. At least 1024 × 1024 square output.

## Subject-specific additions

| ID | Vehicle-specific addition |
|---|---|
| `motorcycle` | Standard Indian commuter motorcycle, exposed frame, engine, recognizable fuel tank, long seat, **exactly two wheels** and correct front fork/handlebars. |
| `scooter` | Step-through automatic petrol scooter, compact body and footboard, exactly two wheels. |
| `electric_scooter` | Sleek step-through electric scooter, no exhaust, battery-type body design, exactly two wheels. |
| `electric_motorcycle` | Modern electric motorcycle, larger wheels than scooter, conventional motorcycle seating, no exhaust. |
| `moped` | Lightweight step-through low-speed two-wheeler, distinguish from sports motorcycle. |
| `hatchback` | Small compact five-door hatchback, visibly short rear overhang, two axles. |
| `sedan` | Three-box 4-door sedan with clearly defined trunk, two axles. |
| `compact_suv` | Sub-four-meter-style compact SUV, upright cabin and high ground clearance. |
| `suv` | Full-size family SUV, taller larger body, roof rails and high ground clearance. |
| `muv` | 7–8 seat family MPV, longer cabin and roofline, sliding-door-style proportions. |
| `jeep` | Rugged boxy off-road 4x4, upright windshield, spare wheel or offroad tyres. |
| `auto` | Indian 3-wheel auto-rickshaw with canopy; **exactly three wheels**; not a car or six-wheeler. |
| `taxi` | Sedan taxi with small clearly legible generic taxi roof sign, no brand trademarks. |
| `van` | Compact commercial panel van with sliding side door, tall body. |
| `pickup` | Single/double-cab pickup truck with **open cargo bed**. |
| `mini_truck` | Small cab-over-engine mini cargo truck with open/light-duty cargo area. |
| `truck` | Medium rigid goods carrier, distinct cargo box, proper wheel/axle placement. |
| `heavy_truck` | Heavy multi-axle cargo truck, realistic wheel placement and long load body. |
| `tipper` | Multi-axle dump truck, visibly **raised tipping bed** and proper hydraulic orientation. |
| `bus` | Indian passenger bus with elongated body, large windows, multiple rows of seats. |
| `tanker` | Road tanker truck with cylindrical tank, securely mounted, correct axles. |
| `tractor` | Agricultural tractor with larger rear wheels and smaller front wheels. |
| `excavator` | Tracked hydraulic excavator with articulated boom, bucket and tracks. |
| `backhoe_loader` | Tractor-like backhoe loader with front loader bucket and rear articulated digging arm. |
| `loader` | Four-wheel front wheel loader with large loading bucket. |
| `crane` | Mobile telescopic truck crane, long boom and suspended hook, correct supports. |
| `generator` | Trailer-mounted or box-shaped industrial diesel genset, vents and housing. |
| `compressor` | Wheeled towable industrial air compressor, vented enclosure and tow bar. |
| `forklift` | Four-wheel industrial forklift with visible vertical mast and raised forks. |
| `road_roller` | Road construction vibratory roller with front steel drum. |
| `bulldozer` | Tracked crawler bulldozer with broad front blade. |
| `grader` | Motor grader with long frame and central grading blade. |
| `other` | Neutral all-purpose vehicle silhouette with an abstract plus symbol; no specific brand. |

## Save rule

Save as `assets/vehicle-subtypes/{id}.png` (1:1, minimum 512px). Keep the ID unchanged so the static `index.ts` registry continues to work.
