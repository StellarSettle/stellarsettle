# StellarSettle Domain Glossary

This document defines the domain-specific terms used throughout the StellarSettle project. For newcomers, start here to understand the business and technical concepts.

## Shipment & Logistics

**Shipment**
A full cargo movement from origin port to destination port. Each shipment goes through multiple milestones (created, in-transit, delivered) and carries associated metadata (cargo type, value, parties involved).

**Milestone**
A checkpoint in the shipment lifecycle (e.g., "created", "in-transit", "delivered"). Milestones are confirmed on-chain via smart contract events. The contract emits events for each milestone transition, which the backend indexes for real-time tracking.

**Origin Port**
The port where cargo is loaded and a shipment begins. Identified in the data structure as `origin`.

**Destination Port**
The port where cargo is unloaded and a shipment ends. Identified as `destination`.

**Cargo**
The goods being shipped. Described by type (e.g., "containerized goods", "perishables") and value in USD.

**Consignee**
The party receiving the cargo at the destination. The consignee can claim the shipment once all milestones are confirmed.

## Parties & Actors

**Arbiter**
A neutral third party (often an escrow agent or logistics provider) responsible for holding funds and confirming milestones. The arbiter can approve payments after validating shipment progress.

**Shipper**
The party originating the shipment and placing the cargo. The shipper deposits collateral and initiates the contract.

**Payer**
The party paying for the shipment (often the importer or consignee). The payer deposits funds into the escrow as proof of commitment.

## Financial Mechanisms

**Retainage**
A percentage of the payment held back until the shipment is complete. Retainage protects both shipper and payer by ensuring all parties complete their obligations. For example, 10% retainage means 90% is released on delivery confirmation and 10% is released after final milestone.

**Collateral**
A deposit made by the shipper to guarantee performance. If the shipper fails to deliver, collateral can be forfeited to compensate the payer.

**Collateral Slash**
Penalty mechanism: if the shipper breaches obligations (e.g., non-delivery), the arbiter can "slash" (forfeit) all or part of the collateral as damages. The slashed amount goes to the payer.

**Fee Tier**
A categorization of shipments by value for fee calculation purposes. Lower-value shipments may have lower percentage fees; high-value shipments may have higher fees. Fee tiers are configurable per contract deployment.

**Fee**
A percentage of the shipment value charged by the arbiter for services (milestone confirmation, escrow holding, dispute resolution). Fees are deducted from payments or deposits.

## Escrow & Payments

**Escrow**
A smart contract mechanism that holds funds on behalf of parties, releasing them only when agreed conditions are met (milestones confirmed, no disputes). Escrow prevents double-spending and ensures trust without requiring a centralized intermediary.

**Milestone Payment**
A partial payment released upon confirmation of a specific milestone. For example, 50% released on "in-transit", 40% on "delivered", with 10% retainage until final settlement.

**Settlement**
The final distribution of funds after all milestones are confirmed. Settlement transfers payments to the shipper (less fees and retainage), releases retainage, and closes the contract.

## Disputes & Governance

**Dispute**
A disagreement about whether a milestone was truly completed or the contract terms were violated. Disputes are flagged on-chain and can block settlement.

**Arbiter Decision**
A binding determination by the arbiter on a disputed milestone. The arbiter reviews evidence and decides: confirm the milestone, reject it, or propose alternative terms. Arbiter decisions are recorded on-chain.

## Technical & Contract Terms

**Contract Address**
The on-chain smart contract instance managing a specific shipment's state, funds, and milestones. Each shipment deployment gets its own contract address.

**State Machine**
The progression of a shipment through defined states: Created → In Transit → Delivered → Settled (or Disputed). Transitions are controlled by contract functions and can only happen in the correct order.

**Transaction**
An on-chain operation that changes contract state (creating a shipment, confirming a milestone, settling payment). Transactions are atomic and immutable once confirmed.

**Event**
An on-chain log entry emitted when the contract state changes (e.g., "MilestoneConfirmed", "PaymentReleased"). The backend listens for events via RPC polling and indexes them in the database for the frontend to display.

**RPC Polling**
The backend's mechanism for staying in sync with on-chain events. The backend repeatedly calls the RPC endpoint's `getEvents` method to fetch new contract events, then processes and stores them.

## Related Documents

- **README.md**: Full project overview, architecture, and deployment instructions
- **QUICKSTART.md**: 10-minute setup guide for new contributors
- **SECURITY.md**: Threat models and security mitigations across contract, backend, and frontend
- **docs/TECHNICAL_NOTES.md**: Implementation details and design decisions
