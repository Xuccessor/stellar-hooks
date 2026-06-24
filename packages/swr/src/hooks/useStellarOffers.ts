/**
 * @file useStellarOffers.ts
 * @description SWR hook for fetching open offers for a Stellar account.
 * @package @stellar-hooks/swr
 * @license MIT
 */

import useSWR, { type SWRConfiguration } from "swr";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "stellar-hooks";

export interface UseStellarOffersSWROptions
  extends SWRConfiguration<Horizon.ServerApi.OfferRecord[]> {
  /** Set to false to skip fetching. Default: true */
  enabled?: boolean;
}

/**
 * Fetches open buy/sell offers from Horizon for a given account, powered by SWR.
 *
 * @example
 * ```tsx
 * const { data: offers, isLoading } = useStellarOffers("G...");
 * ```
 */
export function useStellarOffers(
  publicKey: string | null | undefined,
  options: UseStellarOffersSWROptions = {}
) {
  const { enabled = true, ...swrConfig } = options;
  const { config } = useStellarContext();

  return useSWR<Horizon.ServerApi.OfferRecord[]>(
    enabled && publicKey
      ? ["stellar-offers", publicKey, config.horizonUrl]
      : null,
    async () => {
      const server = new Horizon.Server(config.horizonUrl);
      const response = await server.offers().forAccount(publicKey!).call();
      return response.records;
    },
    swrConfig
  );
}
