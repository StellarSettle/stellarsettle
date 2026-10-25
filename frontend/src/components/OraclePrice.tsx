import "./OraclePrice.css";
import { DEFAULT_STALE_LEDGER_THRESHOLD, isPriceStale, ledgerAge } from "../lib/oracleStaleness";

type Props = {
  price: number | null;
  lastUpdateLedger: number | null;
  currentLedger: number | null;
  staleThreshold?: number;
  loading?: boolean;
  error?: string | null;
};

export function OraclePrice({
  price, lastUpdateLedger, currentLedger, staleThreshold = DEFAULT_STALE_LEDGER_THRESHOLD, loading, error,
}: Props) {
  if (loading) return <section className="oracle-price" aria-busy="true">Loading oracle price...</section>;
  if (error) return <section className="oracle-price" role="alert">Could not load oracle price: {error}</section>;
  if (price === null || lastUpdateLedger === null || currentLedger === null) {
    return <section className="oracle-price">No oracle price available.</section>;
  }
  const age = ledgerAge(currentLedger, lastUpdateLedger);
  const stale = isPriceStale(currentLedger, lastUpdateLedger, staleThreshold);
  return (
    <section className="oracle-price" aria-label="Oracle price">
      <p>Collateral price: <strong>{price}</strong></p>
      <p>Last update ledger: {lastUpdateLedger} ({age} ledgers ago)</p>
      {stale && (
        <p className="oracle-price__stale" role="alert">
          Warning: oracle price is stale (older than {staleThreshold} ledgers). Health values may be inaccurate.
        </p>
      )}
    </section>
  );
}
