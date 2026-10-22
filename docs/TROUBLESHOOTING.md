# Troubleshooting Guide: Wallet & Testnet Setup

This guide covers common issues when connecting Freighter wallet to Stellar testnet in StellarSettle.

---

## Issue 1: Wrong Network - Freighter Connected to Mainnet

**Symptom:**
- "Transaction rejected" or "Account not found" error
- Freighter shows "Stellar" or "Public Global Stellar Network"
- Can't find your test account

**Fix:**
1. Open Freighter extension
2. Click the network dropdown (top-right corner)
3. Select "Testnet" (should show "Stellar Testnet")
4. Refresh the StellarSettle page
5. Verify the URL shows testnet (e.g., `https://testnet.stellarsettle.com`)

**Why:** Testnet and Mainnet are separate networks. Testnet accounts don't exist on Mainnet and vice versa.

---

## Issue 2: Unfunded Account - No XLM Balance

**Symptom:**
- "Insufficient balance" error when trying to create settlement
- Freighter shows 0 XLM
- "Payment failed: Source account not found" error

**Fix:**
1. Get your testnet public address:
   - Click Freighter → click your account name
   - Copy the public address (starts with `G`)

2. Fund the account via Stellar Testnet Faucet:
   - Go to https://stellar.expert/testnet/faucet (or https://friendbot.stellar.org/)
   - Paste your public address
   - Click "Fund Account"
   - Wait ~5 seconds

3. Verify funding in Freighter:
   - Refresh Freighter (click the refresh icon)
   - Your balance should show ~10,000 XLM

4. Try the transaction again in StellarSettle

**Why:** Testnet accounts start with zero balance. The faucet gives 10,000 XLM for testing.

**Alternative Faucet:** If stellar.expert is down, try:
- FriendBot: https://friendbot.stellar.org/?addr=GYOURADDRESSHERE
- Stellar Lab: https://stellar.org/laboratory (Network → Testnet, then Fund)

---

## Issue 3: Transaction Rejected - Signing Failed

**Symptom:**
- Freighter popup shows "Sign Transaction" but clicking "Sign" does nothing
- Error: "Signature rejected" or "User denied signature"
- Transaction disappears from Freighter

**Fix:**

### A. Freighter Permission Issue
1. Go to Freighter settings (gear icon)
2. Click "Permissions"
3. Find `stellarsettle.com` in the list
4. Click it and select "Always allow"
5. Refresh StellarSettle page
6. Try signing again

### B. Wrong Freighter Account
1. Verify Freighter is showing your intended account
   - Click Freighter → should show your account name
   - If not, switch to the correct account
2. Verify it's the same account you funded via testnet faucet
3. Try signing again

### C. Freighter Password Issue
1. If Freighter is locked, click the lock icon
2. Enter your Freighter password
3. Try signing the transaction again

### D. Network Mismatch (See Issue 1)
- Ensure Freighter is set to **Testnet**
- Ensure StellarSettle URL is testnet domain
- Both must match

**Why:** Freighter can reject signatures if:
- It's locked or needs re-authentication
- The site doesn't have permission
- You're on the wrong network
- You're signing with the wrong account

---

## Issue 4: "Account Not Found" After Getting Funded

**Symptom:**
- Faucet said "Account created!"
- But StellarSettle shows "Account not found"
- Or Freighter shows the balance but backend says it doesn't exist

**Fix:**
1. Wait 30 seconds (faucet takes a moment to propagate)
2. Refresh the StellarSettle page
3. Check if testnet RPC is up:
   - Go to https://stellar-testnet-rpc.com/ (or your configured RPC endpoint)
   - Should respond with JSON

4. If still not found, try funding with a different method:
   - Use Stellar Lab: https://stellar.org/laboratory
   - Network: Testnet
   - Account ID: Your public address
   - Build Transaction → Create Account

**Why:** Testnet RPC can lag by a few seconds. New accounts take time to propagate across the network.

---

## Issue 5: "Insufficient Balance" Despite Having XLM

**Symptom:**
- Freighter shows 10,000 XLM
- But settlement creation fails with "Insufficient balance"
- Error mentions minimum balance or reserve

**Fix:**
1. Stellar requires a **minimum reserve** (currently ~2 XLM per account)
   - Plus transaction fees (~0.00001 XLM per operation)
   - Plus any trustline setup costs

2. Check minimum balance requirement:
   - Freighter should show "Available Balance" (not total)
   - Available = Total - Minimum Reserve
   - Minimum ≥ 2 XLM for basic account

3. If available balance is low:
   - Fund again via faucet
   - Or wait for previous transactions to complete

**Why:** Stellar accounts have a minimum reserve to prevent spam. Not all of your balance is usable for transactions.

---

## Quick Checklist

Before reporting an issue, verify:

- [ ] Freighter network is set to **Testnet** (not Mainnet)
- [ ] StellarSettle URL shows testnet domain
- [ ] Your account was funded via testnet faucet
- [ ] Freighter is unlocked (check lock icon)
- [ ] Website has permission to use Freighter (check Permissions)
- [ ] You're signing with the **correct account** in Freighter
- [ ] Account has at least **3 XLM available** (not total)
- [ ] You waited 30+ seconds after funding for network propagation

---

## Getting Help

If the above doesn't resolve your issue:

1. **Enable Debug Logging:**
   - Open browser console (F12)
   - Look for error messages with "account" or "transaction" in them
   - Screenshot the error

2. **Check Network Status:**
   - Go to https://stellar.expert/testnet/status
   - Verify Testnet is operational

3. **Try a Different Browser:**
   - Sometimes Freighter caching causes issues
   - Try Chrome, Firefox, or clear browser cache

4. **Reset Freighter (Last Resort):**
   - Open Freighter → Settings → Security
   - Click "Reset Wallet" (this wipes all accounts locally, but they're recoverable via seed phrase)
   - Re-import your testnet account

5. **Report the Issue:**
   - Include: browser, Freighter version, full error message from console (F12)
   - Link: [GitHub Issues](https://github.com/Kingsman-99/stellarsettle/issues)
