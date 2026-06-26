# useStellarAccount

Fetch and optionally poll a Stellar account from Horizon.

## Overview

Loads account data including balances, sequence number, thresholds, and flags. Supports automatic polling for real-time updates.

## Import

```tsx
import { useStellarAccount } from "stellar-hooks";
```

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `publicKey` | `string \| null \| undefined` | Yes | The Stellar public key (G... address) to query |
| `options` | `UseStellarAccountOptions` | No | Configuration options |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Whether to fetch data automatically |
| `refetchInterval` | `number` | `0` | Polling interval in milliseconds (0 = disabled) |

## Return Value

| Property | Type | Description |
|---|---|---|---|
| `account` | `StellarAccountData \| null` | Parsed account data |
| `data` | `StellarAccountData \| null` | Alias for `account` (backward compatibility) |
| `isLoading` | `boolean` | Whether the initial fetch is in progress |
| `error` | `Error \| null` | Any error that occurred |
| `lastFetchedAt` | `Date \| null` | Timestamp of the last successful fetch |
| `refetch` | `() => Promise<void>` | Manually trigger a refetch |

### `StellarAccountData` Structure

```ts
{
  accountId: string;              // G... address
  balances: StellarBalance[];     // Array of asset balances
  sequence: string;               // Account sequence number
  subentryCount: number;          // Number of subentries (offers, trustlines, etc.)
  numSponsored: number;           // Number of entries this account sponsors
  numSponsoring: number;          // Number of entries sponsoring this account
  thresholds: {
    lowThreshold: number;
    medThreshold: number;
    highThreshold: number;
  };
  flags: {
    authRequired: boolean;
    authRevocable: boolean;
    authImmutable: boolean;
    authClawbackEnabled: boolean;
  };
  raw: Horizon.AccountResponse;   // Original Horizon response
}
```

## Basic Example

```tsx
import { useStellarAccount } from "stellar-hooks";

function AccountInfo({ publicKey }: { publicKey: string }) {
  const { account, isLoading, error } = useStellarAccount(publicKey);

  if (isLoading) return <p>Loading account...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!account) return <p>Account not found</p>;

  return (
    <div>
      <h2>Account: {account.accountId}</h2>
      <p>Sequence: {account.sequence}</p>
      <p>Subentries: {account.subentryCount}</p>
      <p>Balances: {account.balances.length}</p>
    </div>
  );
}
```

## Polling Example

```tsx
const { account } = useStellarAccount(publicKey, {
  refetchInterval: 5000, // Re-fetch every 5 seconds
});
```

## Conditional Fetching

```tsx
const { account } = useStellarAccount(publicKey, {
  enabled: !!publicKey, // Only fetch when publicKey is available
});
```

## Multi-Account Fetching

When your UI needs data for several accounts at once — a multisig roster, a list of recent signers, an account picker — calling `useStellarAccount` once per key in a React tree forces a serial waterfall and triggers N independent polling timers. Use `useStellarAccounts(publicKeys[])` instead: it issues a single batched fetch per tick and returns a `Record<publicKey, StellarAccountData>` map with per-key error capture.

```tsx
import { useStellarAccounts } from "stellar-hooks";

function MultisigRoster({ signers }: { signers: string[] }) {
  const { accounts, errors, isLoading, isError, refetch } = useStellarAccounts(
    signers,
    { refetchInterval: 10_000 },
  );

  if (isLoading) return <p>Loading roster…</p>;
  if (isError)
    return (
      <ErrorBanner
        message="One or more signers could not be loaded"
        onRetry={refetch}
      />
    );

  return (
    <ul>
      {signers.map((pk) => (
        <li key={pk}>
          <code>{pk}</code>
          {errors[pk] ? (
            <span style={{ color: "red" }}> — error: {errors[pk]?.message}</span>
          ) : (
            <span> — seq #{accounts[pk]?.sequence}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
```

Key behaviours:

- **Parallel RPC**: `Promise.all` over distinct `loadAccount` calls — no serial waterfall.
- **Per-key errors**: a missing/invalid account is captured in `errors[pk]` without poisoning the rest of the batch.
- **Idempotent keys**: duplicate entries in the input are deduped before the RPC call.
- **Stable refetch identity**: `refetch()` reissues the whole batch.
- **Single polling timer**: `refetchInterval` ticks fire one batch (not N independent timers).

`enabled` short-circuits all RPC calls. Pass `null`/`undefined` entries in the input array — they will be skipped.

## See Also

- [useStellarBalance](/api/hooks/use-stellar-balance) — Convenience wrapper for a single balance query
- `useStellarAccounts` — Multi-account parallel fetch (this page's Multi-Account section above)
