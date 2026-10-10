import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Map as MapIcon, Route } from 'lucide-react';
import { getLocations } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { SearchBar } from '@/components/layout/SearchBar';
import { ExploreBrowser } from '@/components/ExploreBrowser';
import { ButtonLink, Container, SectionHeader, SmartImage, buttonClass } from '@/components/ui';
import { RwandaMap, type MapPoint } from '@/components/map/RwandaMap';
import { heroSlides } from '@/data/images';
import { cn } from '@/utils/cn';

function HeroBackdrop({ index, reduceMotion }: { index: number; reduceMotion: boolean }) {
  return (
    <div className="absolute inset-0 -z-10" aria-hidden>
      {heroSlides.map((slide, i) => (
        <SmartImage
          key={slide.place}
          src={slide.src}
          alt=""
          quiet
          loading={i === 0 ? 'eager' : 'lazy'}
          style={{ objectPosition: slide.position }}
          className={cn('absolute inset-0 h-full w-full', reduceMotion ? '' : 'transition-opacity duration-1000', i === index ? 'opacity-100' : 'opacity-0')}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-600/55 via-brand-600/30 to-brand-600/15" />
    </div>
  );
}

export default function HomePage() {
  useDocumentTitle();
  const locations = useAsync(getLocations);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % heroSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion]);

  const mapPoints: MapPoint[] = (locations.data ?? []).map((l) => ({ id: l.id, name: l.name, coordinates: l.coordinates, kind: l.category === 'Cultural Site' ? 'cultural' : 'attraction' }));

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-brand-600" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <HeroBackdrop index={slide} reduceMotion={reduceMotion} />
        <Container className="pb-28 pt-16 sm:pb-36 sm:pt-24 lg:pt-28">
          <div className="max-w-3xl text-white">
            <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Discover Rwanda. Experience More. Travel Responsibly.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white sm:text-xl">
              Explore Rwanda's hidden gems, cultural experiences, natural attractions, local businesses, and sustainable tourism opportunities.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/explore" variant="light" size="lg">Explore Rwanda</ButtonLink>
              <Link to="/itinerary" className={buttonClass('outlineLight', 'lg')}>
                <Route className="h-5 w-5" aria-hidden /> Build Your Itinerary
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <p className="text-sm font-semibold" aria-live="polite">{heroSlides[slide].place}</p>
              <div className="flex gap-2" role="tablist" aria-label="Featured places">
                {heroSlides.map((item, i) => (
                  <button
                    key={item.place}
                    type="button"
                    role="tab"
                    aria-selected={i === slide}
                    aria-label={item.place}
                    onClick={() => setSlide(i)}
                    className={cn('h-2.5 rounded-full transition-all', i === slide ? 'w-8 bg-white' : 'w-2.5 bg-white/55 hover:bg-white/80')}
                  />
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Floating search */}
      <Container className="relative z-20 -mt-12 sm:-mt-10">
        <div className="mx-auto max-w-4xl">
          <SearchBar variant="hero" />
          <p className="mt-3 text-center text-sm text-slate-500">Try “gorillas”, “coffee”, “Lake Kivu” or “women-led”</p>
        </div>
      </Container>

      {/* Explore destinations, hidden gems, experiences and local businesses */}
      <section className="py-16 sm:py-20" aria-labelledby="explore">
        <Container>
          <SectionHeader title="Listings and services" intro="Stays, restaurants, guides and the rooms, meals and services they offer. Each one has a price and a short description. Fully booked options stay off this list." action={<Link to="/businesses" className={buttonClass('secondary', 'sm')}>Browse all listings</Link>} />
          <ExploreBrowser showSearch={false} featuredFirst />
        </Container>
      </section>

      {/* Map teaser */}
      <section className="pb-20" aria-labelledby="map-teaser">
        <Container>
          <div className="grid items-center gap-8 overflow-hidden rounded-3xl border border-brand-100 bg-white p-6 sm:p-10 lg:grid-cols-2">
            <div>
              <h2 id="map-teaser" className="font-display text-3xl font-bold tracking-tight text-ink">Everything is a short drive away</h2>
              <p className="mt-3 text-lg text-slate-600">Rwanda is small enough that you can wake up in the rainforest and watch the sunset over Lake Kivu. See every attraction, stay and local business on one map, then turn your picks into a day-by-day plan.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <ButtonLink to="/map"><MapIcon className="h-5 w-5" aria-hidden />Open the map</ButtonLink>
                <ButtonLink to="/itinerary" variant="secondary">Start an itinerary</ButtonLink>
              </div>
            </div>
            <Link to="/map" aria-label="Open the interactive map">
              <RwandaMap points={mapPoints} interactive={false} className="aspect-[1000/884]" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
