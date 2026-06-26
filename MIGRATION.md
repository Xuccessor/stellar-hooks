# Migration Guide

This document tracks breaking changes between `stellar-hooks` releases and how to update your code.

For a guide on migrating **from raw `@stellar/stellar-sdk` code to `stellar-hooks`**, see [docs/guides/migration-guide.md](docs/guides/migration-guide.md).

---

## v0.1.0 (Initial Release)

This is the first public release of `stellar-hooks`. There are no prior versions to migrate from.

### Highlights

- `<StellarProvider>` with `mainnet`, `testnet`, `futurenet`, and `custom` network configs
- Core hooks: `useFreighter`, `useStellarAccount`, `useStellarBalance`, `useSorobanContract`, `useTransaction`, `useLedgerEntry`
- Payment hooks: `usePayment`, `usePathPayment`
- Transaction helpers: `useAccountFlags`, `useAccountMerge`, `useBumpSequence`, `useInflation`, `useManageData`, `useTrustline`, `useCreateAccount`
- DEX hooks: `useTrade`, `useStellarOffers`, `useOfferBook`
- Discovery hooks: `useStellarToml`, `useAssetMetadata`, `useContractEvents`, `useEffects`, `useOperations`, `useAssets`
- Wallet adapters: `useWalletsKit`, `useWalletConnect`
- Branded types: `StellarPublicKey`, `StellarContractId`, `StellarXdrString`, `StellarTxHash`, `StellarAssetIssuer`
- Zod schemas for runtime validation of Horizon and Soroban RPC responses

---

<!--
## v0.2.0

Template for future breaking changes:

### Breaking changes

#### `hookName` — description of what changed

**Before:**
```ts
const { oldField } = useHook();
```

**After:**
```ts
const { newField } = useHook();
```

**Why:** Explanation of why the change was made.

### Deprecations

- `deprecatedField` on `InterfaceName` — use `newField` instead. Will be removed in v0.3.0.

### New features

- ...
-->
