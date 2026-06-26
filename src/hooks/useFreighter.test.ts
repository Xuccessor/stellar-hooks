import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFreighter } from "./useFreighter";
import {
  resetFreighterMocks,
  requestAccess,
  getNetworkDetails,
  signTransaction,
} from "@stellar/freighter-api";

beforeEach(() => {
  resetFreighterMocks();
});

describe("useFreighter — Freighter not installed", () => {
  it("reports isInstalled false and isConnected false", async () => {
    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    expect(result.current.network).toBeNull();
    expect(result.current.networkPassphrase).toBeNull();
  });

  it("connect() sets an error state when Freighter is absent", async () => {
    vi.mocked(requestAccess).mockRejectedValue(
      new Error("Install Freighter to connect — https://freighter.app"),
    );

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("freighter.app");
  });

  it("connect() surfaces an API error response without throwing", async () => {
    vi.mocked(requestAccess).mockResolvedValue({
      address: "",
      error: { message: "Extension not found", code: -1 },
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("Extension not found");
  });

  it("signTransaction() throws when the wallet returns an error", async () => {
    vi.mocked(signTransaction).mockResolvedValue({
      signedTxXdr: "",
      error: { message: "Wallet not available" },
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      result.current.signTransaction("xdr" as any),
    ).rejects.toThrow("Wallet not available");
  });

  it("signAuthEntry() throws 'Wallet not connected' when publicKey is null", async () => {
    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.publicKey).toBeNull();
    await expect(
      result.current.signAuthEntry("entry-xdr" as any),
    ).rejects.toThrow("Wallet not connected");
  });

  it("signBlob() throws 'Wallet not connected' when publicKey is null", async () => {
    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.publicKey).toBeNull();
    await expect(result.current.signBlob("blob")).rejects.toThrow(
      "Wallet not connected",
    );
  });
});
