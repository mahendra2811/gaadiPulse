import {
  formatMinorUnits,
  isCurrencyCode,
  type CurrencyCode,
} from "@/src/utils/currency";
import type { Payload } from "./schema";

export function recordCurrency(payload: Payload): CurrencyCode {
  return isCurrencyCode(String(payload.currency_code))
    ? (payload.currency_code as CurrencyCode)
    : "INR";
}

export function recordMinorAmount(payload: Payload): number {
  const value = payload.amount_minor ?? payload.amount_paise ?? 0;
  return Number(value);
}

export function recordMoney(payload: Payload, locale = "en-IN") {
  return formatMinorUnits(
    recordMinorAmount(payload),
    recordCurrency(payload),
    locale,
  );
}

export function groupMinorAmounts(payloads: Payload[]) {
  const grouped: Partial<Record<CurrencyCode, number>> = {};
  for (const payload of payloads) {
    const currency = recordCurrency(payload);
    grouped[currency] = (grouped[currency] ?? 0) + recordMinorAmount(payload);
  }
  return grouped;
}
