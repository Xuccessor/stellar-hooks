/**
 * @file useLedgerEntry.ts
 * @description SWR hook for fetching ledger entries from Soroban RPC.
 * @package @stellar-hooks/swr
 * @license MIT
 */

import useSWR, { type SWRConfiguration } from "swr";
import { rpc as SorobanRpc, xdr } from "@stellar/stellar-sdk";
import { useStellarContext } from "stellar-hooks";

export interface UseLedgerEntrySWROptions
  extends SWRConfiguration<SorobanRpc.Api.LedgerEntryResult | null> {
  /** Set to false to skip fetching. Default: true */
  enabled?: boolean;
}

/**
 * Read a raw Soroban ledger entry by its XDR key, powered by SWR.
 *
 * Returns `null` when the entry is not found (instead of erroring).
 *
 * @example
 * ```tsx
 * const { data: entry, isLoading } = useLedgerEntry(ledgerKey);
 * ```
 */
export function useLedgerEntry(
  ledgerKey: xdr.LedgerKey | null | undefined,
  options: UseLedgerEntrySWROptions = {}
) {
  const { enabled = true, ...swrConfig } = options;
  const { config } = useStellarContext();

  return useSWR<SorobanRpc.Api.LedgerEntryResult | null>(
    enabled && ledgerKey
      ? ["ledger-entry", ledgerKey.toXDR("base64"), config.sorobanRpcUrl]
      : null,
    async () => {
      const server = new SorobanRpc.Server(config.sorobanRpcUrl);
      const result = await server.getLedgerEntries(ledgerKey!);

      if (result.entries.length === 0) {
        return null;
      }

      return result.entries[0] ?? null;
    },
    swrConfig
  );
}
