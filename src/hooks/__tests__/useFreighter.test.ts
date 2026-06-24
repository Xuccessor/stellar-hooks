import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFreighter } from "../useFreighter";

// Mock @stellar/freighter-api v6
vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  getPublicKey: vi.fn(),
  getNetworkDetails: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
  signAuthEntry: vi.fn(),
}));

import * as freighter from "@stellar/freighter-api";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useFreighter", () => {
  it("returns isInstalled=false when freighter is not connected", async () => {
    vi.mocked(freighter.isConnected).mockResolvedValue({ isConnected: false });
    const { result } = renderHook(() => useFreighter());
    await act(async () => {});
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
  });

  it("returns publicKey and network after connect()", async () => {
    vi.mocked(freighter.isConnected).mockResolvedValue({ isConnected: true });
    vi.mocked(freighter.requestAccess).mockResolvedValue({ publicKey: "GABC...XYZ" });
    vi.mocked(freighter.getNetworkDetails).mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    const { result } = renderHook(() => useFreighter());
    await act(async () => { await result.current.connect(); });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.publicKey).toBe("GABC...XYZ");
    expect(result.current.network).toBe("TESTNET");
  });

  it("sets error when requestAccess rejects", async () => {
    vi.mocked(freighter.isConnected).mockResolvedValue({ isConnected: true });
    vi.mocked(freighter.requestAccess).mockRejectedValue(new Error("User denied"));

    const { result } = renderHook(() => useFreighter());
    await act(async () => { await result.current.connect(); });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.isConnected).toBe(false);
  });

  it("signs a transaction via freighter", async () => {
    vi.mocked(freighter.signTransaction).mockResolvedValue({ signedTxXdr: "signed-xdr-string" });
    const { result } = renderHook(() => useFreighter());
    const signed = await result.current.signTransaction("raw-xdr");
    expect(signed).toBe("signed-xdr-string");
  });

  it("clears state on disconnect()", async () => {
    const { result } = renderHook(() => useFreighter());
    await act(async () => { result.current.disconnect(); });
    expect(result.current.publicKey).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });
});