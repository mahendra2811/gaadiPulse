/** Derive release assets from the user-supplied logo files. Run with --android to refresh the existing local native resources. */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const source = "assets/media/logo/new/";
const output = "assets/brand/generated/";
await mkdir(output, { recursive: true });
const dark = `${source}02-square-dark.png`;
const symbol = `${source}01-symbol-transparent.png`;
await sharp(dark).resize(1024, 1024).flatten({ background: "#003d32" }).png().toFile(`${output}app-icon.png`);
await sharp(dark).resize(96, 96).png().toFile(`${output}favicon.png`);
const foreground = await sharp(symbol).resize(280, 280, { fit: "contain" }).png().toBuffer();
await sharp({ create: { width: 432, height: 432, channels: 4, background: "#00000000" } }).composite([{ input: foreground, gravity: "centre" }]).png().toFile(`${output}adaptive-foreground.png`);
const alpha = await sharp(symbol).resize(72, 72, { fit: "contain" }).extractChannel("alpha").threshold(140).toBuffer();
const white = await sharp({ create: { width: 72, height: 72, channels: 3, background: "#ffffff" } }).joinChannel(alpha).png().toBuffer();
await sharp({ create: { width: 96, height: 96, channels: 4, background: "#00000000" } }).composite([{ input: white, gravity: "centre" }]).png().toFile(`${output}notification-icon.png`);
if (process.argv.includes("--android")) {
  const densities = [["mdpi",48,108,288],["hdpi",72,162,432],["xhdpi",96,216,576],["xxhdpi",144,324,864],["xxxhdpi",192,432,1152]];
  for (const [density, launcher, adaptive, splash] of densities) {
    const mipmap = `android/app/src/main/res/mipmap-${density}`;
    const drawable = `android/app/src/main/res/drawable-${density}`;
    await mkdir(mipmap, { recursive: true }); await mkdir(drawable, { recursive: true });
    for (const name of ["ic_launcher", "ic_launcher_round"]) await sharp(`${output}app-icon.png`).resize(launcher, launcher).webp({ lossless: true }).toFile(`${mipmap}/${name}.webp`);
    await sharp(`${output}adaptive-foreground.png`).resize(adaptive, adaptive).webp({ lossless: true }).toFile(`${mipmap}/ic_launcher_foreground.webp`);
    await sharp(dark).resize(splash, splash).png().toFile(`${drawable}/splashscreen_logo.png`);
  }
}
