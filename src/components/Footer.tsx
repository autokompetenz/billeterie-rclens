import React from 'react';
import { ShieldCheck, MapPin, Phone, Clock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 text-xs transition-colors duration-200">
      {/* Upper club trust section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-b border-slate-200 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Col 1: Club identity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-red-600 to-amber-500 p-0.5 flex items-center justify-center font-heading font-black text-slate-950 text-xs">
              RCL
            </div>
            <span className="font-heading text-lg font-bold uppercase text-slate-900 dark:text-white tracking-tight">
              RACING CLUB DE LENS
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-xs">
            Site officiel de réservation de la billetterie du Racing Club de Lens.
            Matchs à domicile au Stade Bollaert-Delelis.
          </p>
          <div className="text-[11px] font-mono text-red-700 dark:text-amber-400 font-bold">
            Fondé en 1906 · Sang et Or à jamais
          </div>
        </div>

        {/* Col 2: Ticketing desk and venue info */}
        <div className="space-y-2">
          <div className="font-heading text-sm font-bold uppercase text-slate-900 dark:text-white tracking-wider">
            Stade Bollaert-Delelis
          </div>
          <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
            <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>Avenue Alfred Maës, 62300 Lens, France</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Guichets : Mar - Sam (10h - 18h30)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>03 21 13 22 22</span>
          </div>
        </div>

        {/* Col 3: Useful Club Services */}
        <div className="space-y-2">
          <div className="font-heading text-sm font-bold uppercase text-slate-900 dark:text-white tracking-wider">
            Services &amp; Avantages
          </div>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <li>
              <span className="hover:text-red-700 dark:hover:text-amber-400 transition-colors cursor-pointer">
                Billetterie Grand Public
              </span>
            </li>
            <li>
              <span className="hover:text-red-700 dark:hover:text-amber-400 transition-colors cursor-pointer">
                Bourse d&apos;Échange Officielle
              </span>
            </li>
            <li>
              <span className="hover:text-red-700 dark:hover:text-amber-400 transition-colors cursor-pointer">
                Campagne Abonnements
              </span>
            </li>
            <li>
              <span className="text-slate-400 dark:text-slate-500">Comités d&apos;Entreprise &amp; Groupes</span>
            </li>
            <li>
              <span className="text-slate-400 dark:text-slate-500">PMR / PSH (Accès adapté)</span>
            </li>
          </ul>
        </div>

        {/* Col 4: Payments & Security */}
        <div className="space-y-3">
          <div className="font-heading text-sm font-bold uppercase text-slate-900 dark:text-white tracking-wider">
            Garantie &amp; Sécurité
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Transactions chiffrées SSL 256 bits avec authentification forte 3D Secure.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono text-slate-800 dark:text-slate-300">
              CB
            </span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono text-slate-800 dark:text-slate-300">
              VISA
            </span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono text-slate-800 dark:text-slate-300">
              MASTERCARD
            </span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono text-slate-800 dark:text-slate-300">
              ANCV
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Plateforme agréée LFP &amp; FFF</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright & Legal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
        <div>
          © 2026 Racing Club de Lens. Tous droits réservés. Reproduction interdite.
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="hover:text-slate-700 dark:hover:text-slate-400 cursor-pointer">Conditions Générales de Vente</span>
          <span>·</span>
          <span className="hover:text-slate-700 dark:hover:text-slate-400 cursor-pointer">Règlement du Stade Bollaert</span>
          <span>·</span>
          <span className="hover:text-slate-700 dark:hover:text-slate-400 cursor-pointer">Politique de Confidentialité</span>
          <span>·</span>
          <span className="hover:text-slate-700 dark:hover:text-slate-400 cursor-pointer">Mentions Légales</span>
        </div>
      </div>
    </footer>
  );
};
