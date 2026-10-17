import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export type ViewerMode = 'business' | 'traveller';

/** True when the current URL asks for the traveller side (`?view=traveller` or `?viewer=traveller`). */
export function isTravellerQuery(params: URLSearchParams) {
  return params.get('view') === 'traveller' || params.get('viewer') === 'traveller';
}

/** The signed-in user is a business owner or staff member. */
export function isHostRole(role?: string) {
  return role === 'business_owner' || role === 'staff';
}

/**
 * Business owners and staff can open their own dashboard as travellers. The mode
 * lives in the URL (`?viewer=traveller`, or `?view=traveller`) so it survives
 * refreshes and the detail pages know which face of a booking to render.
 */
export function useViewerMode() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const isHost = isHostRole(user?.role);
  const requested = isTravellerQuery(params);
  const asTraveller = user?.role === 'tourist' || (isHost && requested);

  const setTraveller = useCallback(
    (on: boolean) => {
      const next = new URLSearchParams(params);
      next.delete('view');
      next.delete('viewer');
      if (on) next.set('viewer', 'traveller');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  return { isHost, asTraveller, view: (isHost && requested ? 'traveller' : 'business') as ViewerMode, setTraveller };
}
