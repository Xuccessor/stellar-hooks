# useFreighter

Connect to and interact with the [Freighter](https://freighter.app) browser extension wallet.

## Overview

`useFreighter` manages wallet connection state, handles account and network switches automatically, provides methods for signing transactions, auth entries, and arbitrary data blobs, and detects when the wallet is on a different network than your dApp expects so a wrong-ledger sign can't happen silently.

## Import

```tsx
import { useFreighter } from "stellar-hooks";
```

## Parameters

The hook accepts an optional options object.

```ts
useFreighter(options?: UseFreighterOptions)
```

| Option | Type | Description |
|---|---|---|
| `expectedNetworkPassphrase` | `string` | The network passphrase your dApp expects (e.g. `"Test SDF Network ; September 2015"`). When the connected wallet is on a different network, the hook reports a mismatch on `networkPassphraseMismatch` and produces an actionable message on `networkPassphraseWarning`. If you omit this option but render `<StellarProvider network="testnet">` (or another preset) higher in the tree, the provider's passphrase is used as the expectation automatically. |

## Return Value

| Property | Type | Description |
|---|---|---|
| `isInstalled` | `boolean` | Whether Freighter is installed in the browser |
| `isConnected` | `boolean` | Whether the user has granted wallet access |
| `publicKey` | `string \| null` | The connected account's public key (G... address), or null if not connected |
| `network` | `string \| null` | The network the wallet is currently on (e.g. `"TESTNET"`, `"PUBLIC"`) |
| `networkPassphrase` | `string \| null` | The wallet's current network passphrase |
| `networkPassphraseMismatch` | `boolean` | `true` when the wallet's passphrase differs from the `expectedNetworkPassphrase` (option or provider). `false` when they match, the hook isn't connected, or no expectation is available. |
| `networkPassphraseWarning` | `string \| null` | When `networkPassphraseMismatch` is `true`, an actionable message naming both networks and how to resolve it. `null` otherwise. |
| `isLoading` | `boolean` | Whether the hook is currently checking connection status or performing an action |
| `error` | `Error \| null` | Any error that occurred during connection or signing |
| `connect` | `() => Promise<void>` | Request wallet access from the user. Opens Freighter permission dialog. |
| `disconnect` | `() => void` | Clear the connection state locally (does not revoke permissions in Freighter) |
| `signTransaction` | `(xdr: string, opts?) => Promise<string>` | Sign a transaction XDR and return the signed XDR |
| `signAuthEntry` | `(entryPreimageXdr: string) => Promise<string>` | Sign a Soroban authorization entry for contract auth |
| `signBlob` | `(blob: string, opts?) => Promise<string>` | Sign arbitrary data (e.g. for login proof or off-chain signatures) |

### `signTransaction` Options

```ts
{
  networkPassphrase?: string;  // Override network passphrase
  address?: string;            // Sign with a specific account (if multiple connected)
}
```

### `signBlob` Options

```ts
{
  accountToSign?: string;      // Sign with a specific account
}
```

## Basic Example

```tsx
import { useFreighter } from "stellar-hooks";

function WalletButton() {
  const {
    isInstalled,
    isConnected,
    publicKey,
    isLoading,
    error,
    connect,
    disconnect,
  } = useFreighter();

  if (!isInstalled) {
    return (
      <p>
        Please install <a href="https://freighter.app">Freighter</a> to continue.
      </p>
    );
  }

  if (!isConnected) {
    return (
      <button onClick={connect} disabled={isLoading}>
        {isLoading ? "Connecting..." : "Connect Freighter"}
      </button>
    );
  }

  return (
    <div>
      <p>Connected: {publicKey}</p>
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

## Network Mismatch Detection

When the connected wallet is on a different Stellar network than your dApp expects, signing operations would silently target the wrong ledger and fail (or worse, succeed against an unintended chain). `useFreighter` exposes a typed detector so you can render a guard banner, gate signing behind an explicit acknowledgement, or otherwise prevent the user from submitting a transaction against the wrong network.

```tsx
import { useFreighter } from "stellar-hooks";

function NetworkMismatchGuard() {
  const {
    network,                   // e.g. "TESTNET" or "PUBLIC" reported by Freighter
    networkPassphrase,         // the wallet's current passphrase
    networkPassphraseMismatch, // true when the wallet is on a different network than your dApp expects
    networkPassphraseWarning,  // string | null — actionable warning text when there's a mismatch
    isConnected,
  } = useFreighter({
    expectedNetworkPassphrase: "Test SDF Network ; September 2015",
  });

  if (!isConnected || !networkPassphraseMismatch) return null;

  return (
    <div role="alert" style={{ background: "#fee", padding: 12 }}>
      {networkPassphraseWarning}
    </div>
  );
}
```

If you wrap your app in `<StellarProvider network="testnet">` (or any preset), the expected passphrase comes from the provider automatically and you do not need to pass `expectedNetworkPassphrase` explicitly.

`networkPassphraseWarning` is `null` whenever `networkPassphraseMismatch` is `false`, so a short-circuit render like `{networkPassphraseMismatch && <Banner message={networkPassphraseWarning!} />}` is safe.

## Signing Examples

### Sign a Transaction

```tsx
import { TransactionBuilder, Asset, Operation } from "@stellar/stellar-sdk";
import { useFreighter } from "stellar-hooks";

function SendPayment() {
  const { publicKey, signTransaction } = useFreighter();

  async function handleSend() {
    // 1. Build the transaction (using Horizon or custom logic)
    const tx = new TransactionBuilder(sourceAccount, {
      fee: "100",
      networkPassphrase: "Test SDF Network ; September 2015",
    })
      .addOperation(
        Operation.payment({
          destination: "GBXXX...",
          asset: Asset.native(),
          amount: "10",
        })
      )
      .setTimeout(60)
      .build();

    // 2. Sign via Freighter
    const signedXdr = await signTransaction(tx.toXDR());

    // 3. Submit (using useTransaction or Horizon directly)
    console.log("Signed XDR:", signedXdr);
  }

  return <button onClick={handleSend}>Send 10 XLM</button>;
}
```

### Sign a Blob (Arbitrary Data)

```tsx
import { useFreighter } from "stellar-hooks";

function SignMessage() {
  const { signBlob, publicKey } = useFreighter();

  async function handleSign() {
    const message = "Hello, Stellar!";
    const base64Message = btoa(message);
    
    const signature = await signBlob(base64Message);
    console.log("Signature:", signature);
  }

  return <button onClick={handleSign}>Sign Message</button>;
}
```

## Multi-account selection (`useFreighterAccounts`)

Freighter itself only exposes the currently *active* address — the extension does not let a dApp enumerate the user's other accounts. If you want to surface a custom wallet picker / account switcher on top of Freighter, use **`useFreighterAccounts`** in tandem with `useFreighter`. The hook keeps a persistent list of every address your dApp has previously been granted access to, plus a helper that drives Freighter's permission dialog when the user wants to switch.

```tsx
import { useFreighterAccounts } from "stellar-hooks";

function AccountPicker() {
  const { known, active, switchAccount, isSwitching } = useFreighterAccounts();

  return (
    <>
      <select
        value={active ?? ""}
        disabled={isSwitching}
        onChange={async (e) => {
          const landed = await switchAccount(e.target.value);
          if (landed !== e.target.value) {
            alert(
              `Freighter connected as ${landed ?? "nothing"} — pick ${e.target.value} in the extension.`,
            );
          }
        }}
      >
        {known.length === 0
          ? <option value="">No accounts yet</option>
          : known.map((pk) => <option key={pk} value={pk}>{pk.slice(0, 8)}…</option>)}
      </select>
      <p>
        Connected: <code>{active}</code>{" "}
        {isSwitching ? <em>(switching…)</em> : null}
      </p>
    </>
  );
}
```

Key behaviours:

- `known` is most-recent-first, deduped, capped at `maxHistory` (default `20`).
- Persisted to `localStorage` under `"stellar-hooks:freighter-accounts"` by default; multi-tab-aware (reacts to `StorageEvent`).
- `switchAccount(target)` drives Freighter's `requestAccess()` permission dialog. The optional `target` is accepted for caller-comparison only — Freighter surfaces whatever the user has marked active in the extension, so your UI should compare the returned address against your `target` and flag mismatches.
- `remember(pk)`, `forget(pk)`, `clear()`, and `find(target)` expose manual list management (cross-device sync, recovery flows, validation).

## Notes

- **Session Persistence**: The hook checks for an existing connection on mount and restores it automatically from `localStorage`.
- **Wallet Changes**: The hook does **not** automatically react to account or network switches in Freighter by default. If you need live updates, you can poll or listen to Freighter events manually (Freighter v6+ emits custom events).
- **Error Handling**: If `signTransaction` or `signBlob` fails (user rejects, network mismatch, etc.), the promise rejects and the error is captured in the `error` property.
- **Multiple Accounts**: If the user has multiple accounts in Freighter, `publicKey` reflects the currently active one. Use the `address` option in `signTransaction` to sign with a specific account, or `useFreighterAccounts` to track previously-seen addresses across sessions.

## Type Definitions

```ts
interface UseFreighterOptions {
  /**
   * The Stellar network passphrase this dApp expects. If omitted, the
   * passphrase is read from the surrounding <StellarProvider> config.
   */
  expectedNetworkPassphrase?: string;
}

interface UseFreighterReturn {
  isInstalled: boolean;
  isConnected: boolean;
  publicKey: string | null;
  network: string | null;
  networkPassphrase: string | null;
  networkPassphraseMismatch: boolean;
  networkPassphraseWarning: string | null;
  isLoading: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string, opts?: SignTransactionOptions) => Promise<string>;
  signAuthEntry: (entryPreimageXdr: string) => Promise<string>;
  signBlob: (blob: string, opts?: { accountToSign?: string }) => Promise<string>;
}

interface SignTransactionOptions {
  networkPassphrase?: string;
  address?: string;
}
```

## See Also

- [usePayment](/api/hooks/use-payment) — Higher-level hook for sending payments without manual transaction building
- [useSorobanContract](/api/hooks/use-soroban-contract) — Handles contract call signing internally
- [useTransaction](/api/hooks/use-transaction) — Submit and poll signed transactions
