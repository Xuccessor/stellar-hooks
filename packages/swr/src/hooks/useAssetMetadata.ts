/**
 * @file useAssetMetadata.ts
 * @description SWR hook for fetching asset metadata.
 * @package @stellar-hooks/swr
 * @license MIT
 */

import { useMemo } from "react";
import { useStellarAccount } from "./useStellarAccount";
import { useStellarToml, type StellarTomlData } from "./useStellarToml";

export interface AssetMetadata {
  code?: string;
  issuer?: string;
  name?: string;
  desc?: string;
  image?: string;
  [key: string]: any;
}

/**
 * Resolves asset issuer info via stellar.toml, powered by SWR.
 *
 * Composes `useStellarAccount` (SWR) and `useStellarToml` (SWR) to fetch the
 * issuer's home_domain and metadata. Both layers benefit from SWR caching.
 *
 * @example
 * ```tsx
 * const { metadata, isLoading, error } = useAssetMetadata("USDC", "GISSUER...");
 * ```
 */
export function useAssetMetadata(
  assetCode: string | null | undefined,
  assetIssuer: string | null | undefined
) {
  const {
    data: accountData,
    isLoading: isAccountLoading,
    error: accountError,
  } = useStellarAccount(assetIssuer, { enabled: !!assetIssuer });

  const homeDomain = accountData?.raw?.home_domain;

  const {
    data: tomlData,
    isLoading: isTomlLoading,
    error: tomlError,
  } = useStellarToml(homeDomain);

  const metadata = useMemo<AssetMetadata | null>(() => {
    if (!tomlData || !tomlData.CURRENCIES || !assetCode || !assetIssuer)
      return null;

    return (
      tomlData.CURRENCIES.find(
        (c) => c.code === assetCode && c.issuer === assetIssuer
      ) ?? null
    );
  }, [tomlData, assetCode, assetIssuer]);

  return {
    metadata,
    isLoading: isAccountLoading || isTomlLoading,
    error: accountError ?? tomlError,
  };
}
