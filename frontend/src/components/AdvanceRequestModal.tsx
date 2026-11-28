import { useEffect, useMemo, useState } from 'react';
import { requestAdvancePayment } from '../api/contracts';
import { useWallet } from '../hooks/useWallet';

interface AdvanceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestoneId: string;
  contractId: string;
  maxAdvance: number;
  currency?: string;
  onSubmitted?: (milestoneId: string) => void;
}

const formatAmount = (value: number): string =>
  Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 7 }) : '0';

export default function AdvanceRequestModal({
  isOpen,
  onClose,
  milestoneId,
  contractId,
  maxAdvance,
  currency = 'XLM',
  onSubmitted,
}: AdvanceRequestModalProps) {
  const { address, isConnected, connect } = useWallet();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const parsedAmount = useMemo(() => {
    const trimmed = amount.trim();
    if (!trimmed) return NaN;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [amount]);

  const validationError = useMemo(() => {
    if (!amount.trim()) return null;
    if (Number.isNaN(parsedAmount)) return 'Enter a valid amount.';
    if (parsedAmount <= 0) return 'Amount must be greater than zero.';
    if (parsedAmount > maxAdvance) {
      return `Amount cannot exceed the contract maximum of ${formatAmount(maxAdvance)} ${currency}.`;
    }
    return null;
  }, [amount, parsedAmount, maxAdvance, currency]);

  const canSubmit =
    isConnected &&
    !submitting &&
    !validationError &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= maxAdvance;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      await requestAdvancePayment({
        contractId,
        milestoneId,
        amount: parsedAmount,
        supplier: address ?? '',
      });
      onSubmitted?.(milestoneId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit advance request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="advance-request-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="advance-request-title">Request advance payment</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          <p className="modal-hint">
            Request an advance against milestone <strong>{milestoneId}</strong>. The maximum you can
            request is {formatAmount(maxAdvance)} {currency}.
          </p>

          <label className="form-field" htmlFor="advance-amount">
            <span>Amount ({currency})</span>
            <input
              id="advance-amount"
              type="number"
              inputMode="decimal"
              min="0"
              max={maxAdvance}
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={`0.00`}
              disabled={submitting}
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? 'advance-amount-error' : undefined}
            />
          </label>

          {validationError && (
            <p id="advance-amount-error" className="form-error" role="alert">
              {validationError}
            </p>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {!isConnected && (
            <p className="modal-hint">Connect your Freighter wallet to submit this request.</p>
          )}

          <footer className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            {isConnected ? (
              <button type="submit" className="btn-primary" disabled={!canSubmit}>
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => void connect()}>
                Connect wallet
              </button>
            )}
          </footer>
        </form>
      </div>
    </div>
  );
}
