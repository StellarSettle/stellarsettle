import type { Shipment } from "../lib/stellar";

type Props = {
  shipment: Shipment;
  progressPercent: number;
  onConfirmMilestone?: () => void;
};

export function ShipmentCard({ shipment, progressPercent, onConfirmMilestone }: Props) {
  return (
    <article className="shipment-card" data-testid="shipment-card">
      <header>
        <h3>{shipment.id}</h3>
        <span className={`status-pill ${shipment.status.toLowerCase()}`}>{shipment.status}</span>
      </header>
      <div
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="shipment-card__progress"
      >
        <div className="shipment-card__progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      {onConfirmMilestone && (
        <button type="button" onClick={onConfirmMilestone}>
          Confirm milestone
        </button>
      )}
    </article>
  );
}