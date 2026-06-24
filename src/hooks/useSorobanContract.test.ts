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
  mockSignedTx,
} = vi.hoisted(() => {
  const mockTx = {
    toXDR: () => "AAAA-transaction-xdr",
  };

  const mockSignedTx = {
    toXDR: () => "AAAA-signed-transaction-xdr",
  };

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
    mockSignedTx,
  };
});

vi.mock("../hooks/useFreighter", () => ({
  useFreighter: () => ({
    publicKey: "GABC123XYZ",
    networkPassphrase: "Test Net",
    signTransaction: mockSignTransaction,
  }),
}));

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: { sorobanRpcUrl: "https://rpc.example.com", networkPassphrase: "Test Net" },
  }),
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  const addOperation = vi.fn().mockReturnThis();
  const setTimeout = vi.fn().mockReturnThis();
  const build = vi.fn().mockReturnValue(mockTx);

  const TransactionBuilder = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.addOperation = addOperation;
    this.setTimeout = setTimeout;
    this.build = build;
    return this;
  }) as unknown as typeof actual.TransactionBuilder;

  TransactionBuilder.fromXDR = vi.fn().mockReturnValue(mockSignedTx);

  return {
    ...actual,
    TransactionBuilder,
const mockSimulateTransaction = vi.fn();
const mockSendTransaction = vi.fn();
const mockGetTransaction = vi.fn();
const mockGetAccount = vi.fn().mockResolvedValue({ sequenceNumber: () => "1" });

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
      isSimulationError: () => false,
      GetTransactionStatus: { SUCCESS: "SUCCESS", FAILED: "FAILED" },
    StrKey: {
      ...actual.StrKey,
      isValidContract: vi.fn().mockReturnValue(true),
    },
    rpc: {
      ...actual.rpc,
      Server: vi.fn().mockImplementation(() => ({
        simulateTransaction: mockSimulateTransaction,
        sendTransaction: mockSendTransaction,
        getTransaction: mockGetTransaction,
        getAccount: mockGetAccount,
      })),
      Api: {
        ...actual.rpc.Api,
        isSimulationError: (response: { error?: string }) => typeof response.error === "string",
      },
      assembleTransaction: () => ({ build: () => mockTx }),
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
    const { result } = renderHook(() => useSorobanContract("C123", { method: "hello" }));
    expect(result.current.status).toBe("idle");
    expect(result.current.isLoading).toBe(false);
  });

  it("executes a full call lifecycle successfully", async () => {
    mockSimulateTransaction.mockResolvedValue({ latestLedger: 100 });
    mockSignTransaction.mockImplementation(async (xdr: string) => xdr);
    mockSendTransaction.mockResolvedValue({ status: "PENDING", hash: "tx-123" });
    mockGetTransaction.mockResolvedValue({
      status: rpc.Api.GetTransactionStatus.SUCCESS,
      resultMetaXdr: null,
    });

    const { result } = renderHook(() => useSorobanContract("C123", { method: "hello" }));

    await act(async () => {
      await result.current.call();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.hash).toBe("tx-123");
    expect(mockSignTransaction).toHaveBeenCalled();
    expect(mockSendTransaction).toHaveBeenCalled();
  });

  it("performs a query (simulation) without signing", async () => {
    mockSimulateTransaction.mockResolvedValue({
      result: { retval: xdr.ScVal.scvSymbol("query_ok") },
      latestLedger: 100,
    });

    const { result } = renderHook(() =>
      useSorobanContract("C123", {
        method: "get_val",
        parseResult: () => "parsed_val",
      }),
    );

    await act(async () => {
      const queryRes = await result.current.query();
      expect(queryRes).toBe("parsed_val");
    });

    expect(result.current.status).toBe("success");
    expect(mockSignTransaction).not.toHaveBeenCalled();
  });

  it("resets state correctly", async () => {
    const { result } = renderHook(() => useSorobanContract("C123", { method: "hello" }));

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
  });
});
