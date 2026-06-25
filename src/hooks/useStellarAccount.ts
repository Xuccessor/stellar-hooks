/**
 * @file useStellarAccount.ts
 * @description Hook for fetching Stellar account data from Horizon.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useMemo } from "react";
import { getHorizonServer } from "../utils/memoizedServers";
import { useStellarContext } from "../context";
import type { StellarAccountData, StellarPublicKey } from "../types";
import { parseAccountResponse, validatePublicKey } from "../utils";
import { useStellarQuery } from "./useStellarQuery";

// ─── Types ───────────────────────────────────────────────────────────────────

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
 * Fetch and optionally poll a Stellar account from Horizon.
 *
 * @param {StellarPublicKey | null | undefined} publicKey - The public key of the account to fetch.
 * @param {UseStellarAccountOptions} [options={}] - Configuration options.
 * @returns {UseStellarAccountReturn}
 */
export function useStellarAccount(
  publicKey: StellarPublicKey | null | undefined,
  options: UseStellarAccountOptions = {}
): UseStellarAccountReturn {
  const { enabled = true, refetchInterval = 0, deduplicate = true } = options;
  const ctx = useStellarContext();
  const { config } = ctx;
  // Support older tests/mocks that don't include `requestCache` by falling
  // back to a module-scoped cache. Provider instances will supply their own
  // requestCache via context for proper scoping.
  const moduleFallbackCache = useRef<Map<string, Promise<unknown>> | null>(null);
  if (moduleFallbackCache.current === null) moduleFallbackCache.current = new Map();
  const requestCache = (ctx as any).requestCache ?? moduleFallbackCache.current;
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
        const rawAccount = await server.loadAccount(publicKey, { signal } as any);
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
      if (err instanceof Error && (err.name === "AbortError" || (err as any).code === "ABORT_ERR")) {
        return;
      }
      dispatch({ type: "FETCH_ERROR", payload: err instanceof Error ? err : new Error(String(err)) });
    } finally {
      isFetchingRef.current = false;
    }
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
  const { config } = useStellarContext();

  const fetchAccount = useCallback(async () => {
    if (!publicKey) return null;

    validatePublicKey(publicKey);
    const server = getHorizonServer(config.horizonUrl);
    const rawAccount = await server.loadAccount(publicKey);
    return parseAccountResponse(rawAccount);
  }, [publicKey, config.horizonUrl]);

  const state = useStellarQuery<StellarAccountData | null>(fetchAccount, {
    enabled: enabled && Boolean(publicKey),
    refetchInterval,
    deduplicate,
    initialData: null,
  });

  return useMemo(
    () => ({
      account: state.data,
      data: state.data,
      isLoading: state.isLoading,
      isRefetching: state.isRefetching,
      error: state.error,
      lastFetchedAt: state.lastFetchedAt,
      refetch: state.refetch,
    }),
    [state.data, state.isLoading, state.isRefetching, state.error, state.lastFetchedAt, state.refetch]
  );
}