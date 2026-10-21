import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
const assets = new URL("../assets/", import.meta.url);
const icon = await readFile(new URL("app-icon.svg", assets));
await sharp(icon)
  .resize(1024, 1024)
  .flatten({ background: "#122C2A" })
  .png()
  .toFile(new URL("android-store-icon.png", assets).pathname);
await sharp(new URL("adaptive-icon-foreground.svg", assets).pathname)
  .resize(432, 432)
  .png()
  .toFile(new URL("adaptive-icon-foreground.png", assets).pathname);
await sharp(new URL("splash-screen.svg", assets).pathname)
  .resize(1080, 1920)
  .png()
  .toFile(new URL("splash-screen.png", assets).pathname);
const result = [];
for (const [file, width, height] of [
  ["android-store-icon.png", 1024, 1024],
  ["adaptive-icon-foreground.png", 432, 432],
  ["splash-screen.png", 1080, 1920],
]) {
  const info = await sharp(new URL(file, assets).pathname).metadata();
  if (info.width !== width || info.height !== height)
    throw Error(`Invalid dimensions: ${file}`);
  result.push({ file, width, height });
}
await writeFile(
  new URL("../docs/asset-validation.json", import.meta.url),
  JSON.stringify(result, null, 2) + "\n",
);
console.log("Asset dimensions verified", result);
