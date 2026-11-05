/** Initial catalog for exercising different currency precisions. Non-INR use remains gated. */
export const currencies = {
  INR: { name: "Indian rupee", decimals: 2 },
  USD: { name: "US dollar", decimals: 2 },
  JPY: { name: "Japanese yen", decimals: 0 },
  KWD: { name: "Kuwaiti dinar", decimals: 3 },
} as const;
export type CurrencyCode = keyof typeof currencies;
export function isCurrencyCode(code: string): code is CurrencyCode {
  return Object.prototype.hasOwnProperty.call(currencies, code);
}
/** Parse an unsigned decimal exactly into minor units, bounded for JSON/JS interoperability. */
export function parseMinorUnits(
  input: string,
  currency: CurrencyCode,
  allowZero = false,
): number {
  const value = input.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  const digits = currencies[currency].decimals;
  if (!match || (match[2]?.length ?? 0) > digits)
    throw new Error("Enter a valid amount for the selected currency.");
  const minor =
    BigInt(match[1]) * 10n ** BigInt(digits) +
    BigInt((match[2] ?? "").padEnd(digits, "0") || "0");
  if ((!allowZero && minor === 0n) || minor > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Amount is outside the allowed range.");
  return Number(minor);
}
/** Format without converting a potentially large minor-unit integer to floating point. */
export function formatMinorUnits(
  amount: number,
  currency: CurrencyCode,
  locale = "en-IN",
): string {
  if (!Number.isSafeInteger(amount))
    throw new Error("Amount must be a safe integer.");
  const digits = currencies[currency].decimals;
  const integer = BigInt(amount),
    negative = integer < 0n,
    absolute = negative ? -integer : integer;
  const scale = 10n ** BigInt(digits),
    major = absolute / scale;
  const fraction = digits
    ? (absolute % scale).toString().padStart(digits, "0")
    : "";
  const signedMajor = negative ? (major === 0n ? -0 : -major) : major;
  const numberFormat = new Intl.NumberFormat(locale, { useGrouping: false });
  const localizedFraction = [...fraction]
    .map((digit) => numberFormat.format(Number(digit)))
    .join("");
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
    .formatToParts(signedMajor)
    .map((part) => (part.type === "fraction" ? localizedFraction : part.value))
    .join("");
}
/** Exact string for an editable decimal field; never localised or rounded. */
export function minorUnitsDecimal(
  amount: number,
  currency: CurrencyCode,
): string {
  if (!Number.isSafeInteger(amount))
    throw new Error("Amount must be a safe integer.");
  const digits = currencies[currency].decimals,
    integer = BigInt(amount),
    negative = integer < 0n,
    absolute = negative ? -integer : integer,
    scale = 10n ** BigInt(digits);
  return `${negative ? "-" : ""}${absolute / scale}${digits ? `.${(absolute % scale).toString().padStart(digits, "0")}` : ""}`;
}

/** Calculate fuel values with quantity measured to three decimal places. */
export function solveCurrencyFuel(
  amount: string,
  quantity: string,
  unitPrice: string,
  currency: CurrencyCode,
) {
  let a = amount ? BigInt(parseMinorUnits(amount, currency)) : null;
  let p = unitPrice ? BigInt(parseMinorUnits(unitPrice, currency)) : null;
  let q: bigint | null = null;
  if (quantity) {
    const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(quantity.trim());
    if (!match) throw new Error("Enter a valid fuel quantity.");
    q = BigInt(match[1]) * 1000n + BigInt((match[2] ?? "").padEnd(3, "0"));
    if (q <= 0n || q > 1000000000n)
      throw new Error("Fuel quantity is outside the allowed range.");
  }
  if ([a, p, q].filter((value) => value !== null).length < 2)
    throw new Error("Enter any two fuel values.");
  const rounded = (numerator: bigint, denominator: bigint) =>
    (numerator + denominator / 2n) / denominator;
  if (a === null) a = rounded(q! * p!, 1000n);
  else if (q === null) q = rounded(a * 1000n, p!);
  else if (p === null) p = rounded(a * 1000n, q);
  const expected = rounded(q! * p!, 1000n);
  const difference = a > expected ? a - expected : expected - a;
  const tolerance = (q! + 1999n) / 2000n;
  if (difference > (tolerance > 1n ? tolerance : 1n))
    throw new Error("Fuel values are inconsistent.");
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  if (
    a <= 0n ||
    p! <= 0n ||
    q! <= 0n ||
    q! > 1000000000n ||
    a > max ||
    p! > max
  )
    throw new Error("Fuel values are outside the allowed range.");
  return {
    amount_minor: Number(a),
    unit_price_minor: Number(p),
    quantity: Number(q) / 1000,
  };
}
