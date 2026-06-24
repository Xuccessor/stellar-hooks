import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useStellarAccount } from "../useStellarAccount";
import React from "react";

// ── Mock Horizon Server ───────────────────────────────────────────────────────

const mockLoadAccount = vi.fn();

vi.mock("../../context/StellarContext", () => ({
  useStellarContext: () => ({
    horizonServer: {
      loadAccount: mockLoadAccount,
    },
    network: "testnet",
  }),
}));

// ── Mock account response ─────────────────────────────────────────────────────

const MOCK_PUBLIC_KEY =
  "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

const mockAccountResponse = {
  account_id: MOCK_PUBLIC_KEY,
  sequence: "123456789",
  balances: [
    {
      balance: "100.0000000",
      asset_type: "native",
    },
    {
      balance: "50.0000000",
      asset_type: "credit_alphanum4",
      asset_code: "USDC",
      asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    },
  ],
  subentry_count: 2,
  thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
  flags: { auth_required: false, auth_revocable: false, auth_immutable: false },
  signers: [{ weight: 1, key: MOCK_PUBLIC_KEY, type: "ed25519_public_key" }],
  data: {},
  last_modified_ledger: 999,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useStellarAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns loading state on initial fetch", () => {
    // Keep the promise pending so we catch the loading state
    mockLoadAccount.mockReturnValueOnce(new Promise(() => {}));

    const { result } = renderHook(() => useStellarAccount(MOCK_PUBLIC_KEY));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("returns account data on successful fetch", async () => {
    mockLoadAccount.mockResolvedValueOnce(mockAccountResponse);

    const { result } = renderHook(() => useStellarAccount(MOCK_PUBLIC_KEY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.sequence).toBe("123456789");
    expect(result.current.data?.balances).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it("exposes native XLM balance in balances array", async () => {
    mockLoadAccount.mockResolvedValueOnce(mockAccountResponse);

    const { result } = renderHook(() => useStellarAccount(MOCK_PUBLIC_KEY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const xlm = result.current.data?.balances.find(
      (b) => b.asset_type === "native"
    );
    expect(xlm?.balance).toBe("100.0000000");
  });

  it("sets error state when Horizon server fails", async () => {
    mockLoadAccount.mockRejectedValueOnce(new Error("Horizon 503"));

    const { result } = renderHook(() => useStellarAccount(MOCK_PUBLIC_KEY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toBe("Horizon 503");
  });

  it("does not fetch when publicKey is null", () => {
    const { result } = renderHook(() => useStellarAccount(null));

    expect(mockLoadAccount).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it("does not fetch when enabled: false", () => {
    const { result } = renderHook(() =>
      useStellarAccount(MOCK_PUBLIC_KEY, { enabled: false })
    );

    expect(mockLoadAccount).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes lastFetchedAt after a successful fetch", async () => {
    mockLoadAccount.mockResolvedValueOnce(mockAccountResponse);

    const before = new Date();
    const { result } = renderHook(() => useStellarAccount(MOCK_PUBLIC_KEY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.lastFetchedAt).toBeInstanceOf(Date);
    expect(result.current.lastFetchedAt!.getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
  });

  it("refetch() re-calls Horizon and updates data", async () => {
    const secondResponse = {
      ...mockAccountResponse,
      sequence: "999999999",
    };

    mockLoadAccount
      .mockResolvedValueOnce(mockAccountResponse)
      .mockResolvedValueOnce(secondResponse);

    const { result } = renderHook(() => useStellarAccount(MOCK_PUBLIC_KEY));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.sequence).toBe("123456789");

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() =>
      expect(result.current.data?.sequence).toBe("999999999")
    );
    expect(mockLoadAccount).toHaveBeenCalledTimes(2);
  });

  it("polls at the given refetchInterval", async () => {
    vi.useFakeTimers();
    mockLoadAccount.mockResolvedValue(mockAccountResponse);

    const { result } = renderHook(() =>
      useStellarAccount(MOCK_PUBLIC_KEY, { refetchInterval: 5000 })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockLoadAccount).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mockLoadAccount).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
/**
 * @file useStellarAccount.test.ts
 * @description Unit tests for the useStellarAccount hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStellarAccount } from "../hooks/useStellarAccount";
import { Horizon } from "@stellar/stellar-sdk";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@stellar/stellar-sdk", () => {
  const mockLoadAccount = vi.fn();
  return {
    StrKey: {
      isValidEd25519PublicKey: vi.fn().mockReturnValue(true),
    },
    Horizon: {
      Server: vi.fn().mockImplementation(() => ({
        loadAccount: mockLoadAccount,
      })),
    },
  };
});

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
    },
  }),
}));

const mockLoadAccount = vi.mocked(new Horizon.Server("").loadAccount);

const XLM_ONLY_RESPONSE = {
  account_id: "GABC...",
  sequence: "123",
  subentry_count: 0,
  thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
  flags: { auth_required: false, auth_revocable: false, auth_immutable: false, auth_clawback_enabled: false },
  balances: [
    { asset_type: "native", balance: "100.0000000", buying_liabilities: "0.0000000", selling_liabilities: "0.0000000" },
  ],
} as unknown as Horizon.AccountResponse;

const MULTI_ASSET_RESPONSE = {
  account_id: "GABC...",
  sequence: "123",
  subentry_count: 2,
  thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
  flags: { auth_required: false, auth_revocable: false, auth_immutable: false, auth_clawback_enabled: false },
  balances: [
    { asset_type: "native", balance: "100.0000000", buying_liabilities: "0.0000000", selling_liabilities: "0.0000000" },
    { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "GABC...", balance: "50.0000000", buying_liabilities: "0.0000000", selling_liabilities: "0.0000000", limit: "1000.0000000" },
    { asset_type: "credit_alphanum12", asset_code: "STELLAR", asset_issuer: "GXYZ...", balance: "10.0000000", buying_liabilities: "0.0000000", selling_liabilities: "0.0000000", limit: "1000.0000000" },
  ],
} as unknown as Horizon.AccountResponse;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useStellarAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles account with no trustlines (XLM only)", async () => {
    mockLoadAccount.mockResolvedValueOnce(XLM_ONLY_RESPONSE);

    const { result } = renderHook(() => useStellarAccount("GABC..."));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.balances).toHaveLength(1);
    const firstBalance = result.current.data?.balances[0];
    expect(firstBalance?.isNative).toBe(true);
    expect(firstBalance?.balance).toBe("100.0000000");
  });

  it("handles account with multiple custom assets", async () => {
    mockLoadAccount.mockResolvedValueOnce(MULTI_ASSET_RESPONSE);

    const { result } = renderHook(() => useStellarAccount("GABC..."));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.balances).toHaveLength(3);
    expect(result.current.data?.balances.find(b => b.assetCode === "USDC")).toBeDefined();
    expect(result.current.data?.balances.find(b => b.assetCode === "STELLAR")).toBeDefined();
  });

  it("handles null publicKey by resetting state", async () => {
    const { result } = renderHook(() => useStellarAccount(null));

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockLoadAccount).not.toHaveBeenCalled();
  });

  it("respects the disabled state (enabled: false)", async () => {
    const { result } = renderHook(() => useStellarAccount("GABC...", { enabled: false }));

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockLoadAccount).not.toHaveBeenCalled();
  });

  it("handles fetch errors correctly", async () => {
    const error = new Error("Account not found");
    mockLoadAccount.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useStellarAccount("GABC..."));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe(error);
    expect(result.current.data).toBeNull();
  });
});
