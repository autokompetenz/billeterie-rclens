import React from 'react';
import { CalendarDays, Home, ShieldCheck } from 'lucide-react';

/**
 * En-tête commun aux pages publiques ajoutées (événements, vérification).
 * L'espace administrateur reste volontairement absent de la navigation.
 */

interface PublicHeaderProps {
  active?: 'events' | 'verify' | 'home';
}

const links = [
  { id: 'home' as const, href: '/', label: 'Accueil', icon: Home },
  { id: 'events' as const, href: '/evenements', label: 'Événements', icon: CalendarDays },
  { id: 'verify' as const, href: '/verifier', label: 'Vérifier', icon: ShieldCheck }
];

export const PublicHeader: React.FC<PublicHeaderProps> = ({ active }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 text-slate-900 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:text-white">
      <div className="bg-gradient-to-r from-red-700 via-amber-600 to-red-700 px-4 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
        Billetterie officielle · RC Lens
      </div>
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
        <a href="/" className="group flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/60 bg-gradient-to-b from-red-600 to-red-800 p-0.5 shadow sm:h-10 sm:w-10">
            <div className="flex h-full w-full flex-col items-center justify-center rounded-[6px] bg-slate-950">
              <span className="font-heading text-[9px] font-black tracking-widest text-amber-400">
                RC LENS
              </span>
              <span className="text-[7px] font-bold uppercase tracking-tight text-red-500">
                1906
              </span>
            </div>
          </div>
          <div className="leading-none">
            <div className="whitespace-nowrap font-heading text-sm font-black uppercase tracking-tight sm:text-xl">
              Billetterie <span className="text-red-600 dark:text-amber-400">RC Lens</span>
            </div>
            <div className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 sm:block">
              Bollaert-Delelis
            </div>
          </div>
        </a>

        <nav aria-label="Navigation principale" className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = active === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                aria-label={link.label}
                title={link.label}
                className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-red-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-amber-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{link.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export const PublicFooter: React.FC = () => (
  <footer className="mt-16 border-t border-slate-200 bg-slate-950 py-8 text-slate-400 dark:border-slate-800">
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center text-xs sm:flex-row sm:text-left">
      <div>
        <span className="font-heading text-base font-black uppercase tracking-wide text-amber-400">
          RC Lens
        </span>
        <span className="ml-2">Billetterie officielle · Stade Bollaert-Delelis</span>
      </div>
      <div className="flex items-center gap-4">
        <a href="/evenements" className="hover:text-white">
          Événements
        </a>
        <a href="/verifier" className="hover:text-white">
          Vérifier une commande
        </a>
      </div>
    </div>
  </footer>
);
