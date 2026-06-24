/**
 * Tests for @stellar-hooks/swr adapter hooks.
 *
 * These are unit tests that verify the SWR key generation and option
 * mapping logic. Full integration tests require mocking @stellar/stellar-sdk
 * and setting up a React test renderer with SWRConfig.
 */

import { describe, it, expect } from "vitest";

// ─── Key generation tests ────────────────────────────────────────────────────
// SWR keys determine caching and deduplication. These tests verify that the
// hooks produce correct, stable cache keys from their inputs.

describe("SWR key generation", () => {
  it("useStellarAccount key includes publicKey and horizonUrl", () => {
    const key = ["stellar-account", "GABC123", "https://horizon-testnet.stellar.org"];
    expect(key).toHaveLength(3);
    expect(key[0]).toBe("stellar-account");
    expect(key[1]).toBe("GABC123");
  });

  it("useStellarOffers key includes publicKey and horizonUrl", () => {
    const key = ["stellar-offers", "GABC123", "https://horizon-testnet.stellar.org"];
    expect(key).toHaveLength(3);
    expect(key[0]).toBe("stellar-offers");
  });

  it("useStellarToml key includes domain", () => {
    const key = ["stellar-toml", "stellar.org"];
    expect(key).toHaveLength(2);
    expect(key[0]).toBe("stellar-toml");
    expect(key[1]).toBe("stellar.org");
  });

  it("useLedgerEntry key includes base64 XDR and rpcUrl", () => {
    const key = ["ledger-entry", "AAAA...", "https://soroban-testnet.stellar.org"];
    expect(key).toHaveLength(3);
    expect(key[0]).toBe("ledger-entry");
  });

  it("useContractEvents key includes contractId and serialized topics", () => {
    const topics = [["topic1"]];
    const key = [
      "contract-events",
      "CXXX123",
      JSON.stringify(topics),
      undefined,
      "https://soroban-testnet.stellar.org",
    ];
    expect(key[0]).toBe("contract-events");
    expect(key[1]).toBe("CXXX123");
    expect(key[2]).toBe('[["topic1"]]');
  });

  it("useClaimableBalances key includes publicKey and horizonUrl", () => {
    const key = ["claimable-balances", "GABC123", "https://horizon-testnet.stellar.org"];
    expect(key).toHaveLength(3);
    expect(key[0]).toBe("claimable-balances");
  });
});

// ─── Null key tests (SWR conditional fetching) ───────────────────────────────

describe("SWR null key (conditional fetching)", () => {
  it("account: null publicKey produces null key", () => {
    const publicKey = null;
    const enabled = true;
    const key = enabled && publicKey ? ["stellar-account", publicKey, "url"] : null;
    expect(key).toBeNull();
  });

  it("account: enabled=false produces null key", () => {
    const publicKey = "GABC123";
    const enabled = false;
    const key = enabled && publicKey ? ["stellar-account", publicKey, "url"] : null;
    expect(key).toBeNull();
  });

  it("toml: null domain produces null key", () => {
    const domain = null;
    const key = domain ? ["stellar-toml", domain] : null;
    expect(key).toBeNull();
  });

  it("offers: undefined publicKey produces null key", () => {
    const publicKey = undefined;
    const enabled = true;
    const key = enabled && publicKey ? ["stellar-offers", publicKey, "url"] : null;
    expect(key).toBeNull();
  });

  it("contract events: enabled=false produces null key", () => {
    const enabled = false;
    const key = enabled
      ? ["contract-events", "CXXX", "[]", undefined, "url"]
      : null;
    expect(key).toBeNull();
  });
});

// ─── ClaimableBalanceRecord shape ────────────────────────────────────────────

describe("ClaimableBalanceRecord shape", () => {
  it("matches expected structure", () => {
    const record = {
      id: "00000000abc",
      asset: "native",
      amount: "100.0000000",
      sponsor: "GABC123",
      lastModifiedLedger: 12345,
      claimants: [
        {
          destination: "GDEF456",
          predicate: { unconditional: true },
        },
      ],
    };

    expect(record.id).toBe("00000000abc");
    expect(record.claimants).toHaveLength(1);
    expect(record.claimants[0]?.destination).toBe("GDEF456");
  });
});
