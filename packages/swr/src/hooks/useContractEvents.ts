/**
 * @file useContractEvents.ts
 * @description SWR hook for fetching Soroban contract events.
 * @package @stellar-hooks/swr
 * @license MIT
 */

import useSWR, { type SWRConfiguration } from "swr";
import { rpc as SorobanRpc } from "@stellar/stellar-sdk";
import { useStellarContext } from "stellar-hooks";

export type ContractEvent = SorobanRpc.Api.EventResponse;

export interface UseContractEventsSWROptions
  extends SWRConfiguration<ContractEvent[]> {
  /** Soroban contract address (C...) */
  contractId: string;
  /** Optional topic filters. Each entry is an array of topic segments. */
  topics?: string[][];
  /** Ledger cursor to start from. */
  startLedger?: number;
  /** Whether fetching is active. Default: true */
  enabled?: boolean;
}

/**
 * Fetches Soroban contract events via the `getEvents` RPC endpoint,
 * powered by SWR.
 *
 * Use SWR's `refreshInterval` option for polling.
 *
 * @example
 * ```tsx
 * const { data: events, isLoading } = useContractEvents({
 *   contractId: "CXXX...",
 *   topics: [["AAAADwAAAAh0cmFuc2Zlcg=="]],
 *   refreshInterval: 5000,
 * });
 * ```
 */
export function useContractEvents(options: UseContractEventsSWROptions) {
  const {
    contractId,
    topics,
    startLedger,
    enabled = true,
    ...swrConfig
  } = options;

  const { config } = useStellarContext();

  return useSWR<ContractEvent[]>(
    enabled
      ? [
          "contract-events",
          contractId,
          JSON.stringify(topics),
          startLedger,
          config.sorobanRpcUrl,
        ]
      : null,
    async () => {
      const server = new SorobanRpc.Server(config.sorobanRpcUrl);

      const filters: SorobanRpc.Server.GetEventsRequest["filters"] = [
        {
          type: "contract",
          contractIds: [contractId],
          ...(topics ? { topics } : {}),
        },
      ];

      const request: SorobanRpc.Server.GetEventsRequest = {
        filters,
        ...(startLedger !== undefined ? { startLedger } : {}),
      };

      const response = await server.getEvents(request);
      return response.events;
    },
    swrConfig
  );
}
