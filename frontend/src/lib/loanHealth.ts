export type HealthLevel = "healthy" | "warning" | "danger" | "none";

export const DEFAULT_SAFETY_MARGIN = 1.5;
export const LIQUIDATION_THRESHOLD = 1.0;

/** Health factor = (collateral * price * liquidationLtv) / debt. Infinity when no debt. */
export function computeHealthFactor(
  collateral: number,
  price: number,
  debt: number,
  liquidationLtv = 1,
): number {
  if (debt <= 0) return Number.POSITIVE_INFINITY;
  return (collateral * price * liquidationLtv) / debt;
}

export function healthLevel(hf: number, safetyMargin = DEFAULT_SAFETY_MARGIN): HealthLevel {
  if (!Number.isFinite(hf)) return "none";
  if (hf < LIQUIDATION_THRESHOLD * 1.0000001) return "danger";
  if (hf < safetyMargin) return "warning";
  return "healthy";
}

/** Percentage distance above the liquidation threshold (negative if liquidatable). */
export function distanceToLiquidation(hf: number): number {
  if (!Number.isFinite(hf)) return Number.POSITIVE_INFINITY;
  return (hf - LIQUIDATION_THRESHOLD) / LIQUIDATION_THRESHOLD * 100;
}
