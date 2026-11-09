import React from 'react';
import { Match, MatchStatus } from '../types/ticketing';
import { Calendar, Clock, ArrowRight, Repeat } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  onSelectMatch: (match: Match) => void;
  onGoToExchange: (match: Match) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onSelectMatch,
  onGoToExchange
}) => {
  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800">
            Billetterie Ouverte
          </span>
        );
      case 'selling_fast':
        return (
          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 animate-pulse">
            Dernières Places
          </span>
        );
      case 'sold_out_exchange':
        return (
          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-red-100 text-red-900 border border-red-300 dark:bg-red-950/90 dark:text-red-300 dark:border-red-800 flex items-center gap-1">
            <Repeat className="w-3 h-3 text-red-600 dark:text-amber-400" />
            Guichets Fermés · Bourse Active
          </span>
        );
      case 'subscribers_only':
        return (
          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800">
            Priorité Abonnés
          </span>
        );
      case 'coming_soon':
      default:
        return (
          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Bientôt Disponible
          </span>
        );
    }
  };

  const isSoldOut = match.status === 'sold_out_exchange';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group">
      <div>
        {/* Match top meta */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            {match.competition} · {match.round}
          </div>
          {getStatusBadge(match.status)}
        </div>

        {/* Fixture header with teams */}
        <div className="p-5">
          <div className="flex items-center justify-between gap-4">
            {/* RC Lens */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-red-600 to-red-800 border-2 border-amber-400 p-1 flex items-center justify-center shadow-md">
                <div className="w-full h-full bg-slate-950 rounded-xl flex flex-col items-center justify-center">
                  <span className="font-heading font-black text-amber-400 text-xs">RCL</span>
                  <span className="text-[8px] font-bold text-red-500 uppercase">1906</span>
                </div>
              </div>
              <span className="font-heading text-lg font-extrabold text-slate-900 dark:text-white uppercase mt-2">
                RC LENS
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Domicile</span>
            </div>

            {/* VS separator */}
            <div className="flex flex-col items-center">
              <span className="font-heading text-xl font-black text-red-700 dark:text-amber-400/80 uppercase">
                VS
              </span>
              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">Bollaert</div>
            </div>

            {/* Opponent */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div
                className="w-14 h-14 rounded-2xl p-1 flex items-center justify-center shadow-md border-2 border-slate-300 dark:border-slate-700"
                style={{ backgroundColor: match.opponentColor }}
              >
                <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                  <span className="font-heading font-black text-white text-xs">
                    {match.opponentShort}
                  </span>
                </div>
              </div>
              <span className="font-heading text-lg font-extrabold text-slate-900 dark:text-white uppercase mt-2 truncate max-w-[130px]">
                {match.opponent}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Extérieur</span>
            </div>
          </div>

          {/* Date, Time & Venue strip */}
          <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
              <span className="font-medium">{match.formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300 font-semibold">
              <Clock className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
              <span>{match.time}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Match card footer with pricing and CTA */}
      <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium">Tarif officiel</span>
          <div className="font-heading text-xl font-black text-red-700 dark:text-amber-400 tabular-nums">
            Dès {match.minPrice} €
          </div>
        </div>

        {isSoldOut ? (
          <button
            onClick={() => onGoToExchange(match)}
            className="px-4 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 dark:bg-red-950 dark:hover:bg-red-900 dark:border-red-700 dark:text-red-200 font-heading font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow cursor-pointer"
          >
            <Repeat className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
            <span>Bourse d&apos;Échange</span>
          </button>
        ) : (
          <button
            onClick={() => onSelectMatch(match)}
            className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md group-hover:shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <span>Réserver</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
