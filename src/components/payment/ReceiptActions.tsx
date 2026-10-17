import { useEffect, useState } from 'react';
import { Download, Eye, Mail } from 'lucide-react';
import { downloadBookingReceipt, emailBookingReceipt } from '@/services';
import { errorMessage } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { Button, Modal } from '@/components/ui';

/** Download, preview, or re-email the PDF receipt once a payment exists on the booking. */
export function ReceiptActions({ bookingId }: { bookingId: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState<'pdf' | 'preview' | 'mail' | null>(null);
  const [file, setFile] = useState<{ url: string; filename: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => () => {
    if (file?.url) URL.revokeObjectURL(file.url);
  }, [file?.url]);

  const ensureFile = async () => {
    if (file) return file;
    const { blob, filename } = await downloadBookingReceipt(bookingId);
    const next = { url: URL.createObjectURL(blob), filename };
    setFile(next);
    return next;
  };

  const download = async () => {
    setBusy('pdf');
    try {
      const pdf = await ensureFile();
      const a = document.createElement('a');
      a.href = pdf.url;
      a.download = pdf.filename;
      a.click();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const openPreview = async () => {
    if (file) {
      setShowPreview(true);
      return;
    }
    setBusy('preview');
    try {
      await ensureFile();
      setShowPreview(true);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    setBusy('mail');
    try {
      const { sentTo } = await emailBookingReceipt(bookingId);
      toast.success(`Receipt sent to ${sentTo}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" loading={busy === 'preview'} disabled={!!busy} onClick={openPreview}>
        <Eye className="h-4 w-4" aria-hidden />Preview receipt
      </Button>
      <Button variant="secondary" size="sm" loading={busy === 'pdf'} disabled={!!busy} onClick={download}>
        <Download className="h-4 w-4" aria-hidden />Download
      </Button>
      <Button variant="ghost" size="sm" loading={busy === 'mail'} disabled={!!busy} onClick={send}>
        <Mail className="h-4 w-4" aria-hidden />Email receipt
      </Button>
      <Modal
        open={showPreview && !!file}
        onClose={() => setShowPreview(false)}
        title={file?.filename ? `Receipt ${file.filename.replace(/\.pdf$/i, '')}` : 'Receipt'}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPreview(false)}>Close</Button>
            <Button onClick={download} loading={busy === 'pdf'} disabled={!!busy}>
              <Download className="h-4 w-4" aria-hidden />Download
            </Button>
          </>
        }
      >
        {file && (
          <iframe
            title="Receipt preview"
            src={file.url}
            className="-mx-1 h-[70vh] w-full rounded-xl border border-slate-200 bg-slate-50"
          />
        )}
      </Modal>
    </div>
  );
}
