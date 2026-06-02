/**
 * @file index.ts
 * @description Utility functions for the stellar-hooks library.
 * @package stellar-hooks
 */

import type { Horizon } from "@stellar/stellar-sdk";
import type { StellarAccountData } from "../types";

/**
 * Transforms a raw Horizon AccountResponse into the library's internal StellarAccountData format.
 */
export function parseAccountResponse(raw: Horizon.AccountResponse): StellarAccountData {
  return {
    accountId: raw.account_id,
    sequence: raw.sequence,
    subentryCount: raw.subentry_count,
    numSponsored: raw.num_sponsored,
    numSponsoring: raw.num_sponsoring,
    thresholds: {
      lowThreshold: raw.thresholds.low_threshold,
      medThreshold: raw.thresholds.med_threshold,
      highThreshold: raw.thresholds.high_threshold,
    },
    flags: {
      authRequired: raw.flags.auth_required,
      authRevocable: raw.flags.auth_revocable,
      authImmutable: raw.flags.auth_immutable,
      authClawbackEnabled: raw.flags.auth_clawback_enabled,
    },
    balances: raw.balances.map((b) => ({
      assetType: b.asset_type,
      assetCode: b.asset_code,
      assetIssuer: b.asset_issuer,
      balance: b.balance,
      balanceFloat: parseFloat(b.balance),
      buyingLiabilities: b.buying_liabilities,
      sellingLiabilities: b.selling_liabilities,
      limit: b.limit,
      isNative: b.asset_type === "native",
    })),
    raw,
  };
}

/**
 * Simple delay function for polling.
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff calculation for RPC polling.
 */
export function backoff(attempt: number, base = 1000) {
  return Math.min(base * Math.pow(2, attempt), 10000);
}

// ─── Simple In-Memory Cache ───────────────────────────────────────────────────

const cache = new Map<string, { data: any; expires: number }>();

export function getCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  
  return item.data as T;
}

export function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, expires: Date.now() + ttl });
}