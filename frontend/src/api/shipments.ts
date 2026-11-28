import { apiClient } from './client';

export interface Shipment {
  id: string;
  trackingNumber: string;
  status: string;
  origin: string;
  destination: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneAmendment {
  id: string;
  milestoneId: string;
  timestamp: string;
  changedFields: string[];
  amendedBy: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export async function getShipments(): Promise<Shipment[]> {
  const response = await apiClient.get<Shipment[]>('/shipments');
  return response.data;
}

export async function getShipment(id: string): Promise<Shipment> {
  const response = await apiClient.get<Shipment>(`/shipments/${id}`);
  return response.data;
}

export async function getMilestoneAmendmentHistory(
  shipmentId: string,
): Promise<MilestoneAmendment[]> {
  const response = await apiClient.get<MilestoneAmendment[]>(
    `/shipments/${shipmentId}/milestones/amendments`,
  );
  return response.data;
}
