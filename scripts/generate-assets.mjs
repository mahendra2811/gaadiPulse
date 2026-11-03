/** Import the user-maintained artwork without regenerating obsolete illustrations. */
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const source = new URL("../my docs/assets/", import.meta.url);
const destination = new URL("../assets/", import.meta.url);
await mkdir(destination, { recursive: true });
await cp(source, destination, {
  recursive: true,
  force: true,
  filter: (path) => !path.split("/").some((part) => part.startsWith(".")),
});
// The replacement pack has PNG artwork; remove the obsolete distorted subtype SVGs.
const subtypePath = new URL("vehicle-subtypes/", destination);
const sourceNames = new Set(
  await readdir(new URL("vehicle-subtypes/", source)),
);
for (const name of await readdir(subtypePath)) {
  if (name.endsWith(".svg") && !sourceNames.has(name))
    await rm(new URL(name, subtypePath));
}
console.log(`Imported supplied artwork from ${fileURLToPath(source)}`);
