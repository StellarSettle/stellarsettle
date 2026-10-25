export const DEFAULT_STALE_LEDGER_THRESHOLD = 120;

export function ledgerAge(currentLedger: number, lastUpdateLedger: number): number {
  return Math.max(0, currentLedger - lastUpdateLedger);
}

export function isPriceStale(
  currentLedger: number,
  lastUpdateLedger: number,
  threshold = DEFAULT_STALE_LEDGER_THRESHOLD,
): boolean {
  return ledgerAge(currentLedger, lastUpdateLedger) > threshold;
}
