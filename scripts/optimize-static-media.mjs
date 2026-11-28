/** Build compact derivatives from supplied source artwork; never overwrite originals. */
import sharp from "sharp";

const result = await sharp("assets/media/all_vehicle.png")
  .webp({ quality: 82, effort: 6 })
  .toFile("assets/media/all_vehicle.webp");

console.log(
  `Created ${result.width}x${result.height} onboarding artwork (${result.size} bytes).`,
);
