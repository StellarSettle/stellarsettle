import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { getMaxEvidencePerMilestone, getMilestones, type Milestone, type Wallet } from "../lib/stellar";
import { errorMessage } from "../lib/format";
import { DisputeEvidencePanel } from "./DisputeEvidencePanel";
import { MilestoneSplitPanel } from "./MilestoneSplitPanel";
import { DisputeModal } from "./DisputeModal";

type Props = {
  wallet: Wallet;
  shipmentId: string;
  onShipmentChanged: () => Promise<void> | void;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
};

export function ShipmentMilestones({ wallet, shipmentId, onShipmentChanged, onError, onNotice }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [maxEvidence, setMaxEvidence] = useState(5);
  const [loading, setLoading] = useState(false);
  const [disputeMilestone, setDisputeMilestone] = useState<Milestone | null>(null);

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    try {
      const [list, max] = await Promise.all([
        getMilestones(wallet.address, shipmentId),
        getMaxEvidencePerMilestone(wallet.address),
      ]);
      setMilestones(list);
      setMaxEvidence(max);
    } catch (cause) {
      onError(errorMessage(cause, "Unable to load milestones."));
    } finally {
      setLoading(false);
    }
  }, [wallet.address, shipmentId, onError]);

  useEffect(() => {
    void loadMilestones();
  }, [loadMilestones]);

  async function handleSplitApplied() {
    await Promise.all([loadMilestones(), onShipmentChanged()]);
  }

  const isDisputable = (status: string) => status === "ProofSubmitted" || status === "ConfirmedHeld";

  return (
    <div className="milestone-section">
      <div className="sub-heading"><span>MILESTONES</span>{loading && <LoaderCircle className="spin" size={14} />}</div>
      {milestones.length ? <ul className="milestone-list">{milestones.map((milestone) => <li key={milestone.index} className="milestone-row">
        <div className="milestone-line">
          <span><strong>{milestone.index + 1}. {milestone.name}</strong><small>{milestone.payment_percent}% of escrow</small></span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className={`status-pill ${milestone.status.toLowerCase()}`}><span />{milestone.status}</span>
            {isDisputable(milestone.status) && (
              <button
                type="button"
                className="dispute-trigger-button"
                aria-label={`Open dispute on milestone ${milestone.index + 1}`}
                onClick={() => setDisputeMilestone(milestone)}
              >
                <AlertTriangle size={13} />
                Open dispute
              </button>
            )}
          </div>
        </div>
        {milestone.status === "Disputed" && <DisputeEvidencePanel wallet={wallet} shipmentId={shipmentId} milestoneIndex={milestone.index} maxEvidence={maxEvidence} onError={onError} onNotice={onNotice} />}
      </li>)}</ul> : !loading && <div className="sub-empty">No milestones found for this shipment.</div>}
      <MilestoneSplitPanel wallet={wallet} shipmentId={shipmentId} milestones={milestones} onApplied={handleSplitApplied} onError={onError} onNotice={onNotice} />

      {disputeMilestone && (
        <DisputeModal
          isOpen={true}
          onClose={() => setDisputeMilestone(null)}
          wallet={wallet}
          shipmentId={shipmentId}
          milestoneIndex={disputeMilestone.index}
          milestoneName={disputeMilestone.name}
          onSuccess={async () => {
            await Promise.all([loadMilestones(), onShipmentChanged()]);
          }}
          onError={onError}
          onNotice={onNotice}
        />
      )}
    </div>
  );
}
