/**
 * examples/basic-dapp/src/App.tsx
 *
 * Minimal dApp that demonstrates all stellar-hooks in action.
 * Run against testnet — no real funds required.
 *
 * npm install && npm run dev
 */

import React from "react";
import {
  StellarProvider,
  useFreighter,
  useStellarBalance,
  useSorobanContract,
  useTransaction,
} from "stellar-hooks";
import { nativeToScVal } from "@stellar/stellar-sdk";

// Replace with your deployed testnet contract ID
const COUNTER_CONTRACT = "CABC...XYZ";

// ─── Inner components (must be inside <StellarProvider>) ───────────────────────

function WalletSection() {
  const {
    isInstalled,
    isConnected,
    publicKey,
    isLoading,
    error,
    networkPassphraseMismatch,
    networkPassphraseWarning,
    connect,
    disconnect,
  } = useFreighter();

  if (!isInstalled)
    return <p className="warn">Freighter wallet not detected. Install it first.</p>;

  if (!isConnected)
    return (
      <button onClick={connect} disabled={isLoading}>
        {isLoading ? "Connecting…" : "Connect Freighter"}
      </button>
    );

  return (
    <div>
      <p>
        ✅ Connected: <code>{publicKey}</code>
      </p>
      {networkPassphraseMismatch && networkPassphraseWarning && (
        <p className="warn">{networkPassphraseWarning}</p>
      )}
      <button onClick={disconnect}>Disconnect</button>
      {error && <p className="error">{error.message}</p>}
    </div>
  );
}

function BalanceSection({ publicKey }: { publicKey: string }) {
  const { xlmBalance, balances, isLoading, refetch } = useStellarBalance(publicKey, {
    refetchInterval: 10_000,
  });

  return (
    <section>
      <h2>Balances</h2>
      {isLoading && <p>Loading…</p>}
      <p>
        <strong>XLM:</strong> {xlmBalance?.balance ?? "–"}
      </p>
      <ul>
        {balances
          .filter((b) => !b.isNative)
          .map((b, i) => (
            <li key={i}>
              {b.assetCode}/{b.assetIssuer?.slice(0, 8)}… — {b.balance}
            </li>
          ))}
      </ul>
      <button onClick={refetch}>Refresh</button>
    </section>
  );
}

function ContractSection() {
  const { call, status, result, error, reset } = useSorobanContract({
    contractId: COUNTER_CONTRACT,
    method: "increment",
    args: [nativeToScVal(1, { type: "u32" })],
  });

  return (
    <section>
      <h2>Soroban Counter</h2>
      <p>Status: <strong>{status}</strong></p>
      {result != null && <p>Return value: {String(result)}</p>}
      {error && <p className="error">{error.message}</p>}
      <button onClick={() => call()} disabled={status !== "idle" && status !== "error"}>
        Increment
      </button>
      {status !== "idle" && <button onClick={reset}>Reset</button>}
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function Inner() {
  const { isConnected, publicKey } = useFreighter();

  return (
    <main style={{ fontFamily: "monospace", maxWidth: 600, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>stellar-hooks demo</h1>
      <WalletSection />
      {isConnected && publicKey && (
        <>
          <BalanceSection publicKey={publicKey} />
          <ContractSection />
        </>
      )}
    </main>
  );
}

export default function App() {
  return (
    <StellarProvider network="testnet">
      <Inner />
    </StellarProvider>
  );
}
