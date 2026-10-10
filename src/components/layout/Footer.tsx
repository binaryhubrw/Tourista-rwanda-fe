import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Linkedin, Twitter } from 'lucide-react';
import { Logo } from './Logo';
import { Container, HillLines } from '@/components/ui';

const columns = [
  { title: 'Explore', links: [['Search listings', '/explore'], ['Stays', '/explore?scope=accommodations#explore-listings'], ['Eat', '/explore?scope=restaurants#explore-listings'], ['Guides & makers', '/explore?scope=businesses#explore-listings']] },
  { title: 'Plan', links: [['Plan a trip', '/itinerary'], ['Map', '/map'], ['Eco-tourism', '/eco-tourism'], ['Reviews', '/reviews']] },
  { title: 'Support', links: [['About', '/about'], ['Contact', '/contact'], ['Help', '/help'], ['Privacy', '/privacy'], ['Terms', '/terms']] },
];

const socials = [
  { icon: Instagram, label: 'Instagram', href: 'https://instagram.com' },
  { icon: Facebook, label: 'Facebook', href: 'https://facebook.com' },
  { icon: Twitter, label: 'X', href: 'https://x.com' },
  { icon: Youtube, label: 'YouTube', href: 'https://youtube.com' },
  { icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com' },
];

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden bg-brand-600 text-white">
      <HillLines className="pointer-events-none absolute inset-x-0 top-0 h-40 w-full text-white/10" lines={6} />
      <Container className="relative grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-xs text-lg text-white">Discover Rwanda. Experience responsibly.</p>
          <p className="mt-2 max-w-sm text-sm text-white">A platform for domestic and international travellers that puts Rwanda's communities, guides and artisans first.</p>
          <ul className="mt-6 flex gap-2">
            {socials.map(({ icon: Icon, label, href }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white hover:bg-white hover:text-brand-800">
                  <Icon className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="font-display text-base font-bold text-white">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([label, to]) => (
                <li key={label}><Link to={to} className="text-white hover:text-white hover:underline">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <div className="relative border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 text-sm text-white sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Tourista Rwanda</p>
          <p>Made in Kigali for travellers who want their visit to count.</p>
        </Container>
      </div>
    </footer>
  );
}
