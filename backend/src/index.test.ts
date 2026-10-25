import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { nativeToScVal, xdr } from "@stellar/stellar-sdk";
import type { ContractEvent, RawContractEvent } from "./index.js";

process.env.DATABASE_PATH = ":memory:";

const {
  app,
  database,
  decodeContractEvent,
  decodeDisputeEscalatedEvent,
  decodeShipmentCancelledEvent,
  decodeShipmentCompletedEvent,
  handleContractEvent,
} = await import("./index.js");

function scSymbol(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "symbol" });
}

function scString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

function scI128(value: bigint | number): xdr.ScVal {
  return nativeToScVal(BigInt(value), { type: "i128" });
}

function scU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

function scAddress(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "address" });
}

function scMap(entries: Array<[string, xdr.ScVal]>): xdr.ScVal {
  return xdr.ScVal.scvMap(
    entries.map(
      ([key, val]) =>
        new xdr.ScMapEntry({
          key: scSymbol(key),
          val,
        }),
    ),
  );
}

describe("shipment completed and cancelled event decoders and handlers", () => {
  beforeEach(() => {
    database.exec("DELETE FROM contract_events");
  });

  it("decodes canonical stellarsettle shipment_completed map event payloads", () => {
    const rawEvent: RawContractEvent = {
      id: "000100-0001",
      ledger: 100,
      topic: [scSymbol("stellarsettle"), scSymbol("shipment_completed")],
      value: scMap([
        ["shipment_id", scString("SHIP-COMPLETE-01")],
        ["total_paid", scI128(1_000_000_000n)],
      ]),
    };

    const decoded = decodeShipmentCompletedEvent(rawEvent);
    assert.deepEqual(decoded, {
      id: "000100-0001",
      ledger: 100,
      type: "shipment_completed",
      shipmentId: "SHIP-COMPLETE-01",
      totalPaid: "1000000000",
    });
  });

  it("decodes base64 XDR-encoded shipment_completed event payloads", () => {
    const rawEvent: RawContractEvent = {
      id: "000101-0001",
      ledger: 101,
      topic: [
        scSymbol("stellarsettle").toXDR("base64"),
        scSymbol("shipment_completed").toXDR("base64"),
      ],
      value: scMap([
        ["shipment_id", scString("SHIP-COMPLETE-B64")],
        ["total_paid", scI128(2_500_000_000n)],
      ]).toXDR("base64"),
    };

    const decoded = decodeContractEvent(rawEvent);
    assert.deepEqual(decoded, {
      id: "000101-0001",
      ledger: 101,
      type: "shipment_completed",
      shipmentId: "SHIP-COMPLETE-B64",
      totalPaid: "2500000000",
    });
  });

  it("decodes direct-topic shipment_completed tuple payloads", () => {
    const rawEvent: RawContractEvent = {
      id: "000102-0001",
      ledger: 102,
      topic: [scSymbol("shipment_completed"), scString("SHIP-COMPLETE-TUPLE")],
      value: xdr.ScVal.scvVec([scI128(500_000_000n), scU32(102)]),
    };

    const decoded = decodeShipmentCompletedEvent(rawEvent);
    assert.deepEqual(decoded, {
      id: "000102-0001",
      ledger: 102,
      type: "shipment_completed",
      shipmentId: "SHIP-COMPLETE-TUPLE",
      totalPaid: "500000000",
    });
  });

  it("decodes canonical stellarsettle shipment_cancelled map event payloads with reason", () => {
    const rawEvent: RawContractEvent = {
      id: "000103-0001",
      ledger: 103,
      topic: [scSymbol("stellarsettle"), scSymbol("shipment_cancelled")],
      value: scMap([
        ["shipment_id", scString("SHIP-CANCEL-01")],
        ["refund_amount", scI128(750_000_000n)],
        ["reason", scSymbol("BuyerCancelled")],
      ]),
    };

    const decoded = decodeShipmentCancelledEvent(rawEvent);
    assert.deepEqual(decoded, {
      id: "000103-0001",
      ledger: 103,
      type: "shipment_cancelled",
      shipmentId: "SHIP-CANCEL-01",
      refundAmount: "750000000",
      reason: "BuyerCancelled",
    });
  });

  it("decodes legacy direct-topic shipment_cancelled tuple payloads", () => {
    const buyerAddress = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    const rawEvent: RawContractEvent = {
      id: "000104-0001",
      ledger: 104,
      topic: [scSymbol("shipment_cancelled"), scString("SHIP-CANCEL-LEGACY")],
      value: xdr.ScVal.scvVec([
        scI128(950_000_000n),
        scI128(50_000_000n),
        scAddress(buyerAddress),
        scU32(104),
      ]),
    };

    const decoded = decodeShipmentCancelledEvent(rawEvent);
    assert.deepEqual(decoded, {
      id: "000104-0001",
      ledger: 104,
      type: "shipment_cancelled",
      shipmentId: "SHIP-CANCEL-LEGACY",
      refundAmount: "950000000",
      cancelFee: "50000000",
      cancelledBy: buyerAddress,
    });
  });

  it("decodes dispute_escalated event payloads without regression", () => {
    const rawEvent: RawContractEvent = {
      id: "000105-0001",
      ledger: 105,
      topic: [scSymbol("dispute_escalated"), scString("SHIP-DISPUTE-01")],
      value: xdr.ScVal.scvVec([scU32(1), scU32(80), scU32(105)]),
    };

    const decoded = decodeDisputeEscalatedEvent(rawEvent);
    assert.deepEqual(decoded, {
      id: "000105-0001",
      ledger: 105,
      type: "dispute_escalated",
      shipmentId: "SHIP-DISPUTE-01",
      milestoneIndex: 1,
      openedLedger: 80,
      currentLedger: 105,
    });
  });

  it("ignores unrelated or malformed contract events", () => {
    const unrelated: RawContractEvent = {
      id: "000106-0001",
      ledger: 106,
      topic: [scSymbol("stellarsettle"), scSymbol("shipment_created")],
      value: scMap([["shipment_id", scString("SHIP-NEW-01")]]),
    };
    const malformedCompleted: RawContractEvent = {
      id: "000106-0002",
      ledger: 106,
      topic: [scSymbol("stellarsettle"), scSymbol("shipment_completed")],
      value: scMap([["shipment_id", scString("SHIP-BROKEN")]]),
    };

    assert.equal(handleContractEvent(unrelated), null);
    assert.equal(handleContractEvent(malformedCompleted), null);
  });

  it("indexes completed and cancelled events and exposes them via GET /api/events with clear type fields", async () => {
    const streamed: ContractEvent[] = [];
    const listeners = new Set<(event: ContractEvent) => void>([(evt) => streamed.push(evt)]);

    const completedEvent: RawContractEvent = {
      id: "evt-completed-200",
      ledger: 200,
      topic: [scSymbol("stellarsettle"), scSymbol("shipment_completed")],
      value: scMap([
        ["shipment_id", scString("SHIP-200")],
        ["total_paid", scI128(1_200_000_000n)],
      ]),
    };

    const cancelledEvent: RawContractEvent = {
      id: "evt-cancelled-205",
      ledger: 205,
      topic: [scSymbol("stellarsettle"), scSymbol("shipment_cancelled")],
      value: scMap([
        ["shipment_id", scString("SHIP-205")],
        ["refund_amount", scI128(800_000_000n)],
        ["reason", scSymbol("SupplierCancelled")],
      ]),
    };

    const escalatedEvent: RawContractEvent = {
      id: "evt-escalated-210",
      ledger: 210,
      topic: [scSymbol("dispute_escalated"), scString("SHIP-210")],
      value: xdr.ScVal.scvVec([scU32(0), scU32(190), scU32(210)]),
    };

    handleContractEvent(completedEvent, database, listeners);
    handleContractEvent(cancelledEvent, database, listeners);
    handleContractEvent(escalatedEvent, database, listeners);
    // Re-handling an already indexed event id must not duplicate rows or stream notifications
    handleContractEvent(completedEvent, database, listeners);

    assert.equal(streamed.length, 3);

    const response = await app.inject({
      method: "GET",
      url: "/api/events",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as ContractEvent[];
    assert.equal(body.length, 3);

    assert.deepEqual(body[0], {
      id: "evt-escalated-210",
      ledger: 210,
      type: "dispute_escalated",
      shipmentId: "SHIP-210",
      milestoneIndex: 0,
      openedLedger: 190,
      currentLedger: 210,
    });

    assert.deepEqual(body[1], {
      id: "evt-cancelled-205",
      ledger: 205,
      type: "shipment_cancelled",
      shipmentId: "SHIP-205",
      refundAmount: "800000000",
      reason: "SupplierCancelled",
    });

    assert.deepEqual(body[2], {
      id: "evt-completed-200",
      ledger: 200,
      type: "shipment_completed",
      shipmentId: "SHIP-200",
      totalPaid: "1200000000",
    });

    // Verify type filtering on /api/events
    const completedOnlyRes = await app.inject({
      method: "GET",
      url: "/api/events?type=shipment_completed",
    });
    assert.equal(completedOnlyRes.statusCode, 200);
    assert.deepEqual(completedOnlyRes.json(), [
      {
        id: "evt-completed-200",
        ledger: 200,
        type: "shipment_completed",
        shipmentId: "SHIP-200",
        totalPaid: "1200000000",
      },
    ]);

    const cancelledOnlyRes = await app.inject({
      method: "GET",
      url: "/api/events?type=shipment_cancelled",
    });
    assert.equal(cancelledOnlyRes.statusCode, 200);
    assert.deepEqual(cancelledOnlyRes.json(), [
      {
        id: "evt-cancelled-205",
        ledger: 205,
        type: "shipment_cancelled",
        shipmentId: "SHIP-205",
        refundAmount: "800000000",
        reason: "SupplierCancelled",
      },
    ]);
  });
});
