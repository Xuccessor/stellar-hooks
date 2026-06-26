/**
 * @file schemas.ts
 * @description Zod schemas for runtime validation of Horizon API responses.
 * @package stellar-hooks
 * @license MIT
 * @see https://github.com/dark-princezz/stellar-hooks/issues/184
 */

import { z } from "zod";

// ─── Primitives ───────────────────────────────────────────────────────────────

/** Stellar public key (G...) or contract address (C...) */
const StellarAddressSchema = z.string().min(1);

/** Numeric string as returned by Horizon (e.g. "100.0000000") */
const NumericStringSchema = z.string();

// ─── Balance Schemas ──────────────────────────────────────────────────────────

/**
 * Schema for a native (XLM) balance line in Horizon's AccountResponse.
 */
export const BalanceLineNativeSchema = z.object({
  asset_type: z.literal("native"),
  balance: NumericStringSchema,
  buying_liabilities: NumericStringSchema,
  selling_liabilities: NumericStringSchema,
});

/**
 * Schema for a credit asset balance line (alphanum4 / alphanum12).
 */
export const BalanceLineAssetSchema = z.object({
  asset_type: z.enum(["credit_alphanum4", "credit_alphanum12"]),
  asset_code: z.string(),
  asset_issuer: StellarAddressSchema,
  balance: NumericStringSchema,
  buying_liabilities: NumericStringSchema,
  selling_liabilities: NumericStringSchema,
  limit: NumericStringSchema,
  is_authorized: z.boolean().optional(),
  is_authorized_to_maintain_liabilities: z.boolean().optional(),
  is_clawback_enabled: z.boolean().optional(),
});

/**
 * Schema for a liquidity pool shares balance line.
 */
export const BalanceLineLiquidityPoolSchema = z.object({
  asset_type: z.literal("liquidity_pool_shares"),
  liquidity_pool_id: z.string(),
  balance: NumericStringSchema,
  limit: NumericStringSchema,
  last_modified_ledger: z.number().optional(),
  is_authorized: z.boolean().optional(),
  is_authorized_to_maintain_liabilities: z.boolean().optional(),
  is_clawback_enabled: z.boolean().optional(),
});

/**
 * Union of all balance line types returned by Horizon.
 */
export const BalanceLineSchema = z.discriminatedUnion("asset_type", [
  BalanceLineNativeSchema,
  BalanceLineAssetSchema.extend({ asset_type: z.literal("credit_alphanum4") }),
  BalanceLineAssetSchema.extend({ asset_type: z.literal("credit_alphanum12") }),
  BalanceLineLiquidityPoolSchema,
]);

// ─── Account Response ─────────────────────────────────────────────────────────

/**
 * Schema for the account thresholds object.
 */
export const AccountThresholdsSchema = z.object({
  low_threshold: z.number(),
  med_threshold: z.number(),
  high_threshold: z.number(),
});

/**
 * Schema for the account flags object.
 */
export const AccountFlagsSchema = z.object({
  auth_required: z.boolean(),
  auth_revocable: z.boolean(),
  auth_immutable: z.boolean(),
  auth_clawback_enabled: z.boolean(),
});

/**
 * Schema for a signer entry on an account.
 */
export const AccountSignerSchema = z.object({
  weight: z.number(),
  key: z.string(),
  type: z.string(),
});

/**
 * Schema for Horizon's AccountResponse JSON body.
 * Validates the essential fields consumed by stellar-hooks.
 * Uses `.passthrough()` to allow additional Horizon-specific fields
 * (e.g. `_links`, `data`, `paging_token`) without breaking validation.
 */
export const AccountResponseSchema = z
  .object({
    id: z.string(),
    account_id: StellarAddressSchema,
    sequence: NumericStringSchema,
    subentry_count: z.number(),
    home_domain: z.string().optional(),
    last_modified_ledger: z.number().optional(),
    last_modified_time: z.string().optional(),
    thresholds: AccountThresholdsSchema,
    flags: AccountFlagsSchema,
    balances: z.array(BalanceLineSchema),
    signers: z.array(AccountSignerSchema),
    num_sponsoring: z.number().optional(),
    num_sponsored: z.number().optional(),
  })
  .passthrough();

// ─── Parsed Account Data ─────────────────────────────────────────────────────

/**
 * Schema for the library's parsed StellarBalance interface.
 */
export const StellarBalanceSchema = z.object({
  assetType: z.string(),
  assetCode: z.string().optional(),
  assetIssuer: z.string().optional(),
  balance: NumericStringSchema,
  balanceFloat: z.number(),
  buyingLiabilities: NumericStringSchema,
  sellingLiabilities: NumericStringSchema,
  limit: NumericStringSchema.optional(),
  isNative: z.boolean(),
});

/**
 * Schema for the library's parsed StellarAccountData interface.
 * Validates the output of `parseAccountResponse()`.
 */
export const StellarAccountDataSchema = z.object({
  accountId: StellarAddressSchema,
  balances: z.array(StellarBalanceSchema),
  sequence: NumericStringSchema,
  subentryCount: z.number(),
  numSponsored: z.number(),
  numSponsoring: z.number(),
  thresholds: z.object({
    lowThreshold: z.number(),
    medThreshold: z.number(),
    highThreshold: z.number(),
  }),
  flags: z.object({
    authRequired: z.boolean(),
    authRevocable: z.boolean(),
    authImmutable: z.boolean(),
    authClawbackEnabled: z.boolean(),
  }),
  raw: z.any(),
});

// ─── Offer Schemas ────────────────────────────────────────────────────────────

/**
 * Schema for an asset descriptor in offer / orderbook records.
 */
export const OfferAssetSchema = z.union([
  z.object({
    asset_type: z.literal("native"),
  }),
  z.object({
    asset_type: z.enum(["credit_alphanum4", "credit_alphanum12"]),
    asset_code: z.string(),
    asset_issuer: StellarAddressSchema,
  }),
]);

/**
 * Schema for an individual offer record from Horizon.
 */
export const OfferRecordSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    paging_token: z.string(),
    seller: StellarAddressSchema,
    selling: OfferAssetSchema,
    buying: OfferAssetSchema,
    amount: NumericStringSchema,
    price_r: z.object({
      n: z.number(),
      d: z.number(),
    }),
    price: NumericStringSchema,
    last_modified_ledger: z.number().optional(),
    last_modified_time: z.string().optional(),
  })
  .passthrough();

/**
 * Schema for a paginated collection of offer records.
 */
export const OfferCollectionSchema = z.object({
  records: z.array(OfferRecordSchema),
});

// ─── Orderbook Schemas ────────────────────────────────────────────────────────

/**
 * Schema for a single price level in an orderbook.
 */
export const OrderbookPriceLevelSchema = z.object({
  price_r: z.object({
    n: z.number(),
    d: z.number(),
  }),
  price: NumericStringSchema,
  amount: NumericStringSchema,
});

/**
 * Schema for Horizon's OrderbookRecord.
 */
export const OrderbookRecordSchema = z
  .object({
    bids: z.array(OrderbookPriceLevelSchema),
    asks: z.array(OrderbookPriceLevelSchema),
    base: OfferAssetSchema,
    counter: OfferAssetSchema,
  })
  .passthrough();

// ─── Transaction Submission Schemas ───────────────────────────────────────────

/**
 * Schema for a successful Horizon transaction submission response.
 */
export const TransactionSubmissionResponseSchema = z
  .object({
    hash: z.string(),
    ledger: z.number(),
    envelope_xdr: z.string().optional(),
    result_xdr: z.string().optional(),
    result_meta_xdr: z.string().optional(),
  })
  .passthrough();

// ─── Claimable Balance Schemas ────────────────────────────────────────────────

/**
 * Schema for a claimant predicate (recursive, simplified as passthrough).
 */
export const ClaimantPredicateSchema: z.ZodType<Record<string, unknown>> = z
  .record(z.unknown());

/**
 * Schema for a claimant entry in a claimable balance record.
 */
export const ClaimantSchema = z.object({
  destination: StellarAddressSchema,
  predicate: ClaimantPredicateSchema,
});

/**
 * Schema for Horizon's ClaimableBalanceRecord.
 */
export const ClaimableBalanceRecordSchema = z
  .object({
    id: z.string(),
    asset: z.string(),
    amount: NumericStringSchema,
    sponsor: z.string().optional(),
    last_modified_ledger: z.number(),
    claimants: z.array(ClaimantSchema),
    paging_token: z.string().optional(),
  })
  .passthrough();

/**
 * Schema for a paginated collection of claimable balance records.
 */
export const ClaimableBalanceCollectionSchema = z.object({
  records: z.array(ClaimableBalanceRecordSchema),
});

/**
 * Schema for the library's parsed ClaimableBalanceRecord interface.
 */
export const ParsedClaimableBalanceRecordSchema = z.object({
  id: z.string(),
  asset: z.string(),
  amount: NumericStringSchema,
  sponsor: z.string(),
  lastModifiedLedger: z.number(),
  claimants: z.array(
    z.object({
      destination: StellarAddressSchema,
      predicate: z.record(z.unknown()),
    })
  ),
});

// ─── Soroban RPC Schemas ──────────────────────────────────────────────────────

/**
 * Schema for Soroban RPC `sendTransaction` response.
 */
export const SendTransactionResponseSchema = z
  .object({
    status: z.enum(["PENDING", "DUPLICATE", "TRY_AGAIN_LATER", "ERROR"]),
    hash: z.string(),
    latestLedger: z.number().optional(),
    latestLedgerCloseTime: z.string().optional(),
    errorResult: z.any().optional(),
  })
  .passthrough();

/**
 * Schema for Soroban RPC `getTransaction` response.
 */
export const GetTransactionResponseSchema = z
  .object({
    status: z.enum(["SUCCESS", "NOT_FOUND", "FAILED"]),
    latestLedger: z.number().optional(),
    latestLedgerCloseTime: z.string().optional(),
    oldestLedger: z.number().optional(),
    oldestLedgerCloseTime: z.string().optional(),
    applicationOrder: z.number().optional(),
    envelopeXdr: z.string().optional(),
    resultXdr: z.string().optional(),
    resultMetaXdr: z.string().optional(),
    ledger: z.number().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

/**
 * Schema for Soroban RPC `simulateTransaction` response.
 */
export const SimulateTransactionResponseSchema = z
  .object({
    latestLedger: z.number().optional(),
  })
  .passthrough();

// ─── Ledger Entry Schemas ─────────────────────────────────────────────────────

/**
 * Schema for Soroban RPC `getLedgerEntries` individual result.
 */
export const LedgerEntryResultSchema = z
  .object({
    key: z.string(),
    xdr: z.string(),
    lastModifiedLedgerSeq: z.number().optional(),
    liveUntilLedgerSeq: z.number().optional(),
  })
  .passthrough();

// ─── Network / Config Schemas ─────────────────────────────────────────────────

/**
 * Schema for the StellarNetwork literal union.
 */
export const StellarNetworkSchema = z.enum([
  "mainnet",
  "testnet",
  "futurenet",
  "custom",
]);

/**
 * Schema for the NetworkConfig interface.
 */
export const NetworkConfigSchema = z.object({
  network: StellarNetworkSchema,
  horizonUrl: z.string().url(),
  sorobanRpcUrl: z.string().url(),
  networkPassphrase: z.string().min(1),
});

/**
 * Schema for the CustomNetworkConfig interface.
 */
export const CustomNetworkConfigSchema = z.object({
  network: z.literal("custom"),
  horizonUrl: z.string().url(),
  sorobanRpcUrl: z.string().url(),
  networkPassphrase: z.string().min(1),
});

// ─── Stellar.toml Schemas ─────────────────────────────────────────────────────

/**
 * Schema for a CURRENCIES entry in a stellar.toml.
 */
export const StellarTomlCurrencySchema = z
  .object({
    code: z.string().optional(),
    issuer: z.string().optional(),
    name: z.string().optional(),
    desc: z.string().optional(),
    image: z.string().optional(),
  })
  .passthrough();

/**
 * Schema for stellar.toml data as consumed by useStellarToml.
 */
export const StellarTomlDataSchema = z
  .object({
    CURRENCIES: z.array(StellarTomlCurrencySchema).optional(),
  })
  .passthrough();

// ─── Validation Helpers ───────────────────────────────────────────────────────

/**
 * Validates data against a Zod schema and returns the parsed result.
 * Throws a `ZodError` with detailed path information on failure.
 *
 * @example
 * ```ts
 * const account = validateHorizonResponse(AccountResponseSchema, rawJson);
 * ```
 */
export function validateHorizonResponse<T>(
  schema: z.ZodType<T>,
  data: unknown
): T {
  return schema.parse(data);
}

/**
 * Safely validates data against a Zod schema without throwing.
 * Returns a discriminated union with `success`, `data`, and `error` fields.
 *
 * @example
 * ```ts
 * const result = safeValidateHorizonResponse(AccountResponseSchema, rawJson);
 * if (result.success) {
 *   console.log(result.data.account_id);
 * } else {
 *   console.error(result.error.issues);
 * }
 * ```
 */
export function safeValidateHorizonResponse<T>(
  schema: z.ZodType<T>,
  data: unknown
): z.SafeParseReturnType<unknown, T> {
  return schema.safeParse(data);
}

// ─── Inferred Types ───────────────────────────────────────────────────────────
// These types are derived directly from the schemas and can be used
// interchangeably with the manually-defined interfaces.

export type AccountResponseParsed = z.infer<typeof AccountResponseSchema>;
export type BalanceLineParsed = z.infer<typeof BalanceLineSchema>;
export type StellarBalanceParsed = z.infer<typeof StellarBalanceSchema>;
export type StellarAccountDataParsed = z.infer<typeof StellarAccountDataSchema>;
export type OfferRecordParsed = z.infer<typeof OfferRecordSchema>;
export type OrderbookRecordParsed = z.infer<typeof OrderbookRecordSchema>;
export type ClaimableBalanceRecordParsed = z.infer<typeof ClaimableBalanceRecordSchema>;
export type TransactionSubmissionParsed = z.infer<typeof TransactionSubmissionResponseSchema>;
export type SendTransactionParsed = z.infer<typeof SendTransactionResponseSchema>;
export type GetTransactionParsed = z.infer<typeof GetTransactionResponseSchema>;
export type NetworkConfigParsed = z.infer<typeof NetworkConfigSchema>;
