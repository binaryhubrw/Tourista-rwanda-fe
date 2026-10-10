import { useState } from 'react';
import { Plus, Map, CalendarClock, CalendarDays, MapPin } from 'lucide-react';
import type { Itinerary } from '@/types';
import { deleteItinerary, getItineraries } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ItineraryCard } from '@/components/cards';
import { ButtonLink, ConfirmModal, EmptyState, ErrorState, Loading } from '@/components/ui';
import { PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { daysBetween, formatDate, todayIso } from '@/utils/format';

export default function MyItinerariesPage() {
  useDocumentTitle('My itineraries');
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(() => getItineraries(user!.id), [user?.id]);
  const [target, setTarget] = useState<Itinerary | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmDelete = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await deleteItinerary(target.id);
      setData((list) => list?.filter((i) => i.id !== target.id));
      toast.success(`“${target.title}” deleted.`);
      setTarget(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <Loading />;

  const list = data ?? [];
  const today = todayIso();
  const upcoming = list.filter((i) => i.startDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const days = list.reduce((s, i) => s + daysBetween(i.startDate, i.endDate), 0);
  const places = new Set(list.flatMap((i) => i.stops.map((s) => s.locationId)));

  return (
    <>
      <PageHeader title="Itineraries" intro="Open a trip to edit stops, dates and notes." action={<ButtonLink to="/itinerary"><Plus className="h-4 w-4" aria-hidden />New itinerary</ButtonLink>} />

      <StatGrid>
        <StatCard label="Trips planned" icon={Map} value={list.length} />
        <StatCard label="Upcoming trips" icon={CalendarClock} tone="teal" value={upcoming.length} hint={upcoming[0] ? `${upcoming[0].title} starts ${formatDate(upcoming[0].startDate)}` : 'No trips scheduled'} />
        <StatCard label="Days planned" icon={CalendarDays} tone="violet" value={days} hint="Across all itineraries" />
        <StatCard label="Destinations covered" icon={MapPin} tone="amber" value={places.size} hint="Unique places in your trips" />
      </StatGrid>

      <div className="mt-6">
        {!list.length ? (
          <EmptyState title="No itineraries yet" message="Plan your first trip: pick destinations and arrange them day by day." action={<ButtonLink to="/itinerary">Build an itinerary</ButtonLink>} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">{list.map((i) => <ItineraryCard key={i.id} itinerary={i} onDelete={setTarget} />)}</div>
        )}
      </div>
      <ConfirmModal open={!!target} title="Delete this itinerary?" message={`“${target?.title}” will be permanently removed. This can't be undone.`} confirmLabel="Delete itinerary" loading={busy} onConfirm={confirmDelete} onCancel={() => setTarget(null)} />
    </>
  );
}
