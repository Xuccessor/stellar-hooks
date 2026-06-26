import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { StellarProvider, useStellarContext, useOptionalStellarContext } from "../context";
import { NETWORK_CONFIGS } from "../types";
import type { CustomNetworkConfig, StellarNetwork } from "../types";

const TEST_CUSTOM_CONFIG: CustomNetworkConfig = {
  network: "custom",
  horizonUrl: "https://my-horizon.example.com",
  sorobanRpcUrl: "https://my-rpc.example.com",
  networkPassphrase: "My Custom Network ; 2024",
};

function renderWithProvider(providerProps: Record<string, unknown> = {}) {
  return renderHook(() => useStellarContext(), {
    wrapper: ({ children }) => (
      <StellarProvider {...providerProps}>{children}</StellarProvider>
    ),
  });
}

describe("StellarProvider — network variants", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it.each([
    ["testnet", NETWORK_CONFIGS.testnet],
    ["mainnet", NETWORK_CONFIGS.mainnet],
    ["futurenet", NETWORK_CONFIGS.futurenet],
  ] as const)(
    "sets correct horizonUrl, sorobanRpcUrl, and passphrase for %s",
    (network, expected) => {
      const { result } = renderWithProvider({ network });

      expect(result.current.network).toBe(network);
      expect(result.current.config.horizonUrl).toBe(expected.horizonUrl);
      expect(result.current.config.sorobanRpcUrl).toBe(expected.sorobanRpcUrl);
      expect(result.current.config.networkPassphrase).toBe(
        expected.networkPassphrase,
      );
    },
  );

  it("testnet config has the correct URLs", () => {
    const { result } = renderWithProvider({ network: "testnet" });

    expect(result.current.config.horizonUrl).toBe(
      "https://horizon-testnet.stellar.org",
    );
    expect(result.current.config.sorobanRpcUrl).toBe(
      "https://soroban-testnet.stellar.org",
    );
    expect(result.current.config.networkPassphrase).toBe(
      "Test SDF Network ; September 2015",
    );
  });

  it("mainnet config has the correct URLs", () => {
    const { result } = renderWithProvider({ network: "mainnet" });

    expect(result.current.config.horizonUrl).toBe(
      "https://horizon.stellar.org",
    );
    expect(result.current.config.sorobanRpcUrl).toBe(
      "https://mainnet.sorobanrpc.com",
    );
    expect(result.current.config.networkPassphrase).toBe(
      "Public Global Stellar Network ; September 2015",
    );
  });

  it("futurenet config has the correct URLs", () => {
    const { result } = renderWithProvider({ network: "futurenet" });

    expect(result.current.config.horizonUrl).toBe(
      "https://horizon-futurenet.stellar.org",
    );
    expect(result.current.config.sorobanRpcUrl).toBe(
      "https://rpc-futurenet.stellar.org",
    );
    expect(result.current.config.networkPassphrase).toBe(
      "Test SDF Future Network ; October 2022",
    );
  });
});

describe("StellarProvider — custom config", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("overrides all defaults when custom config is provided", () => {
    const { result } = renderWithProvider({
      network: "custom",
      customConfig: TEST_CUSTOM_CONFIG,
    });

    expect(result.current.network).toBe("custom");
    expect(result.current.config).toEqual(TEST_CUSTOM_CONFIG);
    expect(result.current.config.horizonUrl).toBe(TEST_CUSTOM_CONFIG.horizonUrl);
    expect(result.current.config.sorobanRpcUrl).toBe(TEST_CUSTOM_CONFIG.sorobanRpcUrl);
    expect(result.current.config.networkPassphrase).toBe(
      TEST_CUSTOM_CONFIG.networkPassphrase,
    );
  });

  it("switchNetwork to custom replaces all config values", () => {
    const { result } = renderWithProvider({ network: "testnet" });

    expect(result.current.config.networkPassphrase).toBe(
      "Test SDF Network ; September 2015",
    );

    act(() => {
      result.current.switchNetwork("custom", TEST_CUSTOM_CONFIG);
    });

    expect(result.current.network).toBe("custom");
    expect(result.current.config.horizonUrl).toBe(TEST_CUSTOM_CONFIG.horizonUrl);
    expect(result.current.config.sorobanRpcUrl).toBe(
      TEST_CUSTOM_CONFIG.sorobanRpcUrl,
    );
    expect(result.current.config.networkPassphrase).toBe(
      TEST_CUSTOM_CONFIG.networkPassphrase,
    );
  });
});

describe("StellarProvider — child hooks receive correct context", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides a requestCache Map to child hooks", () => {
    const { result } = renderWithProvider({ network: "testnet" });

    expect(result.current.requestCache).toBeInstanceOf(Map);
  });

  it("child hooks see updated config after switchNetwork", () => {
    const { result } = renderWithProvider({ network: "testnet" });

    expect(result.current.config.networkPassphrase).toBe(
      "Test SDF Network ; September 2015",
    );

    act(() => {
      result.current.switchNetwork("mainnet");
    });

    expect(result.current.config.networkPassphrase).toBe(
      "Public Global Stellar Network ; September 2015",
    );
    expect(result.current.config.horizonUrl).toBe(
      "https://horizon.stellar.org",
    );
  });

  it("multiple child hooks share the same context values", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StellarProvider network="testnet">{children}</StellarProvider>
    );

    const { result: result1 } = renderHook(() => useStellarContext(), {
      wrapper,
    });
    const { result: result2 } = renderHook(() => useStellarContext(), {
      wrapper,
    });

    expect(result1.current.config).toEqual(result2.current.config);
    expect(result1.current.network).toBe(result2.current.network);
  });
});

describe("StellarProvider — error when used outside provider", () => {
  it("useStellarContext throws with a clear error message", () => {
    expect(() => renderHook(() => useStellarContext())).toThrow(
      "[stellar-hooks] useStellarContext must be used inside <StellarProvider>.",
    );
  });

  it("useOptionalStellarContext returns null outside the provider", () => {
    const { result } = renderHook(() => useOptionalStellarContext());

    expect(result.current).toBeNull();
  });
});
