import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFreighter } from "../useFreighter";

const VALID_KEY = "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ";

// Mock @stellar/freighter-api v6
vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  getAddress: vi.fn(),
  getNetworkDetails: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
  signAuthEntry: vi.fn(),
  signMessage: vi.fn(),
}));

import * as freighter from "@stellar/freighter-api";

/** Set up mocks so the probe effect sees the wallet as not installed. */
function mockNotInstalled() {
  vi.mocked(freighter.isConnected).mockResolvedValue({ isConnected: false });
}

/** Set up mocks so the probe effect sees the wallet as installed but not yet authorised. */
function mockDisconnected() {
  vi.mocked(freighter.isConnected).mockResolvedValue({ isConnected: true });
  vi.mocked(freighter.getAddress).mockResolvedValue({ address: "" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useFreighter", () => {
  it("returns isInstalled=false when freighter is not connected", async () => {
    mockNotInstalled();
    const { result } = renderHook(() => useFreighter());
    await act(async () => {});
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
  });

  it("returns publicKey and network after connect()", async () => {
    // The probe sees the wallet as installed but not yet authorised so it dispatches
    // SET_DISCONNECTED. Then connect() calls requestAccess + getNetworkDetails.
    mockDisconnected();
    vi.mocked(freighter.requestAccess).mockResolvedValue({ address: VALID_KEY });
    vi.mocked(freighter.getNetworkDetails).mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    const { result } = renderHook(() => useFreighter());
    // Settle the probe effect (SET_DISCONNECTED)
    await act(async () => {});
    // Now connect
    await act(async () => { await result.current.connect(); });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.publicKey).toBe(VALID_KEY);
    expect(result.current.network).toBe("TESTNET");
  });

  it("sets error when requestAccess rejects", async () => {
    mockDisconnected();
    vi.mocked(freighter.requestAccess).mockRejectedValue(new Error("User denied"));

    const { result } = renderHook(() => useFreighter());
    await act(async () => {});
    await act(async () => { await result.current.connect(); });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.isConnected).toBe(false);
  });

  it("signs a transaction via freighter", async () => {
    mockNotInstalled();
    vi.mocked(freighter.signTransaction).mockResolvedValue({ signedTxXdr: "signed-xdr-string" });
    const { result } = renderHook(() => useFreighter());
    const signed = await result.current.signTransaction("raw-xdr" as never);
    expect(signed).toBe("signed-xdr-string");
  });

  it("clears state on disconnect()", async () => {
    mockDisconnected();
    const { result } = renderHook(() => useFreighter());
    await act(async () => {});
    await act(async () => { result.current.disconnect(); });
    expect(result.current.publicKey).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });
});
