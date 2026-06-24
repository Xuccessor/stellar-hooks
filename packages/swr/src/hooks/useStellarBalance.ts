/**
 * @file useStellarBalance.ts
 * @description SWR hook for fetching Stellar account balances.
 * @package @stellar-hooks/swr
 * @license MIT
 */

import { useMemo } from "react";
import type { StellarBalance } from "stellar-hooks";
import { useStellarAccount, type UseStellarAccountSWROptions } from "./useStellarAccount";

/**
 * Convenience hook — fetches all balances for a public key via SWR and
 * surfaces the XLM (native) balance at the top level.
 *
 * @example
 * ```tsx
 * const { xlmBalance, balances, isLoading } = useStellarBalance("G...");
 * console.log(`XLM: ${xlmBalance?.balance}`);
 * ```
 */
export function useStellarBalance(
  publicKey: string | null | undefined,
  options?: UseStellarAccountSWROptions
) {
  const { data, error, isLoading, isValidating, mutate } =
    useStellarAccount(publicKey, options);

  const balances: StellarBalance[] = useMemo(
    () => data?.balances ?? [],
    [data?.balances]
  );

  const xlmBalance = useMemo(
    () => balances.find((b) => b.isNative) ?? null,
    [balances]
  );

  return { balances, xlmBalance, data, error, isLoading, isValidating, mutate };
}
