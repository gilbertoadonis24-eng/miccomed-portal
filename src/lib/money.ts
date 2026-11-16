import Decimal from "decimal.js";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export function n(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}

export function money2(value: string | number | Decimal): string {
  return n(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

export function price4(value: string | number | Decimal): string {
  return n(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
}

export function lineAmount(unitPrice: string | number, qty: string | number): string {
  return money2(n(unitPrice).mul(qty));
}
