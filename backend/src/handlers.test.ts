import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeMilestoneConfirmed,
  decodeProofSubmitted,
  decodeDisputeResolved,
  KNOWN_EVENT_TYPES,
} from "./index.ts";

// milestone_confirmed: topics = [name, shipmentId, milestoneIndex, paymentAmount]
test("decodeMilestoneConfirmed: decodes a valid encoded event payload", () => {
  const topics = ["milestone_confirmed", "shipment-abc", 2, BigInt(5000000)];
  const result = decodeMilestoneConfirmed("evt-1", 100, topics, null);
  assert.ok(result !== null);
  assert.equal(result!.type, "milestone_confirmed");
  assert.equal(result!.shipmentId, "shipment-abc");
  assert.equal(result!.milestoneIndex, 2);
  assert.equal(result!.paymentAmount, BigInt(5000000));
  assert.equal(result!.ledger, 100);
});

test("decodeMilestoneConfirmed: returns null for wrong event type", () => {
  const topics = ["dispute_escalated", "shipment-abc", 2, BigInt(5000000)];
  const result = decodeMilestoneConfirmed("evt-1", 100, topics, null);
  assert.equal(result, null);
});

test("decodeMilestoneConfirmed: returns null for missing shipmentId", () => {
  const topics = ["milestone_confirmed", "", 2, BigInt(5000000)];
  const result = decodeMilestoneConfirmed("evt-1", 100, topics, null);
  assert.equal(result, null);
});

// proof_submitted: topics = [name, shipmentId, milestoneIndex], value = proofHash
test("decodeProofSubmitted: decodes a valid encoded event payload", () => {
  const topics = ["proof_submitted", "shipment-xyz", 1];
  const proofHash = "QmTzQ1JRkWErjk39mryYw2WVaphAZNAREyMchXWrNePkEq";
  const result = decodeProofSubmitted("evt-2", 200, topics, proofHash);
  assert.ok(result !== null);
  assert.equal(result!.type, "proof_submitted");
  assert.equal(result!.shipmentId, "shipment-xyz");
  assert.equal(result!.milestoneIndex, 1);
  assert.equal(result!.proofHash, proofHash);
  assert.equal(result!.ledger, 200);
});

test("decodeProofSubmitted: returns null for wrong event type", () => {
  const topics = ["milestone_confirmed", "shipment-xyz", 1];
  const result = decodeProofSubmitted("evt-2", 200, topics, "hash");
  assert.equal(result, null);
});

test("decodeProofSubmitted: returns null for missing shipmentId", () => {
  const topics = ["proof_submitted", "", 1];
  const result = decodeProofSubmitted("evt-2", 200, topics, "hash");
  assert.equal(result, null);
});

// dispute_resolved: topics = [name, shipmentId, milestoneIndex, approved]
test("decodeDisputeResolved: decodes approved outcome", () => {
  const topics = ["dispute_resolved", "shipment-def", 0, true];
  const result = decodeDisputeResolved("evt-3", 300, topics, null);
  assert.ok(result !== null);
  assert.equal(result!.type, "dispute_resolved");
  assert.equal(result!.shipmentId, "shipment-def");
  assert.equal(result!.milestoneIndex, 0);
  assert.equal(result!.outcome, "approved");
  assert.equal(result!.ledger, 300);
});

test("decodeDisputeResolved: decodes rejected outcome", () => {
  const topics = ["dispute_resolved", "shipment-def", 0, false];
  const result = decodeDisputeResolved("evt-3", 300, topics, null);
  assert.ok(result !== null);
  assert.equal(result!.outcome, "rejected");
});

test("decodeDisputeResolved: returns null for wrong event type", () => {
  const topics = ["proof_submitted", "shipment-def", 0, true];
  const result = decodeDisputeResolved("evt-3", 300, topics, null);
  assert.equal(result, null);
});

test("decodeDisputeResolved: outcome from value field when topic absent", () => {
  const topics = ["dispute_resolved", "shipment-def", 0];
  const result = decodeDisputeResolved("evt-4", 300, topics, true);
  assert.ok(result !== null);
  assert.equal(result!.outcome, "approved");
});

test("KNOWN_EVENT_TYPES contains all four indexed event types", () => {
  assert.ok(KNOWN_EVENT_TYPES.has("dispute_escalated"));
  assert.ok(KNOWN_EVENT_TYPES.has("milestone_confirmed"));
  assert.ok(KNOWN_EVENT_TYPES.has("proof_submitted"));
  assert.ok(KNOWN_EVENT_TYPES.has("dispute_resolved"));
});
