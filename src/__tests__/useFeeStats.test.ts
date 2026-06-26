import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockFeeStats = {
  lastLedger: "100",
  lastLedgerBaseFee: "100",
  ledgerCapacityUsage: "0.5",
  feeCharged: {
    max: "1000",
    min: "100",
    mode: "100",
    p10: "100",
    p20: "100",
    p30: "100",
    p40: "100",
    p50: "100",
    p60: "200",
    p70: "300",
    p80: "400",
    p90: "500",
    p95: "700",
    p99: "900",
  },
  maxFee: {
    max: "5000",
    min: "100",
    mode: "200",
    p10: "100",
    p20: "150",
    p30: "200",
    p40: "250",
    p50: "300",
    p60: "400",
    p70: "500",
    p80: "600",
    p90: "800",
    p95: "1000",
    p99: "2000",
  },
};

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockFeeStats),
});

vi.stubGlobal("fetch", mockFetch);

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

import { useFeeStats } from "../hooks/useFeeStats";

describe("useFeeStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFeeStats),
    });
  });

  it("fetches fee stats and returns default 75th percentile recommendation", async () => {
    const { result } = renderHook(() => useFeeStats());

    await vi.waitFor(() => {
      expect(result.current.feeStats).not.toBeNull();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://horizon-testnet.stellar.org/fee_stats"
    );
    expect(result.current.feeStats).toEqual(mockFeeStats);
    expect(result.current.recommendedFee).toBe("600");
    expect(result.current.error).toBeNull();
  });

  it("returns 50th percentile when configured", async () => {
    const { result } = renderHook(() =>
      useFeeStats({ percentile: 50 })
    );

    await vi.waitFor(() => {
      expect(result.current.feeStats).not.toBeNull();
    });

    expect(result.current.recommendedFee).toBe("300");
  });

  it("returns 95th percentile when configured", async () => {
    const { result } = renderHook(() =>
      useFeeStats({ percentile: 95 })
    );

    await vi.waitFor(() => {
      expect(result.current.feeStats).not.toBeNull();
    });

    expect(result.current.recommendedFee).toBe("1000");
  });

  it("returns 99th percentile when configured", async () => {
    const { result } = renderHook(() =>
      useFeeStats({ percentile: 99 })
    );

    await vi.waitFor(() => {
      expect(result.current.feeStats).not.toBeNull();
    });

    expect(result.current.recommendedFee).toBe("2000");
  });

  it("returns error when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useFeeStats());

    await vi.waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error!.message).toBe(
      "Failed to fetch fee stats: 500"
    );
    expect(result.current.feeStats).toBeNull();
    expect(result.current.recommendedFee).toBeNull();
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(() =>
      useFeeStats({ enabled: false })
    );

    expect(result.current.feeStats).toBeNull();
    expect(result.current.recommendedFee).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
