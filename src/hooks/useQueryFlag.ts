import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/** A boolean kept in the URL (e.g. ?new=1), so links can open a page with a dialog already showing. */
export function useQueryFlag(name: string): [boolean, (on: boolean) => void] {
  const [params, setParams] = useSearchParams();
  const on = params.get(name) === '1';
  const set = useCallback(
    (value: boolean) =>
      setParams((p) => {
        const next = new URLSearchParams(p);
        if (value) next.set(name, '1');
        else next.delete(name);
        return next;
      }, { replace: true }),
    [name, setParams],
  );
  return [on, set];
}
