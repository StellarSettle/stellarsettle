import { useEffect, useState } from 'react';

export interface MilestoneAmendment {
  id: string;
  milestoneId: string;
  timestamp: string;
  changedFields: string[];
  amendedBy?: string;
}

interface MilestoneAmendmentHistoryProps {
  shipmentId: string;
  amendments?: MilestoneAmendment[];
  apiBaseUrl?: string;
}

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

export default function MilestoneAmendmentHistory({
  shipmentId,
  amendments,
  apiBaseUrl = '',
}: MilestoneAmendmentHistoryProps) {
  const [history, setHistory] = useState<MilestoneAmendment[]>(amendments ?? []);
  const [loading, setLoading] = useState<boolean>(amendments === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (amendments !== undefined) {
      setHistory(amendments);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${apiBaseUrl}/api/shipments/${encodeURIComponent(shipmentId)}/milestone-amendments`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load amendment history (${response.status})`);
        }
        return response.json();
      })
      .then((data: MilestoneAmendment[]) => {
        if (!cancelled) {
          setHistory(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load amendment history');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shipmentId, amendments, apiBaseUrl]);

  return (
    <section className="milestone-amendment-history" aria-label="Milestone amendment history">
      <h3>Milestone Amendment History</h3>

      {loading && <p className="milestone-amendment-history__loading">Loading amendment history…</p>}

      {!loading && error && (
        <p className="milestone-amendment-history__error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && history.length === 0 && (
        <p className="milestone-amendment-history__empty">No milestone amendments recorded yet.</p>
      )}

      {!loading && !error && history.length > 0 && (
        <ul className="milestone-amendment-history__list">
          {history.map((entry) => (
            <li key={entry.id} className="milestone-amendment-history__item">
              <div className="milestone-amendment-history__meta">
                <time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time>
                {entry.amendedBy && (
                  <span className="milestone-amendment-history__author"> by {entry.amendedBy}</span>
                )}
              </div>
              <div className="milestone-amendment-history__fields">
                <span className="milestone-amendment-history__fields-label">Changed fields:</span>
                {entry.changedFields.length > 0 ? (
                  <ul className="milestone-amendment-history__field-list">
                    {entry.changedFields.map((field) => (
                      <li key={field} className="milestone-amendment-history__field">
                        {field}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="milestone-amendment-history__field-none"> none</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
