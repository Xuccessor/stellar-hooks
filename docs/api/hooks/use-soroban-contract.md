# useSorobanContract

Invoke a Soroban smart-contract method with built-in simulation, auth handling, submission, and status polling.

## Overview

The most comprehensive hook for Soroban contract interactions. Handles the entire contract call lifecycle: build → simulate → sign → submit → poll.

## Import

```tsx
import { useSorobanContract } from "stellar-hooks";
```

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `contractId` | `string` | Yes | Soroban contract address (C...) |
| `options` | `Omit<ContractCallOptions, 'contractId'>` | Yes | Contract call configuration |

### Options

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `method` | `string` | Yes | — | Contract method name to call |
| `args` | `unknown[]` | No | `[]` | Method arguments (as `xdr.ScVal` or plain values) |
| `fee` | `number` | No | `100` | Fee in stroops |
| `timeoutSeconds` | `number` | No | `30` | Polling timeout |
| `sorobanRpcServer` | `rpc.Server` | No | — | Custom RPC server instance |
| `onSuccess` | `(result) => void` | No | — | Success callback |
| `onError` | `(error) => void` | No | — | Error callback |
| `parseResult` | `(scVal) => T` | No | — | Function to parse the return value |

## Return Value

| Property | Type | Description |
|---|---|---|---|
| `call` | `(overrides?) => Promise<T \| null>` | Execute the contract call |
| `query` | `(overrides?) => Promise<T \| null>` | Simulate-only query (read without signing). Updates `result` / `status`. |
| `dryRun` | `(overrides?) => Promise<T \| null>` | Simulate-only "dry-run" facade. Functionally identical to `query`; named separately for call sites whose intent is to PREVIEW a would-be transaction (gas estimation, form validation, Confirm screens with computed effects) rather than to read state. |
| `simulate` | `(overrides?) => Promise<SimulateResponse>` | Raw simulation for cost estimation; does not update hook state. |
| `status` | `TransactionStatus` | Current status |
| `result` | `T \| null` | Parsed return value on success |
| `hash` | `string \| null` | Transaction hash |
| `error` | `Error \| null` | Any error |
| `isLoading` | `boolean` | Whether call is in progress |
| `isSuccess` | `boolean` | Whether call succeeded |
| `isError` | `boolean` | Whether an error occurred |
| `reset` | `() => void` | Reset to idle state |

### `TransactionStatus`

- **Full lifecycle (`call`):** `"idle"` → `"building"` → `"signing"` → `"submitting"` → `"polling"` → `"success"` or `"error"`.
- **Read-only (`query` / `dryRun`):** `"idle"` → `"building"` → `"success"` or `"error"`. Both skip the signing/submitting/polling phases entirely.

## Basic Example

```tsx
import { useSorobanContract } from "stellar-hooks";
import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk";

function IncrementButton() {
  const { call, status, result, hash, isLoading } = useSorobanContract(
    "CABC...XYZ",
    {
      method: "increment",
      args: [nativeToScVal(1, { type: "u32" })],
    }
  );

  const parsed = result ? scValToNative(result as any) : null;

  return (
    <div>
      <p>Status: {status}</p>
      {parsed != null && <p>Return value: {String(parsed)}</p>}
      {hash && <p>Hash: {hash}</p>}
      <button onClick={() => call()} disabled={isLoading}>
        Increment
      </button>
    </div>
  );
}
```

## Query Example (Read-Only)

Use `query()` to simulate without signing or submitting. The hook's `result` and `status` are updated as if you'd made a real call, but no transaction is ever signed or broadcast.

```tsx
const { query, result } = useSorobanContract(contractId, {
  method: "get_balance",
  args: [new Address(publicKey).toScVal()],
});

async function handleQuery() {
  const balance = await query();
  console.log("Balance:", balance);
}
```

## Dry-Run Example (Preview a Write)

`dryRun` does exactly the same work as `query` — both call `simulateTransaction` under the hood and parse the retval — but the name reads better at call sites where the *intent* is to preview a would-be write (e.g. estimating gas, validating a form, populating a Confirm screen). Pick the name that best describes what your UI is doing.

```tsx
import { nativeToScVal } from "@stellar/stellar-sdk";
import { useSorobanContract } from "stellar-hooks";

const { dryRun, result } = useSorobanContract(contractId, {
  method: "transfer",
  args: [nativeToScVal(recipientAddr), nativeToScVal(amount)],
  parseResult: (scVal) => /* parse the retval */ null,
});

async function previewTransfer() {
  // No signing, no submission — just a Soroban simulateTransaction.
  const preview = await dryRun();
  if (preview == null) return; // simulation failed; `error` is populated
  console.log("Simulated fee / effects:", preview);
}
```

## Simulation Example

```tsx
const { simulate } = useSorobanContract(contractId, {
  method: "transfer",
  args: [...],
});

const simResponse = await simulate();
console.log("Estimated fee:", simResponse.cost);
```

## Notes

- **Auth Assembly**: The hook calls `rpc.assembleTransaction` internally to handle Soroban auth entries.
- **Freighter Required**: Uses `useFreighter` for signing. Wallet must be connected.
- **Result Parsing**: By default, returns the raw `xdr.ScVal`. Use `parseResult` or `scValToNative` to convert.

## See Also

- [useLedgerEntry](/api/hooks/use-ledger-entry) — Read ledger entries without contract calls
- [useSorobanTokenBalance](/api/hooks/use-soroban-token-balance) — Specialized SAC token balance reader
