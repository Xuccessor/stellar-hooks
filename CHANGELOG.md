# Changelog

For breaking changes and migration steps, see [MIGRATION.md](MIGRATION.md).

## 0.1.0 — Initial release

### Added
- `<StellarProvider>` — context provider with `mainnet`, `testnet`, `futurenet`, and `custom` network configs
- `useFreighter()` — connect, sign transactions, and sign auth entries via the Freighter wallet extension
- `useStellarAccount()` — fetch and optionally poll a Stellar account from Horizon
- `useStellarBalance()` — convenience wrapper; surfaces the native XLM balance directly
- `useSorobanContract()` — full Soroban contract call lifecycle: build → simulate → sign → submit → poll
- `useTransaction()` — submit a pre-signed XDR and poll for confirmation (Soroban RPC or Horizon)
- `useLedgerEntry()` — read a raw Soroban ledger entry by `xdr.LedgerKey`
- Full TypeScript types and JSDoc on every public symbol
- Network presets exported as `NETWORK_CONFIGS`
