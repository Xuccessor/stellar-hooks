/**
 * @file useStellarBalance.ts
 * @description Hook for fetching Stellar account balances.
 * @package stellar-hooks
 * @license MIT
 */

import { useMemo } from "react";
import { useStellarAccount, type UseStellarAccountOptions } from "./useStellarAccount";
import type { StellarBalance, StellarAccountData } from "../types";

export interface UseStellarBalanceReturn {
  balances: StellarBalance[];
  xlmBalance: StellarBalance | null;
  data: StellarAccountData | null;
  isLoading: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Convenience wrapper around useStellarAccount that surfaces the native XLM balance.
 *
 * @param {string | null | undefined} publicKey - The public key of the account to fetch.
 * @param {UseStellarAccountOptions} [options] - Configuration options.
 * @returns {UseStellarBalanceReturn}
 *
 * @example
 * ```tsx
 * const { xlmBalance, isLoading } = useStellarBalance(publicKey);
 * return <p>Balance: {xlmBalance?.balance ?? "0"} XLM</p>;
 * ```
 */
export function useStellarBalance(
  publicKey: string | null | undefined,
  options?: UseStellarAccountOptions
): UseStellarBalanceReturn {
  const { account, isLoading, error, lastFetchedAt, refetch } = useStellarAccount(
    publicKey,
    options
  );

  const balances = useMemo(() => account?.balances ?? [], [account?.balances]);
  const xlmBalance = useMemo(
    () => balances.find((b) => b.isNative) ?? null,
    [balances]
  );

  return {
    balances,
    xlmBalance,
    data: account,
    isLoading,
    error,
    lastFetchedAt,
    refetch,
  };
}