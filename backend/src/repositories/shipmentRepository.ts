import type { DatabaseSync } from "node:sqlite";

export type ShipmentStateRow = {
  shipmentId: string;
  status: string;
  totalAmount: string | null;
  releasedAmount: string;
  milestoneCount: number;
  updatedAt: string;
};

export class ShipmentRepository {
  constructor(private readonly db: DatabaseSync) {}

  upsert(row: Omit<ShipmentStateRow, "updatedAt">): void {
    this.db
      .prepare(
        `INSERT INTO shipment_state (shipment_id, status, total_amount, released_amount, milestone_count)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(shipment_id) DO UPDATE SET
           status = excluded.status,
           total_amount = excluded.total_amount,
           released_amount = excluded.released_amount,
           milestone_count = excluded.milestone_count,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .run(row.shipmentId, row.status, row.totalAmount, row.releasedAmount, row.milestoneCount);
  }

  get(shipmentId: string): ShipmentStateRow | undefined {
    const row = this.db
      .prepare(
        `SELECT shipment_id AS shipmentId, status, total_amount AS totalAmount,
                released_amount AS releasedAmount, milestone_count AS milestoneCount, updated_at AS updatedAt
         FROM shipment_state WHERE shipment_id = ?`,
      )
      .get(shipmentId) as ShipmentStateRow | undefined;
    return row;
  }

  list(limit = 50, offset = 0): ShipmentStateRow[] {
    return this.db
      .prepare(
        `SELECT shipment_id AS shipmentId, status, total_amount AS totalAmount,
                released_amount AS releasedAmount, milestone_count AS milestoneCount, updated_at AS updatedAt
         FROM shipment_state ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      )
      .all(limit, offset) as ShipmentStateRow[];
  }
}