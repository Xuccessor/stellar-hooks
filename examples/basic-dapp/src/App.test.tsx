/**
 * @file App.test.tsx
 * @description Integration tests for the basic-dapp example against mocked Testnet.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";

// ─── Shared mock state ──────────────────────────────────────────────────────────

const { mockFreighterState, resetState } = vi.hoisted(() => {
  const defaultState = {
    isInstalled: false,
    isConnected: false,
    publicKey: null as string | null,
    isLoading: false,
    error: null as Error | null,
    networkPassphraseMismatch: false,
    networkPassphraseWarning: null as string | null,
  };

  const mockFreighterState = { ...defaultState };

  return {
    mockFreighterState,
    resetState: () => Object.assign(mockFreighterState, { ...defaultState }),
  };
});

// ─── Mock stellar-hooks ─────────────────────────────────────────────────────────

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockUseStellarBalance = vi.fn();

vi.mock("stellar-hooks", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require("react");

  function StellarProvider({ children }: { children: any }) {
    return children;
  }

  function useFreighter() {
    const [, forceRender] = React.useState(0);

    React.useEffect(() => {
      mockConnect.mockImplementation(async () => {
        mockFreighterState.isConnected = true;
        mockFreighterState.isInstalled = true;
        mockFreighterState.publicKey =
          "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ";
        forceRender((n: number) => n + 1);
      });
    }, []);

    return {
      ...mockFreighterState,
      connect: mockConnect,
      disconnect: mockDisconnect,
      signTransaction: vi.fn(),
      signAuthEntry: vi.fn(),
      signBlob: vi.fn(),
    };
  }

  return {
    StellarProvider,
    useFreighter,
    useStellarBalance: (...args: any[]) => mockUseStellarBalance(...args),
    useSorobanContract: () => ({
      call: vi.fn(),
      query: vi.fn(),
      simulate: vi.fn(),
      reset: vi.fn(),
      status: "idle",
      hash: null,
      result: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    }),
    useTransaction: () => ({
      submit: vi.fn(),
      status: "idle",
      hash: null,
      error: null,
    }),
    nativeToScVal: vi.fn(),
  };
});

import App from "./App";

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("basic-dapp App", () => {
  beforeEach(() => {
    resetState();
    mockConnect.mockReset();
    mockDisconnect.mockReset();
    mockUseStellarBalance.mockReturnValue({
      xlmBalance: { balance: "100.0000000", isNative: true },
      balances: [
        {
          assetType: "native",
          balance: "100.0000000",
          balanceFloat: 100,
          buyingLiabilities: "0",
          sellingLiabilities: "0",
          isNative: true,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders the heading", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /stellar-hooks demo/i })).toBeTruthy();
  });

  it("shows a warning when Freighter is not installed", () => {
    render(<App />);

    expect(screen.getByText(/not detected/i)).toBeTruthy();
  });

  it("renders a connect button when Freighter is installed but not connected", () => {
    mockFreighterState.isInstalled = true;
    mockFreighterState.isConnected = false;

    render(<App />);

    expect(
      screen.getByRole("button", { name: /connect freighter/i }),
    ).toBeTruthy();
  });

  it("displays the public key and balance after mock connect", async () => {
    const testKey =
      "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ";

    mockFreighterState.isInstalled = true;
    mockFreighterState.isConnected = false;

    const { rerender } = render(<App />);

    const connectBtn = screen.getByRole("button", {
      name: /connect freighter/i,
    });

    await act(async () => {
      fireEvent.click(connectBtn);
    });

    rerender(<App />);

    await waitFor(() => {
      expect(screen.getByText(new RegExp(testKey))).toBeTruthy();
    });

    expect(screen.getByText(/100\.0000000/)).toBeTruthy();
  });
});
