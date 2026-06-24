/**
 * @file useTransactionCore.ts
 * @description Internal hook for submitting and polling pre-signed Stellar/Soroban transactions.
 *              Used by specific operation hooks (usePayment, useBumpSequence, etc.).
 *              Not exported from the public API — use useTransaction for the full lifecycle.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useReducer } from "react";
import { TransactionBuilder, Horizon } from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { useStellarContext } from "../context";
import type { TransactionState, TransactionStatus, StellarXdrString, StellarTxHash } from "../types";
import { asTxHash } from "../types";
import { sleep, backoff } from "../utils";

// ─── Options ──────────────────────────────────────────────────────────────────

export interface UseTransactionCoreOptions {
  /** "soroban" uses rpc; "classic" uses Horizon. Default: "soroban" */
  mode?: "soroban" | "classic";
  /** Polling timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Callback fired when the transaction is successfully confirmed. */
  onSuccess?: (hash: string) => void;
  /** Callback fired when the transaction fails or an error occurs. */
  onError?: (error: Error) => void;
}

export interface UseTransactionCoreReturn extends TransactionState {
  submit: (signedXdr: StellarXdrString) => Promise<void>;
  reset: () => void;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "RESET" }
  | { type: "STATUS"; payload: TransactionStatus }
  | { type: "SUCCESS"; hash: StellarTxHash }
  | { type: "ERROR"; payload: Error };

function reducer(state: TransactionState, action: Action): TransactionState {
  switch (action.type) {
    case "RESET":
      return { status: "idle", hash: null, result: null, error: null, isLoading: false, isSuccess: false, isError: false };
    case "STATUS":
      return { ...state, status: action.payload, isLoading: true, isSuccess: false, isError: false };
    case "SUCCESS":
      return { status: "success", hash: action.hash, result: null, error: null, isLoading: false, isSuccess: true, isError: false };
    case "ERROR":
      return { ...state, status: "error", error: action.payload, isLoading: false, isSuccess: false, isError: true };
    default:
      return state;
  }
}

const initial: TransactionState = {
  status: "idle",
  hash: null,
  result: null,
  error: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTransactionCore(
  options: UseTransactionCoreOptions = {},
): UseTransactionCoreReturn {
  const { mode = "soroban", timeoutSeconds = 60, onSuccess, onError } = options;
  const { config } = useStellarContext();
  const [state, dispatch] = useReducer(reducer, initial);

  const submit = useCallback(
    async (signedXdr: StellarXdrString) => {
      dispatch({ type: "STATUS", payload: "submitting" });

      try {
        if (mode === "soroban") {
          const server = new rpc.Server(config.sorobanRpcUrl);
          const tx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);

          const sendResult = await server.sendTransaction(tx);

          if (sendResult.status === "ERROR") {
            throw new Error(`Submission error: ${JSON.stringify(sendResult.errorResult)}`);
          }

          const txHash = sendResult.hash;
          dispatch({ type: "STATUS", payload: "polling" });

          const deadline = Date.now() + timeoutSeconds * 1000;
          let attempt = 0;

          while (Date.now() < deadline) {
            await sleep(backoff(attempt));
            attempt++;

            const getResult = await server.getTransaction(txHash);

            if (getResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
              dispatch({ type: "SUCCESS", hash: asTxHash(txHash) });
              onSuccess?.(txHash);
              return;
            }

            if (getResult.status === rpc.Api.GetTransactionStatus.FAILED) {
              throw new Error(`Transaction failed on-chain: ${txHash}`);
            }
          }

          throw new Error(`Transaction polling timed out: ${txHash}`);
        } else {
          const server = new Horizon.Server(config.horizonUrl);
          const tx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);

          const result = await server.submitTransaction(tx as Parameters<typeof server.submitTransaction>[0]);
          dispatch({ type: "SUCCESS", hash: asTxHash(result.hash) });
          onSuccess?.(result.hash);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        dispatch({ type: "ERROR", payload: error });
        onError?.(error);
      }
    },
    [mode, config, timeoutSeconds, onSuccess, onError]
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return { ...state, submit, reset };
}
