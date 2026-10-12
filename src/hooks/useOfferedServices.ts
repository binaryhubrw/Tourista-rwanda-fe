import { useEffect, useMemo } from 'react';
import { getBusinesses } from '@/services';
import { CATALOG_EVENT, offeredServices } from '@/utils/explore';
import { useAsync } from './useAsync';

const EVENTS = [CATALOG_EVENT] as const;

/** Live extras from every branch — refreshes when a listing is saved, the tab is focused, or the menu opens. */
export function useOfferedServices() {
  const listings = useAsync(getBusinesses);

  useEffect(() => {
    const reload = () => listings.reload();
    EVENTS.forEach((name) => window.addEventListener(name, reload));
    window.addEventListener('focus', reload);
    const onVis = () => {
      if (!document.hidden) reload();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      EVENTS.forEach((name) => window.removeEventListener(name, reload));
      window.removeEventListener('focus', reload);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [listings.reload]);

  const options = useMemo(() => offeredServices(listings.data ?? []), [listings.data]);
  return { options, refresh: listings.reload, loading: listings.loading };
}
