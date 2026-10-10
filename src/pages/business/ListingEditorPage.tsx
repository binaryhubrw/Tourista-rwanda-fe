import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { createBusiness, getLocations, updateBusiness } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/dashboard';
import { ButtonLink, ErrorState, Loading } from '@/components/ui';
import { BusinessForm } from './BusinessForm';
import { useOwnerBusinesses } from './useOwnerBusinesses';
import type { BusinessInput } from '@/services/businessService';

export default function ListingEditorPage() {
  const { id } = useParams();
  const creating = !id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const biz = useOwnerBusinesses();
  const locations = useAsync(getLocations);
  const listing = biz.data?.find((item) => item.id === id);
  const [saving, setSaving] = useState(false);
  useDocumentTitle(creating ? 'Add listing' : listing ? `Edit ${listing.name}` : 'Edit listing');

  const back = () => navigate('/business-dashboard/business');

  const submit = async (input: BusinessInput) => {
    setSaving(true);
    try {
      if (creating) {
        const created = await createBusiness(input);
        toast.success(`${created.name} is now listed.`);
      } else if (listing) {
        await updateBusiness(listing.id, input);
        toast.success('Listing updated.');
      }
      back();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (biz.loading || locations.loading) return <LoadingSpinner />;
  if (biz.error || locations.error) return <ErrorState message={biz.error ?? locations.error ?? undefined} onRetry={() => { biz.reload(); locations.reload(); }} />;
  if (!creating && !listing) return <ErrorState message="That listing was not found." onRetry={back} />;

  return (
    <>
      <ButtonLink to="/business-dashboard/business" variant="ghost" className="mb-3 -ml-2 w-fit"><ChevronLeft className="h-4 w-4" aria-hidden />Back to listings</ButtonLink>
      <PageHeader
        title={creating ? 'Add a listing' : `Edit ${listing!.name}`}
        intro={creating ? 'Choose the kind of listing first. The questions below follow what you choose.' : 'Change what travellers see, then save.'}
      />
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-7">
        <BusinessForm
          initial={creating ? undefined : listing}
          locations={locations.data!}
          ownerId={user!.id}
          ownerName={user!.name}
          submitting={saving}
          onSubmit={submit}
          onCancel={back}
          cancelLabel="Back to listings"
          submitLabel={creating ? 'Publish listing' : 'Save changes'}
        />
      </div>
    </>
  );
}
