/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSorobanContract } from "../hooks/useSorobanContract";
import { rpc, xdr } from "@stellar/stellar-sdk";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockSignTransaction,
  mockSimulateTransaction,
  mockSendTransaction,
  mockGetTransaction,
  mockGetAccount,
  mockTx,
} = vi.hoisted(() => {
  const mockTx = { toXDR: () => "AAAA-transaction-xdr" };
  return {
    mockSignTransaction: vi.fn(),
    mockSimulateTransaction: vi.fn(),
    mockSendTransaction: vi.fn(),
    mockGetTransaction: vi.fn(),
    mockGetAccount: vi.fn().mockResolvedValue({
      accountId: () => "GABC123XYZ",
      sequenceNumber: () => "1",
    }),
    mockTx,
  };
});

vi.mock("../hooks/useFreighter", () => ({
  useFreighter: () => ({
    publicKey: "GBL5T5MLZ57JTBNS643LEJBKAKSOTJCCZVY54FTNZHDSNA56NS6LM3WG",
    networkPassphrase: "Test Net",
    signTransaction: mockSignTransaction,
  }),
}));

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: { sorobanRpcUrl: "https://rpc.example.com", networkPassphrase: "Test Net" },
  }),
}));

vi.mock("@stellar/stellar-sdk/rpc", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    Server: vi.fn().mockImplementation(() => ({
      simulateTransaction: mockSimulateTransaction,
      sendTransaction: mockSendTransaction,
      getTransaction: mockGetTransaction,
      getAccount: mockGetAccount,
    })),
    Api: {
      ...actual.Api,
      isSimulationError: (response: { error?: string }) => typeof response.error === "string",
      GetTransactionStatus: { SUCCESS: "SUCCESS", FAILED: "FAILED" },
    },
    assembleTransaction: (tx: any) => ({ build: () => tx }),
  };
});

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    Contract: vi.fn().mockImplementation(() => ({
      call: vi.fn().mockReturnValue("mock_operation"),
    })),
    nativeToScVal: actual.nativeToScVal,
    TransactionBuilder: class extends actual.TransactionBuilder {
      static fromXDR = vi.fn().mockImplementation((xdrStr: string) => ({
        toXDR: () => xdrStr,
        addOperation: vi.fn().mockReturnThis(),
        setTimeout: vi.fn().mockReturnThis(),
        build: vi.fn().mockReturnValue(mockTx),
      }));
      addOperation = vi.fn().mockReturnThis();
      setTimeout = vi.fn().mockReturnThis();
      build = vi.fn().mockReturnValue(mockTx);
    },
  };
});

describe("useSorobanContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccount.mockResolvedValue({
      accountId: () => "GABC123XYZ",
      sequenceNumber: () => "1",
    });
  });

  it("initializes with idle status", () => {
    const { result } = renderHook(() =>
      useSorobanContract("CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4" as any, { method: "hello" })
    );
    expect(result.current.status).toBe("idle");
    expect(result.current.isLoading).toBe(false);
  });

  it("executes a full call lifecycle successfully", async () => {
    mockSimulateTransaction.mockResolvedValue({ results: [{ retval: {} }] });
    mockSignTransaction.mockResolvedValue("signed-xdr");
    mockSendTransaction.mockResolvedValue({ status: "PENDING", hash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2" });
    mockGetTransaction.mockResolvedValue({
      status: rpc.Api.GetTransactionStatus.SUCCESS,
      resultMetaXdr: null,
    });

    const { result } = renderHook(() =>
      useSorobanContract("CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4" as any, { method: "hello" })
    );

    await act(async () => {
      await result.current.call();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.hash).toBe("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2");
    expect(mockSignTransaction).toHaveBeenCalled();
    expect(mockSendTransaction).toHaveBeenCalled();
  });

  it("performs a query (simulation) without signing", async () => {
    mockSimulateTransaction.mockResolvedValue({
      result: { retval: xdr.ScVal.scvSymbol("query_ok") },
      latestLedger: 100,
    });

    const { result } = renderHook(() =>
      useSorobanContract("CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4" as any, {
        method: "get_val",
        parseResult: () => "parsed_val",
      })
    );

    await act(async () => {
      const queryRes = await result.current.query();
      expect(queryRes).toBe("parsed_val");
    });

    expect(result.current.status).toBe("success");
    expect(mockSignTransaction).not.toHaveBeenCalled();
  });

  it("resets state correctly", async () => {
    const { result } = renderHook(() =>
      useSorobanContract("CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4" as any, { method: "hello" })
    );

    act(() => { result.current.reset(); });

    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
  });
});
