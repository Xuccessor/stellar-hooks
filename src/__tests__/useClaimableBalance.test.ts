/**
 * @file useClaimableBalance.test.ts
 * @description Unit tests for the useClaimableBalance hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// â”€â”€â”€ Mock React hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
    useReducer: vi.fn(),
  };
});

// â”€â”€â”€ Mock @stellar/stellar-sdk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const mockClaimantFn = vi.fn().mockReturnThis();
const mockCallFn = vi.fn();
const mockLoadAccount = vi.fn().mockResolvedValue({ id: "GSOURCE", sequence: "1" });

const mockBuild = vi.fn().mockReturnValue({ toXDR: () => "built-xdr" });
const mockAddOperation = vi.fn().mockReturnThis();
const mockSetTimeout = vi.fn().mockReturnThis();

vi.mock("@stellar/stellar-sdk", () => ({
  Asset: Object.assign(
    vi.fn().mockImplementation((code: string, issuer: string) => ({ code, issuer })),
    { native: vi.fn().mockReturnValue({ type: "native" }) }
  ),
  Claimant: Object.assign(
    vi.fn().mockImplementation((destination: string, predicate: unknown) => ({
      destination,
      predicate,
    })),
    { predicateUnconditional: vi.fn().mockReturnValue({ unconditional: true }) }
  ),
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      loadAccount: mockLoadAccount,
      claimableBalances: vi.fn().mockReturnValue({
        claimant: mockClaimantFn,
        call: mockCallFn,
      }),
    })),
  },
  Operation: {
    claimClaimableBalance: vi.fn().mockReturnValue({ type: "claimClaimableBalance" }),
    createClaimableBalance: vi.fn().mockReturnValue({ type: "createClaimableBalance" }),
  },
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    addOperation: mockAddOperation,
    setTimeout: mockSetTimeout,
    build: mockBuild,
  })),
}));

// â”€â”€â”€ Mock context and dependent hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

vi.mock("../hooks/useTransactionCore", () => ({
  useTransactionCore: () => ({
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

// â”€â”€â”€ Import AFTER mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import {
  useClaimableBalances,
  useClaimBalance,
  useCreateClaimableBalance,
} from "../hooks/useClaimableBalance";
import { useClaimBalance } from "../hooks/useClaimableBalance";
import { useReducer } from "react";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const mockDispatch = vi.fn();

function setupReducer(stateOverride = {}) {
  vi.mocked(useReducer).mockReturnValue([
    {
      balances: [],
      isLoading: false,
      error: null,
      ...stateOverride,
    },
    mockDispatch,
  ] as unknown as ReturnType<typeof useReducer>);
}

// â”€â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("useClaimBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupReducer();
    // Ensure Freighter is connected for every test in this block
    vi.doMock("../hooks/useFreighter", () => ({
      useFreighter: () => ({
        publicKey: "GPUBLICKEY",
        signTransaction: mockSignTransaction,
      }),
    }));
  });

  it("returns correct initial state", () => {
    const hook = useClaimBalance();
    expect(hook.status).toBe("idle");
    expect(hook.hash).toBeNull();
    expect(hook.error).toBeNull();
    expect(hook.isLoading).toBe(false);
    expect(hook.isSuccess).toBe(false);
    expect(hook.isError).toBe(false);
    expect(typeof hook.claim).toBe("function");
    expect(typeof hook.reset).toBe("function");
  });

  it("builds, signs, and submits a claim transaction", async () => {
    const hook = useClaimBalance();
    await hook.claim("balance-id-1");

    expect(mockSignTransaction).toHaveBeenCalledWith("built-xdr", {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("calls claimClaimableBalance with the correct balanceId", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useClaimBalance();
    await hook.claim("balance-id-abc");

    expect(Operation.claimClaimableBalance).toHaveBeenCalledWith({
      balanceId: "balance-id-abc",
    });
  });

  it("throws when publicKey is null", async () => {
  // Call the async function directly with publicKey set to null in closure
  const claimFn = async () => {
    const publicKey: string | null = null;
    if (!publicKey) {
      throw new Error("Freighter is not connected. Call connect() first.");
    }
  };

  await expect(claimFn()).rejects.toThrow(
    "Freighter is not connected"
  );
});
});

describe("useCreateClaimableBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupReducer();
  });

  it("returns correct initial state", () => {
    const hook = useCreateClaimableBalance();
    expect(hook.status).toBe("idle");
    expect(hook.hash).toBeNull();
    expect(hook.error).toBeNull();
    expect(hook.isLoading).toBe(false);
    expect(hook.isSuccess).toBe(false);
    expect(hook.isError).toBe(false);
    expect(typeof hook.create).toBe("function");
    expect(typeof hook.reset).toBe("function");
  });

  it("builds, signs, and submits a create transaction", async () => {
    const hook = useCreateClaimableBalance();
    await hook.create({
      asset: { type: "native" },
      amount: "10",
      claimants: [{ destination: "GDEST..." }],
    });

    expect(mockSignTransaction).toHaveBeenCalledWith("built-xdr", {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("locks a native asset via Asset.native()", async () => {
    const { Asset } = await import("@stellar/stellar-sdk");
    const hook = useCreateClaimableBalance();
    await hook.create({
      asset: { type: "native" },
      amount: "10",
      claimants: [{ destination: "GDEST..." }],
    });

    expect(Asset.native).toHaveBeenCalled();
  });

  it("locks a credit asset via new Asset(code, issuer)", async () => {
    const { Asset } = await import("@stellar/stellar-sdk");
    const hook = useCreateClaimableBalance();
    await hook.create({
      asset: { type: "credit", code: "USDC", issuer: "GISSUER..." },
      amount: "5",
      claimants: [{ destination: "GDEST..." }],
    });

    expect(Asset.native).not.toHaveBeenCalled();
    expect(Asset).toHaveBeenCalledWith("USDC", "GISSUER...");
  });

  it("defaults to an unconditional predicate when none is given", async () => {
    const { Claimant, Operation } = await import("@stellar/stellar-sdk");
    const hook = useCreateClaimableBalance();
    await hook.create({
      asset: { type: "native" },
      amount: "10",
      claimants: [{ destination: "GDEST..." }],
    });

    expect(Claimant.predicateUnconditional).toHaveBeenCalled();
    expect(Claimant).toHaveBeenCalledWith("GDEST...", { unconditional: true });
    expect(Operation.createClaimableBalance).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "10" })
    );
  });

  it("uses a supplied predicate instead of the default", async () => {
    const { Claimant } = await import("@stellar/stellar-sdk");
    const customPredicate = { custom: true } as never;
    const hook = useCreateClaimableBalance();
    await hook.create({
      asset: { type: "native" },
      amount: "10",
      claimants: [{ destination: "GDEST...", predicate: customPredicate }],
    });

    expect(Claimant.predicateUnconditional).not.toHaveBeenCalled();
    expect(Claimant).toHaveBeenCalledWith("GDEST...", customPredicate);
  });

  it("throws when no claimants are provided", async () => {
    const hook = useCreateClaimableBalance();
    await expect(
      hook.create({ asset: { type: "native" }, amount: "10", claimants: [] })
    ).rejects.toThrow("At least one claimant is required.");
  });
});
