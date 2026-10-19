import { useEffect, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { searchShipments, type ShipmentSearchResult } from "../lib/api";

type Props = {
  onSelect: (shipmentId: string) => void;
  delay?: number;
};

const MIN_QUERY_LENGTH = 2;

function shorten(address: string) {
  return address.length > 12 ? `${address.slice(0, 5)}...${address.slice(-5)}` : address;
}

export function ShipmentSearch({ onSelect, delay = 300 }: Props) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), delay);
  const [results, setResults] = useState<ShipmentSearchResult[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setState("idle");
      return;
    }
    const controller = new AbortController();
    setState("loading");
    searchShipments(debouncedQuery, controller.signal)
      .then((found) => {
        setResults(found);
        setState("done");
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        console.warn(cause);
        setResults([]);
        setState("error");
      });
    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <div className="global-search">
      <label className="search-input-wrap">
        {state === "loading" ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}
        <input
          type="search"
          aria-label="Search shipments"
          placeholder="Search by ID, buyer or supplier"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {state === "done" && results.length > 0 && (
        <ul className="search-results" role="listbox" aria-label="Shipment search results">
          {results.map((result) => (
            <li key={result.shipmentId} role="option" aria-selected="false">
              <button type="button" onClick={() => { onSelect(result.shipmentId); setQuery(""); }}>
                <strong>{result.shipmentId}</strong>
                <small>
                  {result.buyer ? `Buyer ${shorten(result.buyer)}` : "Buyer unknown"} · {result.supplier ? `Supplier ${shorten(result.supplier)}` : "Supplier unknown"}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {state === "done" && results.length === 0 && <div className="search-empty" role="status">No shipments match “{debouncedQuery}”.</div>}
      {state === "error" && <div className="search-empty search-error" role="alert">Search is unavailable. Check the backend connection.</div>}
    </div>
  );
}
