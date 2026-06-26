import { useCallback, useMemo, useState } from "react";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { useStellarQuery } from "./useStellarQuery";

export interface UseSequenceNumberOptions {
  enabled?: boolean;
  autoIncrement?: boolean;
}

export interface UseSequenceNumberReturn {
  sequence: string | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useSequenceNumber(
  publicKey: string | null | undefined,
  options: UseSequenceNumberOptions = {}
): UseSequenceNumberReturn {
  const { enabled = true, autoIncrement = false } = options;
  const { config } = useStellarContext();
  const [incrementCount, setIncrementCount] = useState(0);

  const fetcher = useCallback(async () => {
    if (!publicKey) return null;
    const server = getHorizonServer(config.horizonUrl);
    const account = await server.loadAccount(publicKey);
    return account.sequenceNumber();
  }, [publicKey, config.horizonUrl]);

  const state = useStellarQuery<string | null>(fetcher, {
    enabled: enabled && Boolean(publicKey),
    initialData: null,
  });

  const refresh = useCallback(async () => {
    setIncrementCount(0);
    await state.refetch();
  }, [state.refetch]);

  const sequence = useMemo(() => {
    if (!state.data) return null;
    if (!autoIncrement || incrementCount === 0) return state.data;
    return (BigInt(state.data) + BigInt(incrementCount)).toString();
  }, [state.data, autoIncrement, incrementCount]);

  const wrappedRefresh = useCallback(async () => {
    if (autoIncrement && state.data) {
      setIncrementCount((c) => c + 1);
      return;
    }
    await refresh();
  }, [autoIncrement, state.data, refresh]);

  return {
    sequence,
    isLoading: state.isLoading,
    error: state.error,
    refresh: wrappedRefresh,
  };
}
