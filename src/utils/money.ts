import { domainCopy as c } from "@/src/lib/domainCopy";
export function paise(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error(c.amount);
  const [whole, fraction = ""] = value.trim().split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (result <= 0n || result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error(c.positiveAmount);
  return Number(result);
}
export function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value / 100);
}
const rounded = (n: bigint, d: bigint) => (n + d / 2n) / d;
export function solveFuel(amount: string, quantity: string, price: string) {
  let a = amount ? BigInt(paise(amount)) : null;
  let q: bigint | null = null;
  let p = price ? BigInt(paise(price)) : null;
  if (quantity) {
    if (!/^\d+(\.\d{1,3})?$/.test(quantity)) throw new Error(c.quantity);
    const [whole, fraction = ""] = quantity.split(".");
    q = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
    if (q <= 0n || q > 1000000000n) throw new Error(c.quantity);
  }
  if ([a, q, p].filter((v) => v !== null).length < 2)
    throw new Error(c.twoValues);
  if (a === null) a = rounded(q! * p!, 1000n);
  else if (q === null) q = rounded(a * 1000n, p!);
  else if (p === null) p = rounded(a * 1000n, q);
  const expected = rounded(q! * p!, 1000n);
  const difference = a > expected ? a - expected : expected - a;
  const tolerance = (q! + 1999n) / 2000n;
  if (difference > (tolerance > 1n ? tolerance : 1n))
    throw new Error(c.inconsistentFuel);
  if (
    a <= 0n ||
    q! <= 0n ||
    p! <= 0n ||
    a > BigInt(Number.MAX_SAFE_INTEGER) ||
    p! > BigInt(Number.MAX_SAFE_INTEGER)
  )
    throw new Error(c.rounding);
  return {
    amount_paise: Number(a),
    quantity: Number(q) / 1000,
    unit_price_paise: Number(p),
  };
}
