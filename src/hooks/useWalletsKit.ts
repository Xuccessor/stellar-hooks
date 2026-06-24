/**
 * @file useWalletsKit.ts
 * @description React hook adapter for @creit-tech/stellar-wallets-kit.
 * Provides multi-wallet support (Freighter, xBull, Albedo, Lobstr, WalletConnect, …)
 * through a single unified hook API consistent with useFreighter.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useReducer } from "react";
import { StellarWalletsKit, KitEventType } from "@creit-tech/stellar-wallets-kit/sdk";
import type { KitEvent } from "@creit-tech/stellar-wallets-kit/sdk";
import { useStellarContext } from "../context";
import type { WalletsKitOptions, WalletsKitState, UseWalletsKitReturn } from "../types";

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "CONNECTING" }
  | { type: "CONNECTED"; publicKey: string }
  | { type: "DISCONNECTED" }
  | { type: "ERROR"; payload: Error };

function reducer(state: WalletsKitState, action: Action): WalletsKitState {
  switch (action.type) {
    case "CONNECTING":
      return { ...state, isConnecting: true, error: null };
    case "CONNECTED":
      return { publicKey: action.publicKey, isConnected: true, isConnecting: false, error: null };
    case "DISCONNECTED":
      return { publicKey: null, isConnected: false, isConnecting: false, error: null };
    case "ERROR":
      return { ...state, isConnecting: false, error: action.payload };
    default:
      return state;
  }
}

const initial: WalletsKitState = {
  publicKey: null,
  isConnected: false,
  isConnecting: false,
  error: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Multi-wallet adapter built on Stellar Wallets Kit.
 * Supports Freighter, xBull, Albedo, Lobstr, Rabet, WalletConnect, and more.
 *
 * Call `StellarWalletsKit.init({ modules })` once at app startup before using
 * this hook, or pass `options` to have the hook initialise the kit for you.
 *
 * @example
 * ```tsx
 * import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";
 *
 * const { connect, isConnected, publicKey, signTransaction } = useWalletsKit({
 *   modules: defaultModules(),
 * });
 *
 * if (!isConnected) return <button onClick={connect}>Connect Wallet</button>;
 * return <p>{publicKey}</p>;
 * ```
 */
export function useWalletsKit(options?: WalletsKitOptions): UseWalletsKitReturn {
  const { config } = useStellarContext();
  const [state, dispatch] = useReducer(reducer, initial);

  // Initialise kit if caller provided options
  useEffect(() => {
    if (options?.modules) {
      StellarWalletsKit.init({
        modules: options.modules as any,
        ...(options.selectedWalletId && { selectedWalletId: options.selectedWalletId }),
        ...(options.network && { network: options.network as any }),
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync with kit state changes (address updated or disconnected)
  useEffect(() => {
    const unsubState = StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event: KitEvent) => {
      if (event.eventType === KitEventType.STATE_UPDATED) {
        const addr = event.payload.address;
        if (addr) {
          dispatch({ type: "CONNECTED", publicKey: addr });
        } else {
          dispatch({ type: "DISCONNECTED" });
        }
      }
    });

    const unsubDisconnect = StellarWalletsKit.on(KitEventType.DISCONNECT, () => {
      dispatch({ type: "DISCONNECTED" });
    });

    // Probe for an already-active address (persisted session)
    StellarWalletsKit.getAddress()
      .then(({ address }: { address: string }) => {
        if (address) dispatch({ type: "CONNECTED", publicKey: address });
      })
      .catch(() => {
        // no active address — stay in initial state
      });

    return () => {
      unsubState();
      unsubDisconnect();
    };
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    dispatch({ type: "CONNECTING" });
    try {
      const { address } = await StellarWalletsKit.authModal();
      dispatch({ type: "CONNECTED", publicKey: address });
      return address;
    } catch (err) {
      dispatch({ type: "ERROR", payload: err instanceof Error ? err : new Error(String(err)) });
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    dispatch({ type: "DISCONNECTED" });
  }, []);

  const signTransaction = useCallback(
    async (xdr: string, opts?: { networkPassphrase?: string; address?: string }): Promise<string> => {
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase: opts?.networkPassphrase ?? config.networkPassphrase,
        ...(opts?.address && { address: opts.address }),
      });
      return signedTxXdr;
    },
    [config.networkPassphrase]
  );

  const signAuthEntry = useCallback(
    async (authEntry: string, opts?: { networkPassphrase?: string; address?: string }): Promise<string> => {
      const { signedAuthEntry } = await StellarWalletsKit.signAuthEntry(authEntry, {
        networkPassphrase: opts?.networkPassphrase ?? config.networkPassphrase,
        ...(opts?.address && { address: opts.address }),
      });
      return signedAuthEntry;
    },
    [config.networkPassphrase]
  );

  const signMessage = useCallback(
    async (message: string, opts?: { networkPassphrase?: string; address?: string }): Promise<string> => {
      const { signedMessage } = await StellarWalletsKit.signMessage(message, {
        networkPassphrase: opts?.networkPassphrase ?? config.networkPassphrase,
        ...(opts?.address && { address: opts.address }),
      });
      return signedMessage;
    },
    [config.networkPassphrase]
  );

  return {
    ...state,
    connect,
    disconnect,
    signTransaction,
    signAuthEntry,
    signMessage,
  };
}
