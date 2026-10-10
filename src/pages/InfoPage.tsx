import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/context/ToastContext';
import { Button, Container, Input, PageHeader, Textarea } from '@/components/ui';

const pages: Record<string, { title: string; intro: string; body: string[] }> = {
  about: { title: 'About Tourista Rwanda', intro: 'A digital platform for sustainable and inclusive tourism.', body: [
    'Tourista Rwanda helps domestic and international travellers discover destinations, hidden gems, cultural experiences, eco-friendly stays and local businesses across all five provinces.',
    'We give local guides, artisans, women-led enterprises and community tourism projects a place to list their services and receive bookings directly, so more of every visit stays with the people who make it special.',
    'For platform admins, anonymised activity on the platform shows trends, high-traffic locations and traveller interests to support data-driven planning.',
  ] },
  help: { title: 'Help', intro: 'Answers to common questions.', body: [
    'Saving trips: build an itinerary, then log in to save it to your account. Drafts are kept on your device until you do.',
    'Bookings: requests start as Pending until the business confirms. You can cancel a pending or confirmed booking from your dashboard.',
    'Listing a business: sign up with the Business Owner role, then add your business and services from the business dashboard.',
  ] },
  privacy: { title: 'Privacy', intro: 'How we handle your information.', body: [
    'We collect the details you give us (name, email, bookings, reviews) to run your account and connect you with businesses you book.',
    'Booking details are shared only with the business you book. Analytics shown to admins are aggregated and anonymised.',
    'You can update or delete your account information at any time from your profile settings.',
  ] },
  terms: { title: 'Terms of use', intro: 'The basics of using Tourista Rwanda.', body: [
    'Reviews must describe your own experience and respect the people and places involved. We remove reviews that are abusive or misleading.',
    'Businesses are responsible for the accuracy of their listings, prices and availability. Payments are arranged directly with each business.',
    'Park permits and protected-area rules are set by the Rwanda Development Board and apply to all visitors.',
  ] },
};

function ContactForm() {
  const toast = useToast();
  const [sending, setSending] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSending(true);
        await new Promise((r) => setTimeout(r, 600));
        setSending(false);
        (e.target as HTMLFormElement).reset();
        toast.success('Message sent. We reply within two working days.');
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" required name="name" />
        <Input label="Email" type="email" required name="email" />
      </div>
      <Textarea label="Message" required name="message" minLength={10} />
      <Button type="submit" loading={sending}>Send message</Button>
    </form>
  );
}

export default function InfoPage() {
  const slug = useLocation().pathname.slice(1);
  if (slug === 'contact') return <ContactPage />;
  const page = pages[slug] ?? pages.about;
  return <InfoContent title={page.title} intro={page.intro} body={page.body} />;
}

function InfoContent({ title, intro, body }: { title: string; intro: string; body: string[] }) {
  useDocumentTitle(title);
  return (
    <>
      <PageHeader title={title} intro={intro} />
      <Container className="py-12">
        <div className="max-w-prose space-y-5 text-lg leading-relaxed text-slate-700">{body.map((p) => <p key={p}>{p}</p>)}</div>
      </Container>
    </>
  );
}

function ContactPage() {
  useDocumentTitle('Contact');
  return (
    <>
      <PageHeader title="Contact us" intro="Questions about a booking, a listing or a partnership? Write to us." />
      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_320px]">
        <ContactForm />
        <ul className="space-y-4 text-slate-700">
          <li className="flex gap-3"><MapPin className="h-5 w-5 text-brand-600" aria-hidden />KG 7 Ave, Kigali, Rwanda</li>
          <li className="flex gap-3"><Phone className="h-5 w-5 text-brand-600" aria-hidden />+250 788 000 000</li>
          <li className="flex gap-3"><Mail className="h-5 w-5 text-brand-600" aria-hidden />hello@tourista.rw</li>
        </ul>
      </Container>
    </>
  );
}
