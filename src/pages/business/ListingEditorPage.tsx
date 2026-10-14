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
import { listingApproval } from '@/utils/approval';

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
  useDocumentTitle(creating ? 'Add branch' : listing ? `Edit ${listing.name}` : 'Edit branch');

  const back = () => navigate('/business-dashboard/business');

  const submit = async (input: BusinessInput) => {
    setSaving(true);
    try {
      if (creating) {
        const created = await createBusiness(input);
        toast.success(listingApproval(created) === 'pending' ? `${created.name} was sent for review. Travellers will see it once an admin approves it.` : `${created.name} is now a branch.`);
      } else if (listing) {
        const updated = await updateBusiness(listing.id, input);
        toast.success(listingApproval(listing) === 'rejected' || listingApproval(updated) === 'pending' ? 'Changes sent for review.' : 'Branch updated.');
      }
      back();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (creating && user?.role === 'staff') {
    return (
      <>
        <ButtonLink to="/business-dashboard/business" variant="ghost" className="mb-3 -ml-2 w-fit"><ChevronLeft className="h-4 w-4" aria-hidden />Back to branches</ButtonLink>
        <ErrorState message="Only the business owner can add a branch. You can edit the branches assigned to you." onRetry={back} />
      </>
    );
  }

  if (biz.loading || locations.loading) return <Loading />;
  if (biz.error || locations.error) return <ErrorState message={biz.error ?? locations.error ?? undefined} onRetry={() => { biz.reload(); locations.reload(); }} />;
  if (!creating && !listing) return <ErrorState message="That branch was not found." onRetry={back} />;

  return (
    <>
      <ButtonLink to="/business-dashboard/business" variant="ghost" className="mb-3 -ml-2 w-fit"><ChevronLeft className="h-4 w-4" aria-hidden />Back to branches</ButtonLink>
      <PageHeader
        title={creating ? 'Add a branch' : `Edit ${listing!.name}`}
        intro={creating
          ? 'Choose the kind of branch first. The questions below follow what you choose. New branches wait for admin approval before travellers can see them.'
          : listingApproval(listing!) === 'rejected'
            ? `This branch was sent back${listing!.rejectionReason ? `: ${listing!.rejectionReason}` : '.'} Save your changes to send it for review again.`
            : 'Change what travellers see, then save.'}
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
          cancelLabel="Back to branches"
          submitLabel={creating ? 'Submit for review' : listingApproval(listing!) === 'rejected' ? 'Resubmit for review' : 'Save changes'}
        />
      </div>
    </>
  );
}
