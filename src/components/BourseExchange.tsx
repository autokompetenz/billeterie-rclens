import React, { useState } from 'react';
import { ResaleListing, Match } from '../types/ticketing';
import { ShieldCheck, Repeat, Filter, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface BourseExchangeProps {
  listings: ResaleListing[];
  matches: Match[];
  onBuyResaleTicket: (listing: ResaleListing) => void;
  onGoToMyTickets: () => void;
}

export const BourseExchange: React.FC<BourseExchangeProps> = ({
  listings,
  matches,
  onBuyResaleTicket,
  onGoToMyTickets
}) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string>('all');
  const [selectedStand, setSelectedStand] = useState<string>('all');

  const filteredListings = listings.filter((item) => {
    if (selectedMatchId !== 'all' && item.matchId !== selectedMatchId) return false;
    if (selectedStand !== 'all' && !item.standName.includes(selectedStand)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Hero Banner Bourse */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-red-900 via-slate-900 to-amber-950 border border-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-widest mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Plateforme Officielle 100% Sécurisée · Prix Facial Garanti</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-heading font-extrabold uppercase text-white tracking-tight">
            Bourse d&apos;Échange Officielle <span className="text-amber-400">RC Lens</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-200 leading-relaxed">
            Un imprévu ? Les abonnés et détenteurs de billets revendent leurs places au prix officiel
            du club. Achetez en toute confiance avec réémission immédiate d&apos;un nouveau code-barre unique.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={onGoToMyTickets}
              className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Repeat className="w-4 h-4" />
              <span>Revendre un billet</span>
            </button>
            <div className="text-xs text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zéro spéculation · Billet sécurisé réédité à votre nom</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-semibold uppercase">
            <Filter className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
            <span>Filtrer :</span>
          </div>

          {/* Match filter */}
          <select
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">Tous les matchs à guichets fermés</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                RC Lens vs {m.opponent}
              </option>
            ))}
          </select>

          {/* Stand filter */}
          <select
            value={selectedStand}
            onChange={(e) => setSelectedStand(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">Toutes les tribunes</option>
            <option value="Marek">Tribune Marek / Xercès</option>
            <option value="Lepagnot">Tribune Lepagnot</option>
            <option value="Delacourt">Tribune Delacourt</option>
            <option value="Trannin">Tribune Trannin</option>
          </select>
        </div>

        <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
          <strong className="text-red-700 dark:text-amber-400 font-bold">{filteredListings.length}</strong> place(s) disponible(s)
        </div>
      </div>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
          <AlertCircle className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white uppercase">
            Aucun billet actuellement en vente pour ces critères
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Les supporters mettent régulièrement des places en vente jusqu&apos;au coup d&apos;envoi.
            Revenez consulter cette page ou activez vos alertes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Billet Officiel Vérifié
                  </span>
                  <span className="font-heading text-2xl font-black text-red-700 dark:text-amber-400 tabular-nums">
                    {listing.resalePrice} €
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{listing.matchDate}</div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white uppercase mt-0.5">
                    RC Lens vs {listing.matchOpponent}
                  </h3>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Tribune :</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{listing.standName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Secteur :</span>
                    <span className="font-semibold text-red-700 dark:text-amber-300">{listing.sectorName}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500 dark:text-slate-400">Emplacement :</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      Rang {listing.row} · Place {listing.seatNumber}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Vendeur certifié ({listing.sellerInitials})</span>
                  <span>Prix facial d&apos;origine : {listing.originalPrice} €</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => onBuyResaleTicket(listing)}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <span>Réserver cette place</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
