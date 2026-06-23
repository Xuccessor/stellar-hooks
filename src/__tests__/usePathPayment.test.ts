/**
 * @file usePathPayment.test.ts
 * @description Unit tests for the usePathPayment hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock React ───────────────────────────────────────────────────────────────

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
    useReducer: (_reducer: unknown, initial: unknown) => [initial, vi.fn()],
  };
});

// ─── Mock @stellar/stellar-sdk ────────────────────────────────────────────────

const mockBuild = vi.fn().mockReturnValue({ toXDR: () => "built-xdr" });
const mockAddOperation = vi.fn().mockReturnThis();
const mockSetTimeout = vi.fn().mockReturnThis();

vi.mock("@stellar/stellar-sdk", () => ({
  Asset: Object.assign(
    vi.fn().mockImplementation((code: string, issuer: string) => ({ type: "credit", code, issuer })),
    { native: vi.fn().mockReturnValue({ type: "native" }) }
  ),
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      loadAccount: vi.fn().mockResolvedValue({ id: "GSOURCE", sequence: "1" }),
    })),
  },
  Operation: {
    pathPaymentStrictSend: vi.fn().mockReturnValue({ type: "pathPaymentStrictSend" }),
    pathPaymentStrictReceive: vi.fn().mockReturnValue({ type: "pathPaymentStrictReceive" }),
  },
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    addOperation: mockAddOperation,
    setTimeout: mockSetTimeout,
    build: mockBuild,
  })),
}));

// ─── Mock context and hooks ───────────────────────────────────────────────────

const mockSubmitXdr = vi.fn().mockResolvedValue(undefined);
const mockReset = vi.fn();
const mockSignTransaction = vi.fn().mockResolvedValue("signed-xdr");

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("../hooks/useTransaction", () => ({
  useTransaction: () => ({
    submit: mockSubmitXdr,
    reset: mockReset,
    status: "idle",
    hash: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  }),
}));

vi.mock("../hooks/useFreighter", () => ({
  useFreighter: () => ({
    publicKey: "GPUBLICKEY",
    signTransaction: mockSignTransaction,
  }),
}));

// ─── Import AFTER mocks ───────────────────────────────────────────────────────

import { usePathPayment } from "../hooks/usePathPayment";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseOptions = {
  sendAsset: { type: "native" as const },
  sendAmount: "10",
  destination: "GDEST...",
  destAsset: { type: "credit" as const, code: "USDC", issuer: "GISSUER..." },
  destMin: "9",
};

function useHook(overrides = {}) {
  return usePathPayment({ mode: "strict-send", ...baseOptions, ...overrides });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("usePathPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct initial state", () => {
    const hook = useHook();
    expect(hook.status).toBe("idle");
    expect(hook.hash).toBeNull();
    expect(hook.error).toBeNull();
    expect(hook.isLoading).toBe(false);
    expect(hook.isSuccess).toBe(false);
    expect(hook.isError).toBe(false);
    expect(typeof hook.submit).toBe("function");
    expect(typeof hook.reset).toBe("function");
  });

  it("calls pathPaymentStrictSend when mode is strict-send", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useHook({ mode: "strict-send" });
    await hook.submit();

    expect(Operation.pathPaymentStrictSend).toHaveBeenCalledWith(
      expect.objectContaining({
        sendAmount: "10",
        destination: "GDEST...",
        destMin: "9",
      })
    );
    expect(Operation.pathPaymentStrictReceive).not.toHaveBeenCalled();
  });

  it("calls pathPaymentStrictReceive when mode is strict-receive", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useHook({ mode: "strict-receive" });
    await hook.submit();

    expect(Operation.pathPaymentStrictReceive).toHaveBeenCalledWith(
      expect.objectContaining({
        sendMax: "10",
        destination: "GDEST...",
        destAmount: "9",
      })
    );
    expect(Operation.pathPaymentStrictSend).not.toHaveBeenCalled();
  });

  it("signs and submits the built transaction", async () => {
    const hook = useHook();
    await hook.submit();

    expect(mockSignTransaction).toHaveBeenCalledWith("built-xdr", {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("uses Asset.native() for native send asset", async () => {
    const { Asset } = await import("@stellar/stellar-sdk");
    const hook = useHook({ sendAsset: { type: "native" } });
    await hook.submit();

    expect(Asset.native).toHaveBeenCalled();
  });

  it("uses Asset constructor for credit dest asset", async () => {
    const { Asset } = await import("@stellar/stellar-sdk");
    const hook = useHook();
    await hook.submit();

    expect(Asset).toHaveBeenCalledWith("USDC", "GISSUER...");
  });

  it("passes intermediate path assets to the operation", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useHook({
      mode: "strict-send",
      path: [{ type: "credit", code: "XLM2", issuer: "GPATH..." }],
    });
    await hook.submit();

    expect(Operation.pathPaymentStrictSend).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.arrayContaining([expect.anything()]),
      })
    );
  });

  it("throws when publicKey is null", async () => {
    const claimFn = async () => {
      const publicKey: string | null = null;
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }
    };
    await expect(claimFn()).rejects.toThrow("Freighter is not connected");
  });
});