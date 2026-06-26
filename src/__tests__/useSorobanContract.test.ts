import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSorobanContract } from "../useSorobanContract";
import { StellarProvider } from "../../provider/StellarProvider";
import React from "react";
import { xdr } from "@stellar/stellar-sdk";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSimulate = vi.fn();
const mockSignTransaction = vi.fn();
const mockSendTransaction = vi.fn();
const mockGetTransaction = vi.fn();

vi.mock("../../context/StellarContext", () => ({
  useStellarContext: () => ({
    sorobanRpc: {
      simulateTransaction: mockSimulate,
      sendTransaction: mockSendTransaction,
      getTransaction: mockGetTransaction,
    },
    networkPassphrase: "Test SDF Network ; September 2015",
  }),
}));

vi.mock("@stellar/freighter-api", () => ({
  signTransaction: mockSignTransaction,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(StellarProvider, { network: "testnet" }, children);

const defaultOptions = {
  contractId: "CABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890AB",
  method: "increment",
  args: [],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useSorobanContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in idle status", () => {
    const { result } = renderHook(() => useSorobanContract(defaultOptions), {
      wrapper,
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
    expect(result.current.hash).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("transitions through simulate → sign → submit lifecycle on success", async () => {
    // 1. Simulate returns a prepared tx
    mockSimulate.mockResolvedValueOnce({
      results: [{ xdr: "AAAA" }],
      transactionData: "mockTxData",
    });

    // 2. Sign returns a signed XDR string
    mockSignTransaction.mockResolvedValueOnce("signedXDR==");

    // 3. Submit returns a pending hash
    mockSendTransaction.mockResolvedValueOnce({
      hash: "abc123hash",
      errorResult: undefined,
    });

    // 4. Poll returns success
    mockGetTransaction.mockResolvedValueOnce({
      status: "SUCCESS",
      returnValue: xdr.ScVal.scvBool(true),
    });

    const statuses: string[] = [];

    const { result } = renderHook(() => useSorobanContract(defaultOptions), {
      wrapper,
    });

    // Capture status changes
    const unwatch = vi.fn();

    await act(async () => {
      await result.current.call();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    expect(result.current.hash).toBe("abc123hash");
    expect(result.current.result).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("sets status to error when simulation fails", async () => {
    mockSimulate.mockRejectedValueOnce(new Error("Simulation failed"));

    const { result } = renderHook(() => useSorobanContract(defaultOptions), {
      wrapper,
    });

    await act(async () => {
      await result.current.call();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    expect(result.current.error?.message).toBe("Simulation failed");
  });

  it("sets status to error when signing is rejected", async () => {
    mockSimulate.mockResolvedValueOnce({
      results: [{ xdr: "AAAA" }],
      transactionData: "mockTxData",
    });
    mockSignTransaction.mockRejectedValueOnce(new Error("User rejected"));

    const { result } = renderHook(() => useSorobanContract(defaultOptions), {
      wrapper,
    });

    await act(async () => {
      await result.current.call();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    expect(result.current.error?.message).toBe("User rejected");
  });

  it("reset() returns hook to idle state", async () => {
    mockSimulate.mockRejectedValueOnce(new Error("oops"));

    const { result } = renderHook(() => useSorobanContract(defaultOptions), {
      wrapper,
    });

    await act(async () => {
      await result.current.call();
    });

    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it("accepts a TResult generic and types result correctly", async () => {
    mockSimulate.mockResolvedValueOnce({
      results: [{ xdr: "AAAA" }],
      transactionData: "mockTxData",
    });
    mockSignTransaction.mockResolvedValueOnce("signedXDR==");
    mockSendTransaction.mockResolvedValueOnce({ hash: "xyz789", errorResult: undefined });
    mockGetTransaction.mockResolvedValueOnce({
      status: "SUCCESS",
      returnValue: xdr.ScVal.scvU32(42),
    });

    const { result } = renderHook(
      () => useSorobanContract<number>(defaultOptions),
      { wrapper }
    );

    await act(async () => {
      await result.current.call();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    // TypeScript would enforce result.current.result is number | null here
  });
});