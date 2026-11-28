import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localeDir = path.join(root, "src/lib/i18n/locales");
const registry = JSON.parse(
  fs.readFileSync(path.join(localeDir, "registry.json"), "utf8"),
);
const english = JSON.parse(
  fs.readFileSync(path.join(localeDir, "en.json"), "utf8"),
);
const strict = process.argv.includes("--strict");
const failures = [];
const placeholders = (text) =>
  [...text.matchAll(/\{([^{}]+)\}/g)].map((match) => match[0]).sort();
const flatten = (value, prefix = "", output = new Map()) => {
  for (const [key, child] of Object.entries(value)) {
    if (!prefix && key.startsWith("_")) continue;
    const current = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      flatten(child, current, output);
    } else {
      output.set(current, child);
    }
  }
  return output;
};

const source = flatten(english);
for (const [key, value] of source) {
  if (typeof value !== "string" || !value.trim())
    failures.push(`en.json: empty/non-string ${key}`);
}

const catalogs = fs
  .readdirSync(localeDir)
  .filter((file) => file.endsWith(".json") && file !== "registry.json");
const seenCodes = new Set();
const coverage = [];
for (const file of catalogs) {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(localeDir, file), "utf8"),
  );
  const actual = flatten(catalog);
  const code =
    catalog._locale ??
    Object.entries(registry).find(
      ([, metadata]) => metadata.file === file,
    )?.[0];
  if (file !== "en.json" && typeof code !== "string")
    failures.push(`${file}: missing _locale metadata`);
  if (typeof code === "string") {
    if (seenCodes.has(code))
      failures.push(`${file}: duplicate locale code ${code}`);
    seenCodes.add(code);
  }
  if (file !== "en.json" && typeof code === "string") {
    if (file.slice(0, -5) !== code.split("-")[0])
      failures.push(
        `${file}: filename does not match its locale language code`,
      );
    if (catalog._fallback !== "en-IN")
      failures.push(`${file}: _fallback metadata must name en-IN`);
    if (typeof catalog._status !== "string" || !catalog._status.trim())
      failures.push(`${file}: missing _status metadata`);
  }
  if (catalog._locale && registry[code] && registry[code].file !== file)
    failures.push(`${file}: _locale metadata does not match registry`);
  if (registry[code] && catalog._fallback && catalog._fallback !== "en-IN")
    failures.push(`${file}: fallback metadata must name en-IN`);

  const missing = [...source.keys()].filter((key) => !actual.has(key));
  const extra = [...actual.keys()].filter((key) => !source.has(key));
  if (missing.length)
    failures.push(
      `${file}: ${missing.length} missing keys (${missing.slice(0, 5).join(", ")})`,
    );
  if (extra.length)
    failures.push(
      `${file}: ${extra.length} unexpected keys (${extra.slice(0, 5).join(", ")})`,
    );

  let blank = 0;
  for (const [key, englishText] of source) {
    const localized = actual.get(key);
    if (file === "en.json") continue;
    if (typeof localized !== "string" || !localized.trim()) {
      blank++;
      continue;
    }
    if (
      JSON.stringify(placeholders(localized)) !==
      JSON.stringify(placeholders(englishText))
    ) {
      failures.push(`${file}: placeholder mismatch at ${key}`);
    }
  }
  if (file !== "en.json")
    coverage.push({
      file,
      code,
      translated: source.size - blank,
      total: source.size,
      blank,
    });
}

for (const [code, metadata] of Object.entries(registry)) {
  if (!seenCodes.has(code))
    failures.push(`registry: ${code} has no catalog metadata`);
  if (!catalogs.includes(metadata.file))
    failures.push(`registry: ${code} catalog ${metadata.file} does not exist`);
  if (
    ![...source.keys()].some(
      (key) =>
        key === metadata.labelKey || key.endsWith(`.${metadata.labelKey}`),
    )
  ) {
    failures.push(
      `registry: ${code} label key ${metadata.labelKey} is not in en.json`,
    );
  }
  if (!["ltr", "rtl"].includes(metadata.direction))
    failures.push(`registry: ${code} has invalid direction`);
  if (!["complete", "partial"].includes(metadata.status))
    failures.push(`registry: ${code} has invalid translation status`);
  const report = coverage.find((item) => item.code === code);
  if (metadata.status === "complete" && report?.blank)
    failures.push(
      `registry: ${code} is marked complete with ${report.blank} blank values`,
    );
  if (strict && metadata.status !== "complete")
    failures.push(`registry: ${code} is not marked complete`);
}

if (failures.length) {
  console.error(
    `Locale validation failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):`,
  );
  for (const issue of failures) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(
    `Catalog structure and placeholder validation PASS: ${catalogs.length} catalogs, ${source.size} English keys.`,
  );
  for (const item of coverage) {
    const status = registry[item.code]?.status ?? "unregistered";
    console.log(
      `${item.code ?? item.file}: ${item.translated}/${item.total} populated; ${item.blank} blank; ${status}`,
    );
  }
  if (
    strict &&
    coverage.some((item) => registry[item.code]?.status !== "complete")
  )
    process.exitCode = 1;
}
