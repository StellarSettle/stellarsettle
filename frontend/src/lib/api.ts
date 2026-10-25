export const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8787").replace(/\/$/, "");

export type ShipmentSearchResult = {
  shipmentId: string;
  buyer: string | null;
  supplier: string | null;
  lastLedger: number | null;
};

export async function searchShipments(query: string, signal?: AbortSignal): Promise<ShipmentSearchResult[]> {
  const response = await fetch(`${backendUrl}/api/shipments/search?q=${encodeURIComponent(query)}&limit=10`, { signal });
  if (!response.ok) throw new Error("Shipment search failed.");
  return response.json() as Promise<ShipmentSearchResult[]>;
}
