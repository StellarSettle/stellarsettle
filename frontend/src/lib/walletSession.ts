const WALLET_SESSION_KEY = "stellarsettle:walletAddress";

export function saveWalletSession(address: string): void {
  try {
    sessionStorage.setItem(WALLET_SESSION_KEY, address);
  } catch {
    /* ignore */
  }
}

export function clearWalletSession(): void {
  try {
    sessionStorage.removeItem(WALLET_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function loadWalletSession(): string {
  try {
    return sessionStorage.getItem(WALLET_SESSION_KEY) ?? "";
  } catch {
    return "";
  }
}