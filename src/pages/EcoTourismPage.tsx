import { Recycle, Zap, HeartHandshake, Trees, Store, Bus, Bike, Footprints, Car, Leaf, Droplets } from 'lucide-react';
import { getBusinesses } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { BusinessCard } from '@/components/cards';
import { CardSkeletonGrid, Container, ErrorState, HillLines, SectionHeader } from '@/components/ui';

const principles = [
  { icon: Recycle, title: 'Reduce waste', text: 'Plastic bags have been banned since 2008 and bags are checked at the airport. Carry a refillable bottle; most lodges have filtered water stations.' },
  { icon: Zap, title: 'Save energy', text: 'Switch off lights and air conditioning when you leave your room, and reuse towels. Many rural lodges run on limited solar power.' },
  { icon: HeartHandshake, title: 'Respect local culture', text: 'Greet people with “Muraho”, ask before photographing anyone, dress modestly at memorials and churches, and keep the Umuganda morning free.' },
  { icon: Trees, title: 'Protect nature', text: 'Stay on trails, keep seven metres from gorillas, never feed wildlife, and wear a mask during treks to protect primates from human illness.' },
  { icon: Store, title: 'Support local businesses', text: 'Hire community guides and porters, eat at family-run restaurants and buy crafts straight from cooperatives so your money stays in Rwanda.' },
];

const transport = [
  { icon: Bus, title: 'Intercity express buses', text: 'Frequent, affordable coaches link Kigali with Musanze, Rubavu, Huye and Rusizi from Nyabugogo bus park.' },
  { icon: Bike, title: 'Cycling', text: 'Ride the Congo Nile Trail along Lake Kivu or rent bikes in Musanze for the twin lakes.' },
  { icon: Footprints, title: 'Walking tours', text: 'Kigali neighbourhoods like Nyamirambo and Kimihurura are best seen on foot with a local guide.' },
  { icon: Car, title: 'Shared and electric rides', text: 'Share a private driver with other travellers, and look for electric moto-taxis now operating in Kigali.' },
];

const conservation = [
  { stat: '10%', text: 'of national park revenue is shared with neighbouring communities for schools, clinics and water projects.' },
  { stat: '2015 & 2017', text: 'Lions and then black rhinos were reintroduced to Akagera, restoring a Big Five park.' },
  { stat: 'Gishwati-Mukura', text: 'Rwanda’s newest national park, created from a forest that communities helped restore.' },
];

export default function EcoTourismPage() {
  useDocumentTitle('Eco-Tourism');
  const stays = useAsync(async () => (await (getBusinesses())).filter((b) => b.category === 'Accommodation' || b.badges.includes('Eco-certified')).slice(0, 6));

  return (
    <>
      <header className="relative overflow-hidden bg-brand-600 text-white">
        <HillLines className="absolute inset-0 h-full w-full text-white/15" lines={12} />
        <Container className="relative py-16 sm:py-24">
          <Leaf className="h-10 w-10 text-white" aria-hidden />
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold tracking-tight sm:text-6xl">Travel lightly in the land of a thousand hills</h1>
          <p className="mt-4 max-w-2xl text-lg text-white">Rwanda has built its tourism around conservation and community. Here's how to make sure your trip adds to that rather than takes from it.</p>
        </Container>
      </header>

      <section id="responsible-travel" className="scroll-mt-24 py-16 sm:py-20">
        <Container>
          <SectionHeader title="Responsible travel" intro="Five habits that make a real difference while you're here." />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-3xl border border-slate-200 p-6">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white"><Icon className="h-6 w-6" aria-hidden /></div>
                <h3 className="mt-4 font-display text-xl font-bold text-ink">{title}</h3>
                <p className="mt-2 text-slate-600">{text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="bg-brand-50 py-16 sm:py-20" aria-labelledby="eco-stays">
        <Container>
          <SectionHeader title="Eco-friendly accommodation" intro="Lodges and guesthouses that use solar power, harvest rainwater, grow their own food and hire locally." />
          {stays.loading ? <CardSkeletonGrid count={3} /> : stays.error ? <ErrorState message={stays.error} onRetry={stays.reload} /> : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{stays.data?.map((b) => <BusinessCard key={b.id} business={b} />)}</div>
          )}
        </Container>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="transport">
        <Container>
          <SectionHeader title="Sustainable transportation" intro="Rwanda's distances are short, so lower-impact options are often the most enjoyable too." />
          <ul className="grid gap-5 sm:grid-cols-2">
            {transport.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 rounded-3xl border border-slate-200 p-6">
                <Icon className="h-8 w-8 shrink-0 text-brand-600" aria-hidden />
                <div><h3 className="font-display text-lg font-bold text-ink">{title}</h3><p className="mt-1 text-slate-600">{text}</p></div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section id="conservation" className="scroll-mt-24 bg-brand-600 py-16 text-white sm:py-20">
        <Container>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Conservation</h2>
          <p className="mt-3 max-w-2xl text-lg text-white">Tourism pays for the rangers, trackers and restoration that protect Rwanda's forests, wetlands and wildlife. When you buy a park permit, part of it funds the villages that share their land with gorillas and chimpanzees.</p>
          <dl className="mt-10 grid gap-8 md:grid-cols-3">
            {conservation.map((c) => (
              <div key={c.stat} className="border-t border-white/25 pt-5">
                <dt className="font-display text-3xl font-extrabold">{c.stat}</dt>
                <dd className="mt-2 text-white">{c.text}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex items-start gap-3 rounded-2xl bg-white/10 p-5">
            <Droplets className="h-6 w-6 shrink-0 text-white" aria-hidden />
            <p className="text-white">Nyungwe's rainforest feeds rivers that supply much of the country's water. Protecting it protects every community downstream.</p>
          </div>
        </Container>
      </section>
    </>
  );
}
