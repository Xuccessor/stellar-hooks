import { useCallback, useEffect, useReducer } from "react";
import {
  isConnected,
  getAddress,
  getNetwork,
  requestAccess,
  signTransaction,
  signAuthEntry,
  signMessage,
  WatchWalletChanges,
} from "@stellar/freighter-api";
import type { FreighterState, SignTransactionOptions, UseFreighterReturn } from "../types";

// ─── State Machine ─────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_CONNECTED"; publicKey: string; network: string; networkPassphrase: string }
  | { type: "SET_DISCONNECTED" }
  | { type: "SET_NOT_INSTALLED" }
  | { type: "SET_ERROR"; payload: Error };

function reducer(state: FreighterState, action: Action): FreighterState {
  switch (action.type) {
    case "SET_LOADING":
      if (state.isLoading === action.payload) return state;
      return { ...state, isLoading: action.payload, error: null };
    case "SET_CONNECTED":
      if (
        state.isConnected &&
        state.publicKey === action.publicKey &&
        state.network === action.network &&
        state.networkPassphrase === action.networkPassphrase
      ) {
        return state;
      }
      return {
        ...state,
        isInstalled: true,
        isConnected: true,
        publicKey: action.publicKey,
        network: action.network,
        networkPassphrase: action.networkPassphrase,
        isLoading: false,
        error: null,
      };
    case "SET_DISCONNECTED":
      if (!state.isConnected && state.publicKey === null) return state;
      return {
        ...state,
        isConnected: false,
        publicKey: null,
        network: null,
        networkPassphrase: null,
        isLoading: false,
        error: null,
      };
    case "SET_NOT_INSTALLED":
      if (!state.isInstalled && !state.isLoading) return state;
      return { ...state, isInstalled: false, isLoading: false };
    case "SET_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const initial: FreighterState = {
  isInstalled: false,
  isConnected: false,
  publicKey: null,
  network: null,
  networkPassphrase: null,
  isLoading: true,
  error: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Connect to and interact with the Freighter browser wallet.
 *
 * @example
 * ```tsx
 * const { isConnected, publicKey, connect } = useFreighter();
 *
 * if (!isConnected) return <button onClick={connect}>Connect Wallet</button>;
 * return <p>Connected: {publicKey}</p>;
 * ```
 */
export function useFreighter(): UseFreighterReturn {
  const [state, dispatch] = useReducer(reducer, initial);

  // Probe on mount
  useEffect(() => {
    let cancelled = false;

    async function probe() {
      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const isConnectedResult = await isConnected();
        if (cancelled) return;

        if (!isConnectedResult.isConnected) {
          // Freighter is not installed or not connected yet
          dispatch({ type: "SET_NOT_INSTALLED" });
          return;
        }

        // Check if an address is already authorised
        const addressResult = await getAddress();
        if (cancelled) return;

        if (!addressResult.error && addressResult.address) {
          const networkResult = await getNetwork();
          if (cancelled) return;

          dispatch({
            type: "SET_CONNECTED",
            publicKey: addressResult.address,
            network: networkResult.network ?? "",
            networkPassphrase: networkResult.networkPassphrase ?? "",
          });
        } else {
          dispatch({ type: "SET_DISCONNECTED" });
        }
      } catch (err) {
        if (!cancelled) {
          dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err : new Error(String(err)) });
        }
      }
    }

    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to changes (address, network, passphrase)
  useEffect(() => {
    if (!state.isInstalled) return;

    const watcher = new WatchWalletChanges();

    watcher.watch((changes: { address: string; network: string; networkPassphrase: string }) => {
      if (changes.address) {
        dispatch({
          type: "SET_CONNECTED",
          publicKey: changes.address,
          network: changes.network || "",
          networkPassphrase: changes.networkPassphrase || "",
        });
      } else {
        dispatch({ type: "SET_DISCONNECTED" });
      }
    });

    return () => {
      watcher.stop();
    };
  }, [state.isInstalled]);

  const connect = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      await requestAccess();
      const addressResult = await getAddress();
      if (addressResult.error || !addressResult.address) {
        throw new Error(addressResult.error ?? "Failed to get address");
      }
      const networkResult = await getNetwork();
      dispatch({
        type: "SET_CONNECTED",
        publicKey: addressResult.address,
        network: networkResult.network ?? "",
        networkPassphrase: networkResult.networkPassphrase ?? "",
      });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err : new Error(String(err)) });
    }
  }, []);

  const disconnect = useCallback(() => {
    dispatch({ type: "SET_DISCONNECTED" });
  }, []);

  const signTx = useCallback(
    async (xdr: string, opts?: SignTransactionOptions): Promise<string> => {
      const signOptions: { networkPassphrase?: string; address?: string } = {};
      if (opts?.networkPassphrase) signOptions.networkPassphrase = opts.networkPassphrase;
      if (opts?.address) signOptions.address = opts.address;

      const result = await signTransaction(xdr, signOptions);
      if (result.error) throw new Error(result.error);
      return result.signedTxXdr;
    },
    []
  );

  const signEntry = useCallback(async (entryPreimageXdr: string): Promise<string> => {
    const result = await signAuthEntry(entryPreimageXdr);
    if (result.error) throw new Error(result.error);
    if (!result.signedAuthEntry) throw new Error("Failed to sign auth entry");
    return result.signedAuthEntry;
  }, []);

  const signBlobCallback = useCallback(
    async (blob: string, opts?: { accountToSign?: string }): Promise<string> => {
      const signOptions: { address?: string } = {};
      if (opts?.accountToSign) signOptions.address = opts.accountToSign;

      const result = await signMessage(blob, signOptions);
      if (result.error) throw new Error(result.error);

      const signedMessage = result.signedMessage;
       if (!signedMessage) throw new Error("Failed to sign blob");
       if (typeof signedMessage === "string") return signedMessage;
       if (Buffer.isBuffer(signedMessage)) return signedMessage.toString("base64");
       throw new Error("Failed to sign blob");
    },
    []
  );

  return {
    ...state,
    connect,
    disconnect,
    signTransaction: signTx,
    signAuthEntry: signEntry,
    signBlob: signBlobCallback,
  };
}
