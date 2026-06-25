import { useCallback, useEffect, useReducer, useRef } from "react";

export interface UseStellarQueryOptions<T> {
  enabled?: boolean;
  refetchInterval?: number;
  deduplicate?: boolean;
  initialData?: T | null;
}

export interface UseStellarQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
}

type QueryAction<T> =
  | { type: "FETCH_START"; hasData: boolean }
  | { type: "FETCH_SUCCESS"; payload: T | null }
  | { type: "FETCH_ERROR"; payload: Error }
  | { type: "RESET"; payload: T | null };

function reducer<T>(state: QueryState<T>, action: QueryAction<T>): QueryState<T> {
  switch (action.type) {
    case "FETCH_START":
      return {
        ...state,
        isLoading: !action.hasData && !state.isRefetching,
        isRefetching: action.hasData,
        error: null,
      };
    case "FETCH_SUCCESS":
      return {
        data: action.payload,
        isLoading: false,
        isRefetching: false,
        error: null,
        lastFetchedAt: new Date(),
      };
    case "FETCH_ERROR":
      return {
        ...state,
        isLoading: false,
        isRefetching: false,
        error: action.payload,
      };
    case "RESET":
      return {
        data: action.payload,
        isLoading: false,
        isRefetching: false,
        error: null,
        lastFetchedAt: null,
      };
    default:
      return state;
  }
}

export function useStellarQuery<T>(
  fetcher: () => Promise<T | null>,
  options: UseStellarQueryOptions<T> = {}
): UseStellarQueryResult<T> {
  const {
    enabled = true,
    refetchInterval = 0,
    deduplicate = true,
    initialData = null,
  } = options;

  const [state, dispatch] = useReducer(reducer<T>, {
    data: initialData,
    isLoading: false,
    isRefetching: false,
    error: null,
    lastFetchedAt: null,
  });

  const stateRef = useRef(state);
  const fetcherRef = useRef(fetcher);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    if (deduplicate && isFetchingRef.current) return;

    isFetchingRef.current = true;
    dispatch({ type: "FETCH_START", hasData: stateRef.current.data !== null });

    try {
      const result = await fetcherRef.current();
      dispatch({ type: "FETCH_SUCCESS", payload: result });
    } catch (err) {
      dispatch({
        type: "FETCH_ERROR",
        payload: err instanceof Error ? err : new Error(String(err)),
      });
    } finally {
      isFetchingRef.current = false;
    }
  }, [enabled, deduplicate]);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: "RESET", payload: initialData });
      return;
    }

    void refetch();

    if (refetchInterval > 0) {
      timerRef.current = setInterval(() => {
        void refetch();
      }, refetchInterval);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, initialData, refetch, refetchInterval]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    isRefetching: state.isRefetching,
    error: state.error,
    lastFetchedAt: state.lastFetchedAt,
    refetch,
  };
}
