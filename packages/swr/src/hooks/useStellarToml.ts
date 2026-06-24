/**
 * @file useStellarToml.ts
 * @description SWR hook for fetching and parsing stellar.toml files.
 * @package @stellar-hooks/swr
 * @license MIT
 */

import useSWR, { type SWRConfiguration } from "swr";
import { StellarToml } from "@stellar/stellar-sdk";

export interface StellarTomlData {
  CURRENCIES?: Array<Record<string, any>>;
  VALIDATORS?: Array<Record<string, any>>;
  DOCUMENTATION?: Record<string, any>;
  [key: string]: any;
}

export interface UseStellarTomlSWROptions extends SWRConfiguration<StellarTomlData> {}

/**
 * Fetches and parses a domain's stellar.toml file via the SEP-1 standard,
 * powered by SWR.
 *
 * @example
 * ```tsx
 * const { data: toml, isLoading } = useStellarToml("stellar.org");
 * ```
 */
export function useStellarToml(
  domain: string | null | undefined,
  options: UseStellarTomlSWROptions = {}
) {
  return useSWR<StellarTomlData>(
    domain ? ["stellar-toml", domain] : null,
    async () => {
      const toml = await StellarToml.Resolver.resolve(domain!);
      return toml as StellarTomlData;
    },
    options
  );
}
