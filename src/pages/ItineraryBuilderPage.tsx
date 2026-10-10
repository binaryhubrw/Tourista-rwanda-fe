import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Search, Save, Pencil, Trash2, CalendarDays, MapPin, Route, X } from 'lucide-react';
import type { Itinerary, ItineraryStop, Location } from '@/types';
import { createItinerary, deleteItinerary, getItineraries, getItineraryById, getLocations, updateItinerary } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ItineraryTimeline, renumber } from '@/components/itinerary/ItineraryTimeline';
import { ItineraryCard } from '@/components/cards';
import { Button, ConfirmModal, Container, EmptyState, ErrorState, Input, Loading, PageHeader, SmartImage, Textarea, fieldClass } from '@/components/ui';
import { daysBetween, formatDate } from '@/utils/format';
import { makeId } from '@/utils/id';
import NotFoundPage from './NotFoundPage';

interface Draft { title: string; description: string; startDate: string; endDate: string; stops: ItineraryStop[] }
type Errors = Partial<Record<'title' | 'startDate' | 'endDate' | 'stops', string>>;

const DRAFT_KEY = 'tourista.itineraryDraft';
const emptyDraft: Draft = { title: '', description: '', startDate: '', endDate: '', stops: [] };

const loadDraft = (): Draft => {
  try { return { ...emptyDraft, ...JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') }; } catch { return emptyDraft; }
};

function validate(d: Draft): Errors {
  const e: Errors = {};
  if (!d.title.trim()) e.title = 'Give your trip a title.';
  if (!d.startDate) e.startDate = 'Choose a start date.';
  if (!d.endDate) e.endDate = 'Choose an end date.';
  else if (d.startDate && d.endDate < d.startDate) e.endDate = 'The end date must be on or after the start date.';
  if (!d.stops.length) e.stops = 'Add at least one location to your itinerary.';
  return e;
}

export default function ItineraryBuilderPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();

  const locations = useAsync(getLocations);
  const existing = useAsync<Itinerary | null>(() => (id ? getItineraryById(id) : Promise.resolve(null)), [id]);
  const mine = useAsync(() => (user && isNew ? getItineraries(user.id) : Promise.resolve([])), [user?.id, isNew]);

  const [draft, setDraft] = useState<Draft>(() => (isNew ? loadDraft() : emptyDraft));
  const [mode, setMode] = useState<'view' | 'edit'>(isNew ? 'edit' : 'view');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Itinerary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  useDocumentTitle(isNew ? 'Itinerary builder' : existing.data?.title);

  // Load existing itinerary into the form.
  useEffect(() => {
    if (existing.data) {
      const { title, description, startDate, endDate, stops } = existing.data;
      setDraft({ title, description, startDate, endDate, stops });
    }
  }, [existing.data]);

  // Persist new-itinerary drafts so nothing is lost on login redirect or refresh.
  useEffect(() => {
    if (isNew) try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
  }, [draft, isNew]);

  const addStop = (loc: Location) => {
    setDraft((d) => ({ ...d, stops: renumber([...d.stops, { id: makeId('stop'), locationId: loc.id, locationName: loc.name, image: loc.image, day: d.stops.length + 1 }]) }));
    setErrors((e) => ({ ...e, stops: undefined }));
    setMode('edit');
  };

  // Support "Add to itinerary" links: /itinerary?add=<locationId>
  const addParam = params.get('add');
  useEffect(() => {
    if (!addParam || !locations.data || (!isNew && !existing.data)) return;
    const loc = locations.data.find((l) => l.id === addParam);
    if (loc) {
      addStop(loc);
      toast.success(`${loc.name} added to your itinerary.`);
    }
    const next = new URLSearchParams(params);
    next.delete('add');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addParam, locations.data, existing.data]);

  const pickerResults = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return (locations.data ?? []).filter((l) => !q || `${l.name} ${l.district} ${l.category}`.toLowerCase().includes(q)).slice(0, q ? 20 : 8);
  }, [locations.data, pickerQuery]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const save = async () => {
    const e = validate(draft);
    setErrors(e);
    if (Object.keys(e).length) return toast.error('Check the highlighted fields before saving.');
    if (!user) {
      toast.info('Log in to save your itinerary. Your draft is kept.');
      return navigate('/login', { state: { from: '/itinerary' } });
    }
    setSaving(true);
    try {
      const payload = { ...draft, title: draft.title.trim(), description: draft.description.trim(), userId: user.id };
      if (isNew) {
        const created = await createItinerary(payload);
        localStorage.removeItem(DRAFT_KEY);
        toast.success('Itinerary saved successfully.');
        navigate(`/itinerary/${created.id}`, { replace: true });
      } else {
        const updated = await updateItinerary(id!, payload);
        existing.setData(updated);
        setMode('view');
        toast.success('Itinerary updated.');
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteItinerary(confirmDelete.id);
      toast.success(`“${confirmDelete.title}” deleted.`);
      if (isNew) mine.setData((list) => list?.filter((i) => i.id !== confirmDelete.id));
      else navigate('/dashboard/itineraries');
      setConfirmDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const cancelEdit = () => {
    if (existing.data) {
      const { title, description, startDate, endDate, stops } = existing.data;
      setDraft({ title, description, startDate, endDate, stops });
    }
    setErrors({});
    setMode('view');
  };

  if (!isNew && existing.loading) return <Loading label="Loading itinerary" />;
  if (!isNew && existing.error?.includes('not found')) return <NotFoundPage what="itinerary" />;
  if (!isNew && existing.error) return <Container className="py-16"><ErrorState message={existing.error} onRetry={existing.reload} /></Container>;
  if (!isNew && existing.data && user && existing.data.userId !== user.id) return <NotFoundPage what="itinerary" />;

  const days = daysBetween(draft.startDate, draft.endDate);
  const editing = mode === 'edit';

  return (
    <>
      <PageHeader
        title={isNew ? 'Build your itinerary' : draft.title || 'Itinerary'}
        intro={isNew ? 'Pick the places you want to see, put them in order and save your trip.' : draft.description}
      >
        {!isNew && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-white">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden />{draft.startDate && formatDate(draft.startDate)} – {draft.endDate && formatDate(draft.endDate)}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden />{draft.stops.length} stops{days ? ` over ${days} days` : ''}</span>
          </div>
        )}
      </PageHeader>

      <Container className="grid gap-8 py-8 lg:grid-cols-[1fr_380px] lg:py-10">
        {/* Timeline + details */}
        <div className="min-w-0 space-y-8">
          {editing && (
            <section aria-labelledby="trip-details" className="rounded-3xl border border-slate-200 p-5 sm:p-6">
              <h2 id="trip-details" className="mb-4 font-display text-xl font-bold text-ink">Trip details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Input label="Trip title" required value={draft.title} onChange={(e) => set('title', e.target.value)} error={errors.title} placeholder="My Rwanda Adventure" maxLength={80} /></div>
                <div className="sm:col-span-2"><Textarea label="Description" value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Who's coming, what you want to see, anything to remember" maxLength={400} /></div>
                <Input label="Start date" type="date" required value={draft.startDate} onChange={(e) => set('startDate', e.target.value)} error={errors.startDate} />
                <Input label="End date" type="date" required min={draft.startDate || undefined} value={draft.endDate} onChange={(e) => set('endDate', e.target.value)} error={errors.endDate} hint={days ? `${days} day${days > 1 ? 's' : ''}` : undefined} />
              </div>
            </section>
          )}

          <section aria-labelledby="timeline">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="timeline" className="font-display text-2xl font-bold text-ink">{draft.title || 'Your trip'}, day by day</h2>
              {days > 0 && draft.stops.length > days && <p className="text-sm font-medium text-brand-600">You have more stops than days. Consider a longer trip.</p>}
            </div>
            {errors.stops && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{errors.stops}</p>}
            {draft.stops.length ? (
              <ItineraryTimeline stops={draft.stops} startDate={draft.startDate} editable={editing} onChange={(stops) => set('stops', stops)} />
            ) : (
              <EmptyState icon={<Route className="h-7 w-7" />} title="No stops yet" message="Add destinations from the list to start your day-by-day plan. Drag stops or use the arrows to reorder them." />
            )}
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
            {!isNew && editing && <Button variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" aria-hidden />Cancel changes</Button>}
            {!isNew && existing.data && <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(existing.data!)}><Trash2 className="h-4 w-4" aria-hidden />Delete itinerary</Button>}
            {isNew && draft.stops.length > 0 && <Button variant="ghost" onClick={() => { setDraft(emptyDraft); setErrors({}); }}>Start over</Button>}
            {editing ? (
              <Button onClick={save} loading={saving} size="lg"><Save className="h-5 w-5" aria-hidden />{isNew ? 'Save itinerary' : 'Save changes'}</Button>
            ) : (
              <Button onClick={() => setMode('edit')} size="lg"><Pencil className="h-5 w-5" aria-hidden />Edit itinerary</Button>
            )}
          </div>
        </div>

        {/* Location picker */}
        <aside aria-labelledby="add-locations" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-5">
              <h2 id="add-locations" className="font-display text-xl font-bold text-ink">Add locations</h2>
              <label className="relative mt-3 block">
                <span className="sr-only">Search locations</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" aria-hidden />
                <input value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)} placeholder="Search destinations" className={`${fieldClass} h-10 rounded-full pl-9 text-sm`} />
              </label>
            </div>
            {locations.loading ? <Loading variant="section" label="Loading places" className="py-8" /> : locations.error ? <div className="p-4"><ErrorState message={locations.error} onRetry={locations.reload} /></div> : (
              <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                {pickerResults.map((l) => {
                  const count = draft.stops.filter((s) => s.locationId === l.id).length;
                  return (
                    <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                      <SmartImage src={l.image} alt="" className="h-12 w-12 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{l.name}</p>
                        <p className="truncate text-sm text-slate-500">{l.category}{count ? `, added ${count}×` : ''}</p>
                      </div>
                      <button onClick={() => addStop(l)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white" aria-label={`Add ${l.name} to itinerary`}>
                        <Plus className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
                {!pickerResults.length && <li className="p-5 text-sm text-slate-500">No destinations match “{pickerQuery}”.</li>}
              </ul>
            )}
          </div>
          {!user && <p className="mt-3 text-sm text-slate-600"><Link to="/login" state={{ from: '/itinerary' }} className="font-semibold text-brand-600 hover:underline">Log in</Link> to save itineraries to your account. Your draft is kept on this device.</p>}
        </aside>
      </Container>

      {isNew && user && (
        <Container className="pb-16">
          <h2 className="mb-4 font-display text-2xl font-bold text-ink">My saved itineraries</h2>
          {mine.loading ? <Loading variant="section" label="Loading itineraries" /> : mine.error ? <ErrorState message={mine.error} onRetry={mine.reload} /> : !mine.data?.length ? (
            <EmptyState title="No saved itineraries yet" message="Your saved trips will appear here." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">{mine.data.map((it) => <ItineraryCard key={it.id} itinerary={it} onDelete={setConfirmDelete} />)}</div>
          )}
        </Container>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete this itinerary?"
        message={`“${confirmDelete?.title}” and all of its stops will be permanently removed. This can't be undone.`}
        confirmLabel="Delete itinerary"
        loading={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
