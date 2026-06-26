/**
 * @file useStellarAccount.ts
 * @description Hook for fetching a single Stellar account from Horizon.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { getHorizonServer } from "../utils/memoizedServers";
import { useStellarContext } from "../context";
import type { StellarAccountData, StellarPublicKey } from "../types";
import { parseAccountResponse, validatePublicKey } from "../utils";

// ─── State ──────────────────────────────────────────────────────────────────

interface AccountState {
  data: StellarAccountData | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
}

type AccountAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: StellarAccountData | null }
  | { type: "FETCH_ERROR"; payload: Error };

function reducer(state: AccountState, action: AccountAction): AccountState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: state.data === null, isRefetching: state.data !== null, error: null };
    case "FETCH_SUCCESS":
      return { data: action.payload, isLoading: false, isRefetching: false, error: null, lastFetchedAt: new Date() };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, isRefetching: false, error: action.payload };
    default:
      return state;
  }
}

const initialState: AccountState = {
  data: null,
  isLoading: false,
  isRefetching: false,
  error: null,
  lastFetchedAt: null,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseStellarAccountOptions {
  /** Whether the query is enabled. Defaults to true. */
  enabled?: boolean;
  /** Polling interval in milliseconds. If 0, polling is disabled. Defaults to 0. */
  refetchInterval?: number;
  /**
   * When true (default), concurrent duplicate requests are suppressed — if a fetch
   * is already in-flight when the next poll fires, that poll tick is skipped.
   * Set to false to allow overlapping requests.
   */
  deduplicate?: boolean;
}

export interface UseStellarAccountReturn {
  /** The parsed account data. Matches 'account' in issue #63. */
  account: StellarAccountData | null;
  /** Alias for account, maintained for backward compatibility. */
  data: StellarAccountData | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  /** Timestamp of the last successful fetch. */
  lastFetchedAt: Date | null;
  /** Manually trigger a refetch of the account data. */
  refetch: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetch and optionally poll a single Stellar account from Horizon.
 *
 * For multi-account lookups (e.g. fetching several signers or a multisig roster
 * in parallel), see {@link useStellarAccounts}.
 *
 * @param publicKey  Stellar public key (G…) to look up. Pass `null`/`undefined` to suspend the fetch.
 * @param options    Configuration (enabled, refetchInterval, deduplicate).
 *
 * @example
 * ```tsx
 * const { account, isLoading, error, refetch, lastFetchedAt } = useStellarAccount(
 *   "GAAZI4...",
 *   { refetchInterval: 10_000 },
 * );
 * ```
 */
export function useStellarAccount(
  publicKey: StellarPublicKey | null | undefined,
  options: UseStellarAccountOptions = {},
): UseStellarAccountReturn {
  const { enabled = true, refetchInterval = 0, deduplicate = true } = options;
  const ctx = useStellarContext();
  const { config } = ctx;
  // Support older tests/mocks that don't include `requestCache` by falling
  // back to a module-scoped cache. Provider instances will supply their own
  // requestCache via context for proper scoping.
  const moduleFallbackCache = useRef<Map<string, Promise<unknown>> | null>(null);
  if (moduleFallbackCache.current === null) moduleFallbackCache.current = new Map();
  const requestCache = (ctx as unknown as { requestCache?: Map<string, Promise<unknown>> }).requestCache ?? moduleFallbackCache.current;
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false);
  const activeControllerRef = useRef<AbortController | null>(null);

  const fetchAccount = useCallback(async () => {
    if (!publicKey) {
      dispatch({ type: "FETCH_SUCCESS", payload: null });
      return;
    }
    if (deduplicate && isFetchingRef.current) return;

    isFetchingRef.current = true;
    dispatch({ type: "FETCH_START" });

    try {
      validatePublicKey(publicKey);
      const server = getHorizonServer(config.horizonUrl);
      // AbortController per fetch cycle so we can cancel on cleanup
      const controller = new AbortController();
      // abort previous pending controller for this component
      activeControllerRef.current?.abort();
      activeControllerRef.current = controller;
      const signal = controller.signal;

      const cacheKey = `${publicKey}:${config.horizonUrl}`;

      if (deduplicate) {
        const inFlight = requestCache.get(cacheKey) as Promise<unknown> | undefined;
        if (inFlight) {
          try {
            const parsed = (await inFlight) as StellarAccountData;
            dispatch({ type: "FETCH_SUCCESS", payload: parsed });
            return;
          } catch (err) {
            // fallthrough to outer catch
          }
        }
      }

      const fetchPromise = (async () => {
        const rawAccount = await server.loadAccount(publicKey);
        return parseAccountResponse(rawAccount);
      })();

      if (deduplicate) requestCache.set(cacheKey, fetchPromise);

      try {
        const parsed = await fetchPromise;
        dispatch({ type: "FETCH_SUCCESS", payload: parsed as StellarAccountData });
      } finally {
        if (deduplicate) requestCache.delete(cacheKey);
      }
    } catch (err) {
      // Treat aborts as a silent cancellation — don't set error state.
      if (err instanceof Error && (err.name === "AbortError" || (err as unknown as { code?: string }).code === "ABORT_ERR")) {
        return;
      }
      dispatch({ type: "FETCH_ERROR", payload: err instanceof Error ? err : new Error(String(err)) });
    } finally {
      isFetchingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, config.horizonUrl, deduplicate]);

  useEffect(() => {
    if (enabled && publicKey) {
      void fetchAccount();
      if (refetchInterval > 0) {
        timerRef.current = setInterval(() => void fetchAccount(), refetchInterval);
      }
    } else if (!publicKey || !enabled) {
      dispatch({ type: "FETCH_SUCCESS", payload: null });
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      activeControllerRef.current?.abort();
    };
  }, [enabled, publicKey, refetchInterval, fetchAccount]);

  return { account: state.data, ...state, refetch: fetchAccount };
}
