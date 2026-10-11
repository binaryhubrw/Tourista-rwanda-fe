import { Navigate, useSearchParams } from 'react-router-dom';

/** Older /search links land on the catalog so people stay in one browse flow. */
export default function SearchPage() {
  const [params] = useSearchParams();
  const next = new URLSearchParams();
  const q = params.get('q');
  const scope = params.get('scope');
  if (q) next.set('q', q);
  if (scope && ['accommodations', 'restaurants', 'businesses', 'hotels', 'food', 'vehicles', 'services', 'cars'].includes(scope)) next.set('scope', scope);
  const query = next.toString();
  return <Navigate to={query ? `/explore?${query}#explore-listings` : '/explore'} replace />;
}
