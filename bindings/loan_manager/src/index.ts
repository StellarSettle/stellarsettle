import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}





/**
 * Public liquidation outcome, returned for off-chain indexing.
 */
export interface LiquidationResult {
  bad_debt_socialized: i128;
  bonus_bps: u32;
  repay_units: i128;
  seize_units: i128;
}


/**
 * Lending market configuration. A market pairs one collateral asset with
 * one borrowable (debt) asset.
 */
export interface Market {
  /**
 * Stellar Asset Contract accepted as collateral.
 */
collateral_token: string;
  /**
 * Stellar Asset Contract that can be borrowed (pool liquidity asset).
 */
debt_token: string;
  /**
 * Liquidation threshold in basis points (e.g. 8_000 = 80%).
 * A position is liquidatable when
 * `collateral_value * liq_threshold_bps < debt_value * 10_000`.
 */
liq_threshold_bps: u32;
}


/**
 * Per-user lending position.
 */
export interface Position {
  /**
 * Collateral units deposited by the user.
 */
collateral: i128;
  /**
 * Debt units owed by the user (debt token).
 */
debt: i128;
}


/**
 * Admin-configurable liquidation parameters.
 */
export interface LiqParams {
  /**
 * Bonus at health factor = 1.0, in bps (default 500 = 5%).
 */
base_bonus_bps: u32;
  /**
 * Maximum dynamic bonus, in bps (default 1500 = 15%).
 */
max_bonus_bps: u32;
  /**
 * Hard cap on the penalty, in bps (default 2000 = 20%).
 */
penalty_cap_bps: u32;
}


/**
 * Result of a price resolution through the failover chain.
 */
export interface PriceResolution {
  price: i128;
  /**
 * "primary", "secondary" or "twap".
 */
source: string;
}


/**
 * One cumulative-price snapshot used for TWAP computation.
 */
export interface PriceObservation {
  /**
 * Cumulative price-seconds accumulator value at `ts`.
 */
cum: i128;
  /**
 * Ledger timestamp (seconds) at which the snapshot was recorded.
 */
ts: u64;
}

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialise the contract with an administrator.
   */
  init: ({admin}: {admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a pause transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Emergency circuit breaker: halt all state-changing operations.
   */
  pause: ({admin}: {admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a repay transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Repay borrowed units (capped at the outstanding debt).
   */
  repay: ({user, amount}: {user: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a borrow transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Borrow debt-token units against posted collateral. Reverts when the
   * resulting health factor would drop below 1.
   */
  borrow: ({user, amount}: {user: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Supply debt-token liquidity to the pool. Earns nothing by itself;
   * exposed to pro-rata bad-debt socialization.
   */
  deposit: ({depositor, amount}: {depositor: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a unpause transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Resume normal operation.
   */
  unpause: ({admin}: {admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_twap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Stored TWAP accumulator state for `asset`.
   */
  get_twap: ({asset}: {asset: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<PriceObservation>>>

  /**
   * Construct and simulate a twap_now transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pure TWAP computation over the trailing window (diagnostics).
   */
  twap_now: ({asset}: {asset: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw previously supplied liquidity. Blocked beyond free pool
   * liquidity (`total_deposits - total_borrowed`).
   */
  withdraw: ({depositor, amount}: {depositor: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a liquidate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Execute a liquidation against `borrower`'s position. Open to any
   * account (permissionless). Applies dynamic incentives within the
   * penalty cap and triggers bad-debt socialization when the seizure
   * drains all collateral with debt remaining.
   */
  liquidate: ({liquidator, borrower, repay_amount}: {liquidator: string, borrower: string, repay_amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<LiquidationResult>>

  /**
   * Construct and simulate a set_market transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Configure the single lending market (collateral/debt pair).
   */
  set_market: ({admin, collateral_token, debt_token, liq_threshold_bps}: {admin: string, collateral_token: string, debt_token: string, liq_threshold_bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_oracles transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Oracle chain configuration.
   */
  get_oracles: (options?: MethodOptions) => Promise<AssembledTransaction<Option<readonly [string, Option<string>]>>>

  /**
   * Construct and simulate a set_oracles transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Configure the oracle failover chain (primary first, then secondary).
   */
  set_oracles: ({admin, primary, secondary}: {admin: string, primary: Option<string>, secondary: Option<string>}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_position transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Current position of `user`.
   */
  get_position: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<Position>>

  /**
   * Construct and simulate a record_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Keeper hook: refresh the TWAP accumulator from the live failover
   * chain without performing any other action.
   */
  record_price: ({asset}: {asset: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_pool_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pool-level accounting snapshot.
   */
  get_pool_info: (options?: MethodOptions) => Promise<AssembledTransaction<readonly [i128, i128, u32]>>

  /**
   * Construct and simulate a health_factor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Health factor of `user` as the exact fraction `(num, den)`;
   * healthy iff `num >= den`.
   */
  health_factor: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<readonly [i128, i128]>>

  /**
   * Construct and simulate a preview_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Preview the price resolution path for `asset` (diagnostics).
   */
  preview_price: ({asset}: {asset: string}, options?: MethodOptions) => Promise<AssembledTransaction<PriceResolution>>

  /**
   * Construct and simulate a get_depositors transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Depositor registry (ordered).
   */
  get_depositors: (options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a is_paused_view transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_paused_view: (options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a set_liq_params transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Tune liquidation incentives. All bps values are validated and the
   * penalty cap is always enforced downstream regardless of inputs.
   */
  set_liq_params: ({admin, base_bonus_bps, max_bonus_bps, penalty_cap_bps}: {admin: string, base_bonus_bps: u32, max_bonus_bps: u32, penalty_cap_bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_market_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Market configuration.
   */
  get_market_config: (options?: MethodOptions) => Promise<AssembledTransaction<Market>>

  /**
   * Construct and simulate a deposit_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deposit collateral tokens backing future borrows.
   */
  deposit_collateral: ({user, amount}: {user: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a withdraw_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw collateral while keeping the position healthy.
   */
  withdraw_collateral: ({user, amount}: {user: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_depositor_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Liquidity balance recorded for `depositor`.
   */
  get_depositor_balance: ({depositor}: {depositor: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_liquidation_params transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Effective liquidation parameters.
   */
  get_liquidation_params: (options?: MethodOptions) => Promise<AssembledTransaction<LiqParams>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAQAAADxQdWJsaWMgbGlxdWlkYXRpb24gb3V0Y29tZSwgcmV0dXJuZWQgZm9yIG9mZi1jaGFpbiBpbmRleGluZy4AAAAAAAAAEUxpcXVpZGF0aW9uUmVzdWx0AAAAAAAABAAAAAAAAAATYmFkX2RlYnRfc29jaWFsaXplZAAAAAALAAAAAAAAAAlib251c19icHMAAAAAAAAEAAAAAAAAAAtyZXBheV91bml0cwAAAAALAAAAAAAAAAtzZWl6ZV91bml0cwAAAAAL",
        "AAAAAAAAAC5Jbml0aWFsaXNlIHRoZSBjb250cmFjdCB3aXRoIGFuIGFkbWluaXN0cmF0b3IuAAAAAAAEaW5pdAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAD5FbWVyZ2VuY3kgY2lyY3VpdCBicmVha2VyOiBoYWx0IGFsbCBzdGF0ZS1jaGFuZ2luZyBvcGVyYXRpb25zLgAAAAAABXBhdXNlAAAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==",
        "AAAAAAAAADZSZXBheSBib3Jyb3dlZCB1bml0cyAoY2FwcGVkIGF0IHRoZSBvdXRzdGFuZGluZyBkZWJ0KS4AAAAAAAVyZXBheQAAAAAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAG9Cb3Jyb3cgZGVidC10b2tlbiB1bml0cyBhZ2FpbnN0IHBvc3RlZCBjb2xsYXRlcmFsLiBSZXZlcnRzIHdoZW4gdGhlCnJlc3VsdGluZyBoZWFsdGggZmFjdG9yIHdvdWxkIGRyb3AgYmVsb3cgMS4AAAAABmJvcnJvdwAAAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
        "AAAAAAAAAG1TdXBwbHkgZGVidC10b2tlbiBsaXF1aWRpdHkgdG8gdGhlIHBvb2wuIEVhcm5zIG5vdGhpbmcgYnkgaXRzZWxmOwpleHBvc2VkIHRvIHByby1yYXRhIGJhZC1kZWJ0IHNvY2lhbGl6YXRpb24uAAAAAAAAB2RlcG9zaXQAAAAAAgAAAAAAAAAJZGVwb3NpdG9yAAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAABhSZXN1bWUgbm9ybWFsIG9wZXJhdGlvbi4AAAAHdW5wYXVzZQAAAAABAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAA",
        "AAAAAAAAACpTdG9yZWQgVFdBUCBhY2N1bXVsYXRvciBzdGF0ZSBmb3IgYGFzc2V0YC4AAAAAAAhnZXRfdHdhcAAAAAEAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAEAAAPqAAAH0AAAABBQcmljZU9ic2VydmF0aW9u",
        "AAAAAAAAAD1QdXJlIFRXQVAgY29tcHV0YXRpb24gb3ZlciB0aGUgdHJhaWxpbmcgd2luZG93IChkaWFnbm9zdGljcykuAAAAAAAACHR3YXBfbm93AAAAAQAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAQAAAAs=",
        "AAAAAAAAAG9XaXRoZHJhdyBwcmV2aW91c2x5IHN1cHBsaWVkIGxpcXVpZGl0eS4gQmxvY2tlZCBiZXlvbmQgZnJlZSBwb29sCmxpcXVpZGl0eSAoYHRvdGFsX2RlcG9zaXRzIC0gdG90YWxfYm9ycm93ZWRgKS4AAAAACHdpdGhkcmF3AAAAAgAAAAAAAAAJZGVwb3NpdG9yAAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAPoAAAAEw==",
        "AAAAAAAAAOxFeGVjdXRlIGEgbGlxdWlkYXRpb24gYWdhaW5zdCBgYm9ycm93ZXJgJ3MgcG9zaXRpb24uIE9wZW4gdG8gYW55CmFjY291bnQgKHBlcm1pc3Npb25sZXNzKS4gQXBwbGllcyBkeW5hbWljIGluY2VudGl2ZXMgd2l0aGluIHRoZQpwZW5hbHR5IGNhcCBhbmQgdHJpZ2dlcnMgYmFkLWRlYnQgc29jaWFsaXphdGlvbiB3aGVuIHRoZSBzZWl6dXJlCmRyYWlucyBhbGwgY29sbGF0ZXJhbCB3aXRoIGRlYnQgcmVtYWluaW5nLgAAAAlsaXF1aWRhdGUAAAAAAAADAAAAAAAAAApsaXF1aWRhdG9yAAAAAAATAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAADHJlcGF5X2Ftb3VudAAAAAsAAAABAAAH0AAAABFMaXF1aWRhdGlvblJlc3VsdAAAAA==",
        "AAAAAAAAADtDb25maWd1cmUgdGhlIHNpbmdsZSBsZW5kaW5nIG1hcmtldCAoY29sbGF0ZXJhbC9kZWJ0IHBhaXIpLgAAAAAKc2V0X21hcmtldAAAAAAABAAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAABBjb2xsYXRlcmFsX3Rva2VuAAAAEwAAAAAAAAAKZGVidF90b2tlbgAAAAAAEwAAAAAAAAARbGlxX3RocmVzaG9sZF9icHMAAAAAAAAEAAAAAA==",
        "AAAAAAAAABtPcmFjbGUgY2hhaW4gY29uZmlndXJhdGlvbi4AAAAAC2dldF9vcmFjbGVzAAAAAAAAAAABAAAD6AAAA+0AAAACAAAAEwAAA+gAAAAT",
        "AAAAAAAAAERDb25maWd1cmUgdGhlIG9yYWNsZSBmYWlsb3ZlciBjaGFpbiAocHJpbWFyeSBmaXJzdCwgdGhlbiBzZWNvbmRhcnkpLgAAAAtzZXRfb3JhY2xlcwAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAB3ByaW1hcnkAAAAD6AAAABMAAAAAAAAACXNlY29uZGFyeQAAAAAAA+gAAAATAAAAAA==",
        "AAAAAAAAABtDdXJyZW50IHBvc2l0aW9uIG9mIGB1c2VyYC4AAAAADGdldF9wb3NpdGlvbgAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAB9AAAAAIUG9zaXRpb24=",
        "AAAAAAAAAGtLZWVwZXIgaG9vazogcmVmcmVzaCB0aGUgVFdBUCBhY2N1bXVsYXRvciBmcm9tIHRoZSBsaXZlIGZhaWxvdmVyCmNoYWluIHdpdGhvdXQgcGVyZm9ybWluZyBhbnkgb3RoZXIgYWN0aW9uLgAAAAAMcmVjb3JkX3ByaWNlAAAAAQAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAA==",
        "AAAAAAAAAB9Qb29sLWxldmVsIGFjY291bnRpbmcgc25hcHNob3QuAAAAAA1nZXRfcG9vbF9pbmZvAAAAAAAAAAAAAAEAAAPtAAAAAwAAAAsAAAALAAAABA==",
        "AAAAAAAAAFVIZWFsdGggZmFjdG9yIG9mIGB1c2VyYCBhcyB0aGUgZXhhY3QgZnJhY3Rpb24gYChudW0sIGRlbilgOwpoZWFsdGh5IGlmZiBgbnVtID49IGRlbmAuAAAAAAAADWhlYWx0aF9mYWN0b3IAAAAAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAPtAAAAAgAAAAsAAAAL",
        "AAAAAAAAADxQcmV2aWV3IHRoZSBwcmljZSByZXNvbHV0aW9uIHBhdGggZm9yIGBhc3NldGAgKGRpYWdub3N0aWNzKS4AAAANcHJldmlld19wcmljZQAAAAAAAAEAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAEAAAfQAAAAD1ByaWNlUmVzb2x1dGlvbgA=",
        "AAAAAAAAAB1EZXBvc2l0b3IgcmVnaXN0cnkgKG9yZGVyZWQpLgAAAAAAAA5nZXRfZGVwb3NpdG9ycwAAAAAAAAAAAAEAAAPqAAAAEw==",
        "AAAAAAAAAAAAAAAOaXNfcGF1c2VkX3ZpZXcAAAAAAAAAAAABAAAAAQ==",
        "AAAAAAAAAIFUdW5lIGxpcXVpZGF0aW9uIGluY2VudGl2ZXMuIEFsbCBicHMgdmFsdWVzIGFyZSB2YWxpZGF0ZWQgYW5kIHRoZQpwZW5hbHR5IGNhcCBpcyBhbHdheXMgZW5mb3JjZWQgZG93bnN0cmVhbSByZWdhcmRsZXNzIG9mIGlucHV0cy4AAAAAAAAOc2V0X2xpcV9wYXJhbXMAAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAOYmFzZV9ib251c19icHMAAAAAAAQAAAAAAAAADW1heF9ib251c19icHMAAAAAAAAEAAAAAAAAAA9wZW5hbHR5X2NhcF9icHMAAAAABAAAAAA=",
        "AAAAAAAAABVNYXJrZXQgY29uZmlndXJhdGlvbi4AAAAAAAARZ2V0X21hcmtldF9jb25maWcAAAAAAAAAAAAAAQAAB9AAAAAGTWFya2V0AAA=",
        "AAAAAAAAADFEZXBvc2l0IGNvbGxhdGVyYWwgdG9rZW5zIGJhY2tpbmcgZnV0dXJlIGJvcnJvd3MuAAAAAAAAEmRlcG9zaXRfY29sbGF0ZXJhbAAAAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
        "AAAAAAAAADdXaXRoZHJhdyBjb2xsYXRlcmFsIHdoaWxlIGtlZXBpbmcgdGhlIHBvc2l0aW9uIGhlYWx0aHkuAAAAABN3aXRoZHJhd19jb2xsYXRlcmFsAAAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAACtMaXF1aWRpdHkgYmFsYW5jZSByZWNvcmRlZCBmb3IgYGRlcG9zaXRvcmAuAAAAABVnZXRfZGVwb3NpdG9yX2JhbGFuY2UAAAAAAAABAAAAAAAAAAlkZXBvc2l0b3IAAAAAAAATAAAAAQAAAAs=",
        "AAAAAAAAACFFZmZlY3RpdmUgbGlxdWlkYXRpb24gcGFyYW1ldGVycy4AAAAAAAAWZ2V0X2xpcXVpZGF0aW9uX3BhcmFtcwAAAAAAAAAAAAEAAAfQAAAACUxpcVBhcmFtcwAAAA==",
        "AAAAAQAAAGNMZW5kaW5nIG1hcmtldCBjb25maWd1cmF0aW9uLiBBIG1hcmtldCBwYWlycyBvbmUgY29sbGF0ZXJhbCBhc3NldCB3aXRoCm9uZSBib3Jyb3dhYmxlIChkZWJ0KSBhc3NldC4AAAAAAAAAAAZNYXJrZXQAAAAAAAMAAAAuU3RlbGxhciBBc3NldCBDb250cmFjdCBhY2NlcHRlZCBhcyBjb2xsYXRlcmFsLgAAAAAAEGNvbGxhdGVyYWxfdG9rZW4AAAATAAAAQ1N0ZWxsYXIgQXNzZXQgQ29udHJhY3QgdGhhdCBjYW4gYmUgYm9ycm93ZWQgKHBvb2wgbGlxdWlkaXR5IGFzc2V0KS4AAAAACmRlYnRfdG9rZW4AAAAAABMAAACXTGlxdWlkYXRpb24gdGhyZXNob2xkIGluIGJhc2lzIHBvaW50cyAoZS5nLiA4XzAwMCA9IDgwJSkuCkEgcG9zaXRpb24gaXMgbGlxdWlkYXRhYmxlIHdoZW4KYGNvbGxhdGVyYWxfdmFsdWUgKiBsaXFfdGhyZXNob2xkX2JwcyA8IGRlYnRfdmFsdWUgKiAxMF8wMDBgLgAAAAARbGlxX3RocmVzaG9sZF9icHMAAAAAAAAE",
        "AAAAAQAAABpQZXItdXNlciBsZW5kaW5nIHBvc2l0aW9uLgAAAAAAAAAAAAhQb3NpdGlvbgAAAAIAAAAnQ29sbGF0ZXJhbCB1bml0cyBkZXBvc2l0ZWQgYnkgdGhlIHVzZXIuAAAAAApjb2xsYXRlcmFsAAAAAAALAAAAKURlYnQgdW5pdHMgb3dlZCBieSB0aGUgdXNlciAoZGVidCB0b2tlbikuAAAAAAAABGRlYnQAAAAL",
        "AAAAAQAAACpBZG1pbi1jb25maWd1cmFibGUgbGlxdWlkYXRpb24gcGFyYW1ldGVycy4AAAAAAAAAAAAJTGlxUGFyYW1zAAAAAAAAAwAAADhCb251cyBhdCBoZWFsdGggZmFjdG9yID0gMS4wLCBpbiBicHMgKGRlZmF1bHQgNTAwID0gNSUpLgAAAA5iYXNlX2JvbnVzX2JwcwAAAAAABAAAADNNYXhpbXVtIGR5bmFtaWMgYm9udXMsIGluIGJwcyAoZGVmYXVsdCAxNTAwID0gMTUlKS4AAAAADW1heF9ib251c19icHMAAAAAAAAEAAAANUhhcmQgY2FwIG9uIHRoZSBwZW5hbHR5LCBpbiBicHMgKGRlZmF1bHQgMjAwMCA9IDIwJSkuAAAAAAAAD3BlbmFsdHlfY2FwX2JwcwAAAAAE",
        "AAAAAQAAADhSZXN1bHQgb2YgYSBwcmljZSByZXNvbHV0aW9uIHRocm91Z2ggdGhlIGZhaWxvdmVyIGNoYWluLgAAAAAAAAAPUHJpY2VSZXNvbHV0aW9uAAAAAAIAAAAAAAAABXByaWNlAAAAAAAACwAAACEicHJpbWFyeSIsICJzZWNvbmRhcnkiIG9yICJ0d2FwIi4AAAAAAAAGc291cmNlAAAAAAAR",
        "AAAAAQAAADhPbmUgY3VtdWxhdGl2ZS1wcmljZSBzbmFwc2hvdCB1c2VkIGZvciBUV0FQIGNvbXB1dGF0aW9uLgAAAAAAAAAQUHJpY2VPYnNlcnZhdGlvbgAAAAIAAAAzQ3VtdWxhdGl2ZSBwcmljZS1zZWNvbmRzIGFjY3VtdWxhdG9yIHZhbHVlIGF0IGB0c2AuAAAAAANjdW0AAAAACwAAAD5MZWRnZXIgdGltZXN0YW1wIChzZWNvbmRzKSBhdCB3aGljaCB0aGUgc25hcHNob3Qgd2FzIHJlY29yZGVkLgAAAAAAAnRzAAAAAAAG" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<null>,
        pause: this.txFromJSON<null>,
        repay: this.txFromJSON<null>,
        borrow: this.txFromJSON<null>,
        deposit: this.txFromJSON<null>,
        unpause: this.txFromJSON<null>,
        get_twap: this.txFromJSON<Array<PriceObservation>>,
        twap_now: this.txFromJSON<i128>,
        withdraw: this.txFromJSON<null>,
        get_admin: this.txFromJSON<Option<string>>,
        liquidate: this.txFromJSON<LiquidationResult>,
        set_market: this.txFromJSON<null>,
        get_oracles: this.txFromJSON<Option<readonly [string, Option<string>]>>,
        set_oracles: this.txFromJSON<null>,
        get_position: this.txFromJSON<Position>,
        record_price: this.txFromJSON<null>,
        get_pool_info: this.txFromJSON<readonly [i128, i128, u32]>,
        health_factor: this.txFromJSON<readonly [i128, i128]>,
        preview_price: this.txFromJSON<PriceResolution>,
        get_depositors: this.txFromJSON<Array<string>>,
        is_paused_view: this.txFromJSON<boolean>,
        set_liq_params: this.txFromJSON<null>,
        get_market_config: this.txFromJSON<Market>,
        deposit_collateral: this.txFromJSON<null>,
        withdraw_collateral: this.txFromJSON<null>,
        get_depositor_balance: this.txFromJSON<i128>,
        get_liquidation_params: this.txFromJSON<LiqParams>
  }
}