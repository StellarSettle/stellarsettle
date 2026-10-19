import {
  Account,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { getNetwork, requestAccess, signTransaction } from "@stellar/freighter-api";

const network = import.meta.env.VITE_STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet";
const rpcUrl = import.meta.env.VITE_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const passphrase = network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
const contractId = import.meta.env.VITE_STELLAR_CONTRACT_ID as string;
const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });

export const roles = ["Pauser", "FeeManager", "ComplianceOfficer", "ArbiterManager"] as const;
export type Role = (typeof roles)[number];
export type FeeConfig = { fee_bps: number; treasury: string };
export type DisputeEntry = { shipment_id: string; milestone_index: number };

export type Wallet = { address: string; network: string; networkPassphrase: string };
export type Shipment = {
  id: string;
  status: string;
  supplier: string;
  token: string;
  total_amount: string;
  released_amount: string;
  milestone_count: number;
  open_disputes: number;
  created_at: number;
};

function requireContract(): Contract {
  if (!contractId) throw new Error("Set VITE_STELLAR_CONTRACT_ID in frontend/.env.local first.");
  return new Contract(contractId);
}

function scString(value: string) {
  return nativeToScVal(value, { type: "string" });
}

function scAddress(value: string) {
  return nativeToScVal(value, { type: "address" });
}

function scSymbol(value: string) {
  return nativeToScVal(value, { type: "symbol" });
}

export async function connectWallet(): Promise<Wallet> {
  if (import.meta.env.VITE_E2E === "true" && window.__STELLARSETTLE_E2E_WALLET__) return window.__STELLARSETTLE_E2E_WALLET__;
  const access = await requestAccess();
  if (access.error) throw new Error(access.error.message);
  if (!access.address) throw new Error("Freighter did not return an account address.");
  const selectedNetwork = await getNetwork();
  if (selectedNetwork.error) throw new Error(selectedNetwork.error.message);
  if (selectedNetwork.networkPassphrase !== passphrase) {
    throw new Error(`Freighter is on ${selectedNetwork.network}; this app is configured for ${network}.`);
  }
  return { address: access.address, network: selectedNetwork.network, networkPassphrase: selectedNetwork.networkPassphrase };
}

function scU32(value: number) {
  return nativeToScVal(value, { type: "u32" });
}

function scEnum(variant: string) {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant)]);
}

const scNone = () => xdr.ScVal.scvVoid();

declare global {
  interface Window {
    __STELLARSETTLE_E2E_WALLET__?: Wallet;
  }
}

/** Simulate a read-only contract call. Simulation needs no on-chain sequence number. */
async function readContract<T>(address: string, method: string, ...args: xdr.ScVal[]): Promise<T> {
  const transaction = new TransactionBuilder(new Account(address, "0"), { fee: BASE_FEE, networkPassphrase: passphrase })
    .addOperation(requireContract().call(method, ...args))
    .setTimeout(30)
    .build();
  const simulated = await server.simulateTransaction(transaction);
  if ("error" in simulated) throw new Error(simulated.error);
  const result = simulated.result;
  if (!result) throw new Error("Contract query returned no result.");
  return scValToNative(result.retval) as T;
}

/** Simulate, sign with Freighter, submit and wait for a contract call to land. */
async function invokeContract(wallet: Wallet, method: string, ...args: xdr.ScVal[]): Promise<string> {
  const account = await server.getAccount(wallet.address);
  const transaction = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: passphrase })
    .addOperation(requireContract().call(method, ...args))
    .setTimeout(60)
    .build();
  const simulated = await server.simulateTransaction(transaction);
  if ("error" in simulated) throw new Error(simulated.error);
  const prepared = rpc.assembleTransaction(transaction, simulated).build();
  const signed = await signTransaction(prepared.toXDR(), {
    networkPassphrase: passphrase,
    address: wallet.address,
  });
  if (signed.error) throw new Error(signed.error.message);
  const signedTransaction = TransactionBuilder.fromXDR(signed.signedTxXdr, passphrase);
  const submitted = await server.sendTransaction(signedTransaction);
  if (submitted.status === "ERROR") throw new Error("The network rejected the signed transaction.");

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = await server.getTransaction(submitted.hash);
    if (result.status === "SUCCESS") return submitted.hash;
    if (result.status === "FAILED") throw new Error(`The ${method} transaction failed on-chain.`);
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
  }
  throw new Error(`Transaction ${submitted.hash} is still pending. Check it on Stellar Expert.`);
}

export function getShipmentSummary(address: string, shipmentId: string): Promise<Shipment> {
  return readContract<Shipment>(address, "get_shipment_summary", scString(shipmentId));
}

export function setShipmentMetadata(wallet: Wallet, shipmentId: string, key: string, value: string): Promise<string> {
  return invokeContract(wallet, "set_shipment_metadata", scAddress(wallet.address), scString(shipmentId), scSymbol(key), scString(value));
}

// ---- Admin ----

export function isPaused(address: string): Promise<boolean> {
  return readContract<boolean>(address, "is_paused");
}

export function hasRole(address: string, role: Role, target: string): Promise<boolean> {
  return readContract<boolean>(address, "has_role", scEnum(role), scAddress(target));
}

export function getFeeConfig(address: string): Promise<FeeConfig | null> {
  return readContract<FeeConfig | null>(address, "get_fee_config");
}

export function setPaused(wallet: Wallet, paused: boolean): Promise<string> {
  return invokeContract(wallet, paused ? "pause" : "unpause", scAddress(wallet.address));
}

export function setRole(wallet: Wallet, role: Role, target: string, grant: boolean): Promise<string> {
  return invokeContract(wallet, grant ? "grant_role" : "revoke_role", scAddress(wallet.address), scEnum(role), scAddress(target));
}

export function setFeeConfig(wallet: Wallet, feeBps: number, treasury: string): Promise<string> {
  return invokeContract(wallet, "set_fee_config", scAddress(wallet.address), scU32(feeBps), scAddress(treasury));
}

// ---- Arbiter ----

export async function getArbiterDisputes(arbiter: string): Promise<DisputeEntry[]> {
  const [shipmentIds, active] = await Promise.all([
    readContract<string[]>(arbiter, "get_shipments_by_arbiter", scAddress(arbiter), scNone(), scU32(200)),
    readContract<DisputeEntry[]>(arbiter, "get_active_disputes"),
  ]);
  const assigned = new Set(shipmentIds);
  return active.filter((entry) => assigned.has(entry.shipment_id));
}

export function resolveDispute(wallet: Wallet, shipmentId: string, milestoneIndex: number, approve: boolean): Promise<string> {
  return invokeContract(wallet, "resolve_dispute", scAddress(wallet.address), scString(shipmentId), scU32(milestoneIndex), xdr.ScVal.scvBool(approve), scNone());
}

export const appNetwork = network;
export const configuredContractId = contractId;
export const configuredAdminAddress = (import.meta.env.VITE_STELLAR_ADMIN_ADDRESS as string | undefined) || "";