/**
 * @file useStellarAccount.ts
 * @description SWR hook for fetching Stellar account data.
 * @package @stellar-hooks/swr
 * @license MIT
 */

import useSWR, { type SWRConfiguration } from "swr";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext, parseAccountResponse } from "stellar-hooks";
import type { StellarAccountData } from "stellar-hooks";

export interface UseStellarAccountSWROptions extends SWRConfiguration<StellarAccountData> {
  /** Set to false to skip fetching. Default: true */
  enabled?: boolean;
}

/**
 * Fetch a Stellar account by its public key, powered by SWR.
 *
 * Returns SWR's full response object, including `data`, `error`, `isLoading`,
 * `isValidating`, and `mutate` for manual revalidation.
 *
 * @example
 * ```tsx
 * const { data, error, isLoading, mutate } = useStellarAccount("G...");
 * ```
 */
export function useStellarAccount(
  publicKey: string | null | undefined,
  options: UseStellarAccountSWROptions = {}
) {
  const { enabled = true, ...swrConfig } = options;
  const { config } = useStellarContext();

  return useSWR<StellarAccountData>(
    enabled && publicKey ? ["stellar-account", publicKey, config.horizonUrl] : null,
    async () => {
      const server = new Horizon.Server(config.horizonUrl);
      const raw = await server.loadAccount(publicKey!);
      return parseAccountResponse(raw);
    },
    swrConfig
  );
}
