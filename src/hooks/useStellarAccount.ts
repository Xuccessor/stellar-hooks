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