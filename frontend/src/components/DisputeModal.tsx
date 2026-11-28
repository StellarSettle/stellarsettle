import { useState } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { openDisputeWithEvidence, type Wallet } from "../lib/stellar";
import { errorMessage } from "../lib/format";
import "./DisputeModal.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  wallet: Wallet;
  shipmentId: string;
  milestoneIndex: number;
  milestoneName: string;
  onSuccess?: (txHash: string, evidenceHash: string) => Promise<void> | void;
  onError?: (message: string) => void;
  onNotice?: (message: string) => void;
};

export function DisputeModal({
  isOpen,
  onClose,
  wallet,
  shipmentId,
  milestoneIndex,
  milestoneName,
  onSuccess,
  onError,
  onNotice,
}: Props) {
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = description.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    onError?.("");
    onNotice?.("");

    try {
      const { txHash, evidenceHash } = await openDisputeWithEvidence(
        wallet,
        shipmentId,
        milestoneIndex,
        text,
      );
      onNotice?.(`Dispute raised on milestone ${milestoneIndex + 1} · SHA-256: ${evidenceHash.slice(0, 10)}…`);
      if (onSuccess) {
        await onSuccess(txHash, evidenceHash);
      }
      onClose();
    } catch (cause) {
      onError?.(errorMessage(cause, "Dispute transaction failed."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dispute-modal-backdrop" onClick={onClose} data-testid="dispute-modal-backdrop">
      <div
        className="dispute-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Open dispute modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dispute-modal-header">
          <div className="dispute-modal-title">
            <AlertTriangle className="dispute-modal-icon" size={20} />
            <div>
              <h3>Open Dispute</h3>
              <p className="dispute-modal-subtitle">
                Milestone {milestoneIndex + 1}: {milestoneName}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="dispute-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dispute-modal-form" aria-label="Dispute form">
          <p className="dispute-modal-hint">
            Provide a description of the issue. The description will be hashed client-side
            using WebCrypto SHA-256 and recorded on-chain via a Soroban transaction with your Freighter wallet.
          </p>

          <label htmlFor="evidence-description" className="dispute-modal-label">
            Evidence Description
          </label>
          <textarea
            id="evidence-description"
            aria-label="Evidence description"
            className="dispute-modal-textarea"
            placeholder="Describe the discrepancy, defective goods, or missing delivery proof..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            required
            rows={4}
          />

          <div className="dispute-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button danger-button"
              disabled={submitting || !description.trim()}
              aria-label="Submit dispute transaction"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="spin" size={15} />
                  Signing & Submitting...
                </>
              ) : (
                "Submit Dispute"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
