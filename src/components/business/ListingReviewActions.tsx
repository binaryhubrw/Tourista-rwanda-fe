import { useState } from 'react';
import { approveBusiness, rejectBusiness } from '@/services';
import { errorMessage } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { Button, Modal, Textarea } from '@/components/ui';
import { listingApproval } from '@/utils/approval';
import type { Business } from '@/types';

/** Admin approve / reject for a listing that is waiting or was sent back. */
export function ListingReviewActions({ listing, onUpdated, className }: { listing: Business; onUpdated: (next: Business) => void; className?: string }) {
  const toast = useToast();
  const status = listingApproval(listing);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const canApprove = status !== 'approved';
  const canReject = status !== 'rejected';
  if (!canApprove && !canReject) return null;

  const run = async (fn: () => Promise<Business>, ok: string) => {
    setBusy(true);
    try {
      const next = await fn();
      onUpdated(next);
      toast.success(ok);
      setRejecting(false);
      setReason('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {canApprove && <Button size="sm" loading={busy} onClick={() => run(() => approveBusiness(listing.id), `${listing.name} is live.`)}>Approve</Button>}
        {canReject && <Button size="sm" variant="danger" disabled={busy} onClick={() => setRejecting(true)}>Reject</Button>}
      </div>
      <Modal open={rejecting} onClose={() => setRejecting(false)} title={`Reject ${listing.name}`} footer={
        <>
          <Button variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
          <Button variant="danger" loading={busy} disabled={reason.trim().length < 5} onClick={() => run(() => rejectBusiness(listing.id, reason.trim()), `${listing.name} was sent back to the owner.`)}>Send back</Button>
        </>
      }>
        <p className="mb-3 text-sm text-slate-600">The owner will see this reason and can edit the listing to send it back for review.</p>
        <Textarea label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={500} placeholder="What should they change?" />
      </Modal>
    </div>
  );
}
