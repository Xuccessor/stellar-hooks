/**
 * @file useClaimableBalances.ts
 * @description SWR hook for fetching claimable balances.
 * @package @stellar-hooks/swr
 * @license MIT
 */

import useSWR, { type SWRConfiguration } from "swr";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "stellar-hooks";

export interface ClaimableBalanceRecord {
  id: string;
  asset: string;
  amount: string;
  sponsor: string;
  lastModifiedLedger: number;
  claimants: Array<{
    destination: string;
    predicate: Record<string, unknown>;
  }>;
}

export interface UseClaimableBalancesSWROptions
  extends SWRConfiguration<ClaimableBalanceRecord[]> {
  /** Set to false to skip fetching. Default: true */
  enabled?: boolean;
}

/**
 * Fetches all claimable balances for a given public key from Horizon,
 * powered by SWR.
 *
 * @example
 * ```tsx
 * const { data: balances, isLoading, mutate } = useClaimableBalances("G...");
 * ```
 */
export function useClaimableBalances(
  publicKey: string | null | undefined,
  options: UseClaimableBalancesSWROptions = {}
) {
  const { enabled = true, ...swrConfig } = options;
  const { config } = useStellarContext();

  return useSWR<ClaimableBalanceRecord[]>(
    enabled && publicKey
      ? ["claimable-balances", publicKey, config.horizonUrl]
      : null,
    async () => {
      const server = new Horizon.Server(config.horizonUrl);
      const response = await server
        .claimableBalances()
        .claimant(publicKey!)
        .call();

      return response.records.map(
        (r: Horizon.ServerApi.ClaimableBalanceRecord) => ({
          id: r.id,
          asset: r.asset,
          amount: r.amount,
          sponsor: r.sponsor ?? "",
          lastModifiedLedger: r.last_modified_ledger,
          claimants: r.claimants.map((c) => ({
            destination: c.destination,
            predicate: c.predicate as Record<string, unknown>,
          })),
        })
      );
    },
    swrConfig
  );
}
