import React, { useState } from 'react';
import { CalendarDays, Home, Menu, ShieldCheck, Ticket, X } from 'lucide-react';

interface PublicHeaderProps {
  active?: 'events' | 'verify' | 'home';
}

const links = [
  { id: 'home' as const, href: '/', label: 'Accueil', icon: Home },
  { id: 'events' as const, href: '/#evenements', label: 'Événements', icon: CalendarDays },
  { id: 'verify' as const, href: '/verifier', label: 'Mes commandes', icon: ShieldCheck }
];

export const PublicHeader: React.FC<PublicHeaderProps> = ({ active }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#ba0819] text-white shadow-[0_1px_8px_rgba(0,0,0,0.18)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white transition hover:bg-white/10 md:hidden"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <a href="/" className="flex min-w-0 items-center gap-2" onClick={() => setMenuOpen(false)}>
            <span className="flex h-11 w-9 shrink-0 items-center justify-center rounded-sm bg-[#fed100] text-[#ba0819] shadow-sm">
              <ShieldCheck className="h-6 w-6 stroke-[2.5]" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-heading text-lg font-black uppercase tracking-wider text-[#fed100]">RC Lens</span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white">Billetterie</span>
            </span>
          </a>
        </div>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = active === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${isActive ? 'bg-white/15 text-[#fed100]' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}
              >
                <Icon className="h-4 w-4" />{link.label}
              </a>
            );
          })}
        </nav>

        <a
          href="/verifier"
          aria-label="Retrouver ma commande"
          title="Retrouver ma commande"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white transition hover:bg-white/10"
        >
          <Ticket className="h-6 w-6" />
        </a>
      </div>

      {menuOpen && (
        <nav aria-label="Menu mobile" className="absolute inset-x-0 top-full border-t border-white/10 bg-[#a80717] p-3 shadow-lg md:hidden">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a key={link.id} href={link.href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-bold text-white hover:bg-white/10">
                <Icon className="h-4 w-4 text-[#fed100]" />{link.label}
              </a>
            );
          })}
        </nav>
      )}
    </header>
  );
};

export const PublicFooter: React.FC = () => (
  <footer className="mt-12 border-t border-[#ded9d4] bg-[#f0edec] py-8 text-[#34312c] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
    <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-4 sm:flex-row sm:items-center sm:px-6">
      <div>
        <div className="font-heading text-lg font-black uppercase tracking-wider text-[#ba0819] dark:text-amber-400">RC Lens · Billetterie</div>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Stade Bollaert-Delelis · Lens</p>
      </div>
      <nav aria-label="Navigation de pied de page" className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold">
        <a href="/#evenements" className="hover:text-[#ba0819] dark:hover:text-amber-400">Événements</a>
        <a href="/verifier" className="hover:text-[#ba0819] dark:hover:text-amber-400">Mes commandes</a>
      </nav>
    </div>
  </footer>
);
