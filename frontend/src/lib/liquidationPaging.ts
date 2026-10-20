export type LiquidationEvent = {
  id: string;
  liquidated: string;
  amountSeized: string;
  ledger: number;
};

export const LIQUIDATION_PAGE_SIZE = 10;

export function pageCount(total: number, pageSize = LIQUIDATION_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function pageSlice<T>(items: T[], page: number, pageSize = LIQUIDATION_PAGE_SIZE): T[] {
  const start = Math.max(0, page) * pageSize;
  return items.slice(start, start + pageSize);
}
