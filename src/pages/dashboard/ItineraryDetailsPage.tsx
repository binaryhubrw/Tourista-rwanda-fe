import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, MapPin, Pencil, Trash2 } from 'lucide-react';
import { deleteItinerary, getItineraryById } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button, ButtonLink, ConfirmModal, ErrorState, Loading, SmartImage } from '@/components/ui';
import { PageHeader } from '@/components/dashboard';
import { ItineraryTimeline } from '@/components/itinerary/ItineraryTimeline';
import { daysBetween, formatDate, todayIso } from '@/utils/format';

export default function ItineraryDetailsPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: trip, loading, error, reload } = useAsync(async () => {
    const itinerary = await getItineraryById(id);
    if (!user || itinerary.userId !== user.id) throw { message: 'Itinerary was not found.', status: 404 };
    return itinerary;
  }, [id, user?.id]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useDocumentTitle(trip?.title ?? 'Itinerary');

  if (loading) return <Loading label="Loading itinerary" />;
  if (error || !trip) return <ErrorState message={error ?? 'Itinerary was not found.'} onRetry={reload} />;

  const days = daysBetween(trip.startDate, trip.endDate);
  const upcoming = trip.endDate >= todayIso();
  const cover = trip.stops[0]?.image;

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteItinerary(trip.id);
      toast.success(`“${trip.title}” deleted.`);
      navigate('/dashboard/itineraries', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Link to="/dashboard/itineraries" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />All itineraries</Link>
      <PageHeader
        title={trip.title}
        intro={trip.description || 'Your day-by-day plan.'}
        action={(
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={`/itinerary/${trip.id}`}><Pencil className="h-4 w-4" aria-hidden />Edit itinerary</ButtonLink>
            <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" aria-hidden />Delete</Button>
          </div>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          {cover && <SmartImage src={cover} alt="" className="mb-5 aspect-[16/7] w-full rounded-2xl" />}
          <h2 className="font-display text-xl font-bold text-ink">Day by day</h2>
          {trip.stops.length ? (
            <div className="mt-4">
              <ItineraryTimeline stops={trip.stops} startDate={trip.startDate} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">This trip has no stops yet. Edit it to add destinations.</p>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-display text-xl font-bold text-ink">Trip details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="inline-flex items-center gap-1.5 text-slate-500"><CalendarDays className="h-4 w-4 text-brand-600" aria-hidden />Dates</dt>
                <dd className="text-right font-semibold text-ink">{formatDate(trip.startDate)} → {formatDate(trip.endDate)}</dd>
              </div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Length</dt><dd className="font-semibold text-ink">{days ? `${days} day${days === 1 ? '' : 's'}` : '—'}</dd></div>
              <div className="flex justify-between gap-4">
                <dt className="inline-flex items-center gap-1.5 text-slate-500"><MapPin className="h-4 w-4 text-brand-600" aria-hidden />Stops</dt>
                <dd className="font-semibold text-ink">{trip.stops.length}</dd>
              </div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd className="font-semibold text-ink">{upcoming ? 'Upcoming' : 'Past'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Updated</dt><dd className="font-semibold text-ink">{formatDate(trip.updatedAt)}</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete this itinerary?"
        message={`“${trip.title}” and all of its stops will be permanently removed. This can't be undone.`}
        confirmLabel="Delete itinerary"
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
