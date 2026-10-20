import { useState } from "react";
import "./LiquidationHistory.css";
import { LIQUIDATION_PAGE_SIZE, pageCount, pageSlice, type LiquidationEvent } from "../lib/liquidationPaging";

type Props = {
  events: LiquidationEvent[];
  pageSize?: number;
  loading?: boolean;
  error?: string | null;
};

export function LiquidationHistory({ events, pageSize = LIQUIDATION_PAGE_SIZE, loading, error }: Props) {
  const [page, setPage] = useState(0);
  if (loading) return <section className="liq-history" aria-busy="true">Loading liquidation history...</section>;
  if (error) return <section className="liq-history" role="alert">Could not load liquidation history: {error}</section>;
  if (events.length === 0) return <section className="liq-history">No liquidations have occurred.</section>;

  const pages = pageCount(events.length, pageSize);
  const current = Math.min(page, pages - 1);
  return (
    <section className="liq-history" aria-label="Liquidation history">
      <table>
        <thead>
          <tr><th>Liquidated address</th><th>Amount seized</th><th>Ledger</th></tr>
        </thead>
        <tbody>
          {pageSlice(events, current, pageSize).map((e) => (
            <tr key={e.id}><td>{e.liquidated}</td><td>{e.amountSeized}</td><td>{e.ledger}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="liq-history__pager">
        <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
        <span>Page {current + 1} of {pages}</span>
        <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</button>
      </div>
    </section>
  );
}
