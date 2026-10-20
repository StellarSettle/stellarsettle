import "./LoanHealth.css";
import {
  DEFAULT_SAFETY_MARGIN,
  computeHealthFactor,
  distanceToLiquidation,
  healthLevel,
} from "../lib/loanHealth";

type Props = {
  collateral: number;
  price: number;
  debt: number;
  liquidationLtv?: number;
  safetyMargin?: number;
  loading?: boolean;
  error?: string | null;
};

const TEXT = { healthy: "Healthy", warning: "At risk", danger: "Liquidatable", none: "No debt" } as const;

export function LoanHealth({
  collateral, price, debt, liquidationLtv = 1, safetyMargin = DEFAULT_SAFETY_MARGIN, loading, error,
}: Props) {
  if (loading) return <section className="loan-health" aria-busy="true">Loading loan health...</section>;
  if (error) return <section className="loan-health" role="alert">Could not load loan health: {error}</section>;

  const hf = computeHealthFactor(collateral, price, debt, liquidationLtv);
  const level = healthLevel(hf, safetyMargin);
  const finite = Number.isFinite(hf);
  const pct = finite ? Math.min(100, (hf / (safetyMargin * 2)) * 100) : 100;
  const dist = distanceToLiquidation(hf);

  return (
    <section className={`loan-health loan-health--${level}`} aria-label="Loan health">
      <div
        className="loan-health__bar"
        role="meter"
        aria-label="Health factor"
        aria-valuemin={0}
        aria-valuemax={safetyMargin * 2}
        aria-valuenow={finite ? Number(hf.toFixed(2)) : safetyMargin * 2}
        aria-valuetext={finite ? `${hf.toFixed(2)}, ${TEXT[level]}` : TEXT[level]}
      >
        <div className="loan-health__fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="loan-health__label">
        Health factor: {finite ? hf.toFixed(2) : "n/a"} ({TEXT[level]})
      </p>
      {finite && (
        <p>{dist >= 0 ? `${dist.toFixed(1)}% above` : `${Math.abs(dist).toFixed(1)}% below`} the liquidation threshold</p>
      )}
      {(level === "warning" || level === "danger") && (
        <p className="loan-health__warning" role="alert">
          Warning: your position is below the safety margin of {safetyMargin}. Add collateral or repay debt.
        </p>
      )}
    </section>
  );
}
