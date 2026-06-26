/**
 * @file index.ts
 * @description Main entry point for stellar-hooks library.
 * @package stellar-hooks
 * @license MIT
 */

// Provider & context
export { StellarProvider, useStellarContext } from "./context";

// Hooks
export { useNetwork } from "./hooks/useNetwork";
export { useFreighter } from "./hooks/useFreighter";
export { useFreighterAccounts } from "./hooks/useFreighterAccounts";
export type {
  UseFreighterAccountsOptions,
  UseFreighterAccountsReturn,
} from "./hooks/useFreighterAccounts";
export { useStellarAccount } from "./hooks/useStellarAccount";
export { useStellarAccounts } from "./hooks/useStellarAccounts";
export type {
  UseStellarAccountsOptions,
  UseStellarAccountsReturn,
} from "./hooks/useStellarAccounts";
export { useStellarBalance } from "./hooks/useStellarBalance";
export { useSorobanContract } from "./hooks/useSorobanContract";
export { useTransaction } from "./hooks/useTransaction";
export type {
  UseTransactionOptions,
  UseTransactionReturn,
} from "./hooks/useTransaction";
export { useLedgerEntry } from "./hooks/useLedgerEntry";
export { useStellarToml } from "./hooks/useStellarToml";
export { useAssetMetadata } from "./hooks/useAssetMetadata";
export { useStellarOffers } from "./hooks/useStellarOffers";
export { useEffects } from "./hooks/useEffects";
export { usePayment } from "./hooks/usePayment";
export type {
  PaymentAsset,
  UsePaymentOptions,
  UsePaymentReturn,
} from "./hooks/usePayment";
export { useBumpSequence } from "./hooks/useBumpSequence";
export type {
  UseBumpSequenceOptions,
  UseBumpSequenceReturn,
} from "./hooks/useBumpSequence";
export { usePathPayment } from "./hooks/usePathPayment";
export type {
  PathPaymentAsset,
  UsePathPaymentOptions,
  UsePathPaymentReturn,
} from "./hooks/usePathPayment";
export { useInflation } from "./hooks/useInflation";
export type {
  UseInflationOptions,
  UseInflationReturn,
} from "./hooks/useInflation";

export { useAccountFlags } from "./hooks/useAccountFlags";
export type {
  AccountFlag,
  UseAccountFlagsOptions,
  UseAccountFlagsReturn,
} from "./hooks/useAccountFlags";
export { useTrade } from "./hooks/useTrade";
export type {
  TradeAsset,
  PlaceOfferParams,
  ModifyOfferParams,
  CancelOfferParams,
  UseTradeOptions,
  UseTradeReturn,
} from "./hooks/useTrade";

export { useAccountMerge } from "./hooks/useAccountMerge";
export type {
  UseAccountMergeOptions,
  UseAccountMergeReturn,
} from "./hooks/useAccountMerge";

export {
  useClaimableBalances,
  useClaimBalance,
  useCreateClaimableBalance,
} from "./hooks/useClaimableBalance";
export type {
  ClaimableBalanceRecord,
  ClaimableBalancesState,
  ClaimableBalanceAsset,
  ClaimantInput,
  CreateClaimableBalanceParams,
  UseClaimBalanceOptions,
  UseClaimBalanceReturn,
  UseClaimableBalancesReturn,
  UseCreateClaimableBalanceOptions,
  UseCreateClaimableBalanceReturn,
} from "./hooks/useClaimableBalance";

export { useSorobanTokenBalance } from "./hooks/useSorobanTokenBalance";
export { useWalletsKit } from "./hooks/useWalletsKit";
export { useWalletConnect } from "./hooks/useWalletConnect";
export type {
  SorobanTokenBalanceState,
  UseSorobanTokenBalanceOptions,
} from "./hooks/useSorobanTokenBalance";

export { useMultiSig } from "./hooks/useMultiSig";
export type {
  BuildOptions,
  UseMultiSigOptions,
  UseMultiSigReturn,
} from "./hooks/useMultiSig";

export { useTrustline } from "./hooks/useTrustline";
export type {
  UseTrustlineOptions,
  UseTrustlineReturn,
} from "./hooks/useTrustline";
export { useCreateAccount } from "./hooks/useCreateAccount";
export type {
  UseCreateAccountOptions,
  UseCreateAccountReturn,
} from "./hooks/useCreateAccount";

export { useAssets } from "./hooks/useAssets";
export type { UseAssetsOptions, UseAssetsReturn } from "./hooks/useAssets";

// Types
export type {
  // Network
  StellarNetwork,
  NetworkConfig,
  CustomNetworkConfig,
  // Account
  StellarAccountData,
  StellarBalance,
  // Wallet
  FreighterState,
  UseFreighterOptions,
  UseFreighterReturn,
  SignTransactionOptions,
  // Transactions
  TransactionStatus,
  TransactionState,
  // Contract
  ContractCallOptions,
  UseContractCallReturn,
  // Ledger
  LedgerEntryState,
  // Provider
  StellarProviderProps,
  StellarContextValue,
  // Wallets Kit
  WalletsKitOptions,
  WalletsKitState,
  UseWalletsKitReturn,
  // WalletConnect
  WalletConnectChain,
  WalletConnectOptions,
  WalletConnectState,
  UseWalletConnectReturn,
} from "./types";

// Hook-specific Types
export type {
  StellarTomlData,
  UseStellarTomlReturn,
} from "./hooks/useStellarToml";
export type {
  AssetMetadata,
  UseAssetMetadataReturn,
} from "./hooks/useAssetMetadata";
export type {
  UseStellarOffersOptions,
  UseStellarOffersReturn,
} from "./hooks/useStellarOffers";
export type { UseEffectsOptions, UseEffectsReturn } from "./hooks/useEffects";
export { useOperations } from "./hooks/useOperations";
export type {
  UseOperationsOptions,
  UseOperationsReturn,
} from "./hooks/useOperations";

// Network presets (useful for custom configs)
export { NETWORK_CONFIGS } from "./types";

// Utilities
export { parseAccountResponse, getCache, setCache } from "./utils";

export { useOfferBook } from "./hooks/useOfferBook";
export type { UseOfferBookOptions } from "./hooks/useOfferBook";

export { useContractId } from "./hooks/useContractId";
export type {
  AssetDescriptor,
  UseContractIdReturn,
} from "./hooks/useContractId";

export { useSequenceNumber } from "./hooks/useSequenceNumber";
export type {
  UseSequenceNumberOptions,
  UseSequenceNumberReturn,
} from "./hooks/useSequenceNumber";

export { useFeeStats } from "./hooks/useFeeStats";
export type {
  FeePercentile,
  FeeStats,
  UseFeeStatsOptions,
  UseFeeStatsReturn,
} from "./hooks/useFeeStats";

export { useLiquidityPool } from "./hooks/useLiquidityPool";
export type {
  LiquidityPoolReserve,
  LiquidityPoolRecord,
  UseLiquidityPoolOptions,
  UseLiquidityPoolReturn,
} from "./hooks/useLiquidityPool";

export { useAccountLiquidityPositions } from "./hooks/useAccountLiquidityPositions";
export type {
  UseAccountLiquidityPositionsOptions,
  UseAccountLiquidityPositionsReturn,
} from "./hooks/useAccountLiquidityPositions";

export { useContractEvents } from "./hooks/useContractEvents";
export type { UseContractEventsOptions } from "./hooks/useContractEvents";
