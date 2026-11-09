import React, { useEffect, useState } from 'react';
import { Check, Clock, ArrowRight, Heart, Loader2, AlertCircle } from 'lucide-react';
import { ticketingApi, getErrorMessage } from '../services/api';

interface SeasonTicketsProps {
  defaultEmail?: string;
}

export const SeasonTickets: React.FC<SeasonTicketsProps> = ({ defaultEmail }) => {
  const [waitlistEmail, setWaitlistEmail] = useState(defaultEmail ?? '');
  const [preferredStand, setPreferredStand] = useState('MAREK_XERCES');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [savingsMatches, setSavingsMatches] = useState<number>(12);

  useEffect(() => {
    if (defaultEmail) setWaitlistEmail(defaultEmail);
  }, [defaultEmail]);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await ticketingApi.joinWaitlist(waitlistEmail.trim(), preferredStand);
      setPosition(result.position);
      setAlreadyRegistered(result.alreadyRegistered);
      setIsSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const standOffers = [
    {
      name: 'Tribune Marek (Kop Sang & Or)',
      price: '235 €',
      monthly: 'dès 23,50 €/mois',
      specs: '17 matchs de Ligue 1 · Placement libre debout · Cœur du volcan',
      tag: 'Tribune Mythique',
      color: 'border-red-600'
    },
    {
      name: 'Tribune Delacourt / Trannin',
      price: '195 €',
      monthly: 'dès 19,50 €/mois',
      specs: '17 matchs de Ligue 1 · Derrière les buts · Ambiance festive',
      tag: 'Meilleur Rapport Qualité/Prix',
      color: 'border-emerald-500'
    },
    {
      name: 'Tribune Xercès Centrale',
      price: '345 €',
      monthly: 'dès 34,50 €/mois',
      specs: '17 matchs de Ligue 1 · Vue latérale surplombante · Confort assise',
      tag: 'Vue Panoramique',
      color: 'border-blue-500'
    },
    {
      name: 'Tribune Lepagnot Honneur',
      price: '495 €',
      monthly: 'dès 49,50 €/mois',
      specs: '17 matchs de Ligue 1 · Sièges confort · Accès salons et bars',
      tag: 'Prestige & Confort',
      color: 'border-amber-400'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-red-900 via-slate-900 to-amber-950 border border-slate-800 p-6 sm:p-10 relative text-white shadow-xl">
        <div className="max-w-2xl relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-widest mb-2">
            <Heart className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>Fiers d&apos;être Lensois · 30 000 Abonnés à Bollaert</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-black uppercase text-white tracking-tight">
            Abonnements <span className="text-amber-400">Saison 2026/2027</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-200 leading-relaxed">
            Vibrez toute l&apos;année au Stade Bollaert-Delelis. Votre siège garanti pour tous les
            matchs de championnat, accès prioritaire aux grands rendez-vous et revente sécurisée
            en 1 clic sur la Bourse d&apos;échange.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold text-white">
            <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-lg border border-slate-700">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>17 matchs de Ligue 1 inclus</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-lg border border-slate-700">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>10% de remise Boutique Emotion Foot</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-lg border border-slate-700">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Paiement en 10x sans frais</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div>
        <h2 className="text-xl sm:text-2xl font-heading font-extrabold uppercase text-slate-900 dark:text-white tracking-tight mb-4">
          Nos Formules d&apos;Abonnement
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {standOffers.map((offer, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border ${offer.color} flex flex-col justify-between shadow-sm dark:shadow-lg relative hover:shadow-xl transition-all`}
            >
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-red-700 dark:text-amber-300 font-bold">
                  {offer.tag}
                </span>
                <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white uppercase mt-2">
                  {offer.name}
                </h3>
                <div className="mt-3">
                  <div className="font-heading text-3xl font-black text-red-700 dark:text-amber-400">
                    {offer.price}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{offer.monthly}</div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-4 leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-3">
                  {offer.specs}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-200 dark:border-slate-800">
                <a
                  href="#waitlist-section"
                  className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-amber-500 text-slate-800 hover:text-slate-950 dark:bg-slate-800 dark:hover:bg-amber-500 dark:hover:text-slate-950 dark:text-white font-heading font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Rejoindre la liste</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Savings Simulator */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
              Simulateur Avantage Supporter
            </span>
            <h3 className="font-heading text-xl font-bold uppercase text-slate-900 dark:text-white mt-1">
              Combien économisez-vous avec un abonnement ?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Glissez le curseur selon le nombre de matchs que vous prévoyez de vivre à Bollaert cette saison :
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
          <div className="md:col-span-7 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">Matchs suivis par saison :</span>
              <span className="font-heading text-lg text-red-700 dark:text-amber-400 font-black">
                {savingsMatches} matchs / 17
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={17}
              value={savingsMatches}
              onChange={(e) => setSavingsMatches(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>5 matchs (Chocs)</span>
              <span>11 matchs</span>
              <span>17 matchs (Intégrale)</span>
            </div>
          </div>

          <div className="md:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">Économie estimée</div>
              <div className="font-heading text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{Math.max(0, savingsMatches * 32 - 195)} €
              </div>
              <div className="text-[10px] text-slate-500">Par rapport au tarif unitaire</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">Prix par match</div>
              <div className="font-heading text-lg font-black text-red-700 dark:text-amber-400 tabular-nums">
                {(195 / savingsMatches).toFixed(1)} €
              </div>
              <div className="text-[10px] text-slate-500">Au lieu de 32 €</div>
            </div>
          </div>
        </div>
      </div>

      {/* Waitlist Section */}
      <div
        id="waitlist-section"
        className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-sm"
      >
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-amber-400 uppercase tracking-widest mb-1">
            <Clock className="w-4 h-4" />
            <span>Campagne de réabonnement prioritaire en cours</span>
          </div>
          <h2 className="text-2xl font-heading font-extrabold uppercase text-slate-900 dark:text-white">
            Inscrivez-vous sur la liste d&apos;attente officielle
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            Face à une demande historique et à un taux de réabonnement de 99,2%, les nouvelles
            adhésions sont attribuées dans l&apos;ordre chronologique d&apos;inscription sur cette liste.
          </p>
        </div>

        <div className="w-full lg:w-96 bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
          {isSubmitted ? (
            <div className="text-center py-4 space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <h4 className="font-heading text-lg font-bold uppercase text-slate-900 dark:text-white">
                {alreadyRegistered ? 'Déjà inscrit !' : 'Inscription confirmée !'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {alreadyRegistered
                  ? 'Cette adresse figure déjà sur la liste d\'attente officielle.'
                  : 'Votre rang sur la liste d\'attente a été validé. Vous recevrez un e-mail dès l\'ouverture des créneaux de souscription.'}
              </p>
              {position !== null && (
                <p className="text-[11px] font-mono text-red-700 dark:text-amber-400 font-bold">
                  Position actuelle : #{position}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Votre adresse e-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="supporter@rclens.fr"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tribune souhaitée
                </label>
                <select
                  value={preferredStand}
                  onChange={(e) => setPreferredStand(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="MAREK_XERCES">Tribune Marek / Xercès (Kop)</option>
                  <option value="DELACOURT">Tribune Delacourt (Nord)</option>
                  <option value="TRANNIN">Tribune Trannin (Sud)</option>
                  <option value="LEPAGNOT">Tribune Lepagnot (Honneur)</option>
                </select>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-heading font-extrabold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Inscription…' : 'Valider mon inscription'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
