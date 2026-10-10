import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError } from '@/types';

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
}

/** Runs an async loader on mount (and whenever deps change) with loading/error tracking. */
export function useAsync<T>(loader: () => Promise<T>, deps: React.DependencyList = []): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loaderRef.current()
      .then((d) => active && setData(d))
      .catch((e: ApiError) => active && setError(e?.message ?? 'Something went wrong. Please try again.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload, setData };
}

export const errorMessage = (e: unknown) =>
  (e as ApiError)?.message ?? 'Something went wrong. Please try again.';
