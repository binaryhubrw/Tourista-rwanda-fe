import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Container, SmartImage } from '@/components/ui';
import { SearchBar } from './SearchBar';
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
          loading="eager"
          style={{ objectPosition: slide.position }}
          className={cn(
            'absolute inset-0 h-full w-full origin-center opacity-100',
            i === index ? 'z-[1]' : 'z-0',
            i === index && !reduceMotion && 'hero-kenburns',
          )}
        />
      ))}
      <div className="absolute inset-0 z-[2] bg-gradient-to-r from-brand-600/85 via-brand-600/65 to-brand-600/50" />
    </div>
  );
}

const SLIDE_MS = 5000;

/** Photo slideshow, headline and floating search — the public landing hero. */
export function HomeHero({ initialQuery = '', initialStart = '', initialEnd = '', initialScope = '', initialService = '' }: { initialQuery?: string; initialStart?: string; initialEnd?: string; initialScope?: string; initialService?: string }) {
  const [slide, setSlide] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlide((current) => (current + 1) % heroSlides.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [slide]);

  const scrollToListings = () => {
    document.getElementById('explore-listings')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className={cn(ready && 'hero-ready')}>
      <section className="relative isolate overflow-hidden bg-brand-600">
        <HeroBackdrop index={slide} reduceMotion={reduceMotion} />
        <Container className="pb-28 pt-16 sm:pb-36 sm:pt-24 lg:min-h-[78vh] lg:pt-28">
          <div className="max-w-3xl text-white">
            <h1 className="hero-wipe font-display text-[2.4rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Find a stay, a table, a car or a guide.
            </h1>
            <p className="hero-rise mt-5 max-w-xl text-lg text-white sm:text-xl" style={{ animationDelay: '0.18s' }}>
              Search what you want. Open a listing. Pick rooms, meals, cars or services.
            </p>
            <div className="hero-rise mt-8 flex flex-wrap items-center gap-4" style={{ animationDelay: '0.32s' }}>
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
        <button
          type="button"
          onClick={scrollToListings}
          className="hero-scroll-cue absolute bottom-20 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1 text-xs font-semibold uppercase tracking-widest text-white/90 sm:flex"
        >
          Scroll down
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
      </section>

      <Container className="relative z-20 -mt-12 sm:-mt-10">
        <div className="hero-rise mx-auto max-w-6xl" style={{ animationDelay: '0.42s' }}>
          <SearchBar
            key={`${initialQuery}|${initialStart}|${initialEnd}|${initialScope}|${initialService}`}
            variant="hero"
            initialQuery={initialQuery}
            initialStart={initialStart}
            initialEnd={initialEnd}
            initialScope={initialScope}
            initialService={initialService}
          />
          <p className="mt-3 text-center text-sm text-slate-500">Set dates, choose hotels, food, cars or services, then search for what is still free</p>
        </div>
      </Container>
    </div>
  );
}
