import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Banknote,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Clock,
  Loader2,
  Mail,
  MapPin,
  MapPinned,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Ticket
} from 'lucide-react';
import { PublicFooter, PublicHeader } from '../components/PublicHeader';
import { eventsApi, getErrorMessage } from '../services/api';
import { GuestOrderResult, StandId, TicketingEvent } from '../types/ticketing';

type Step = 'catalogue' | 'checkout' | 'success';

function formatPrice(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<TicketingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<TicketingEvent | null>(null);
  const [selectedStand, setSelectedStand] = useState<StandId | null>(null);
  const [step, setStep] = useState<Step>('catalogue');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [buyer, setBuyer] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<GuestOrderResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    eventsApi
      .list()
      .then((data) => {
        if (cancelled) return;
        setEvents(data);
        const params = new URLSearchParams(window.location.search);
        const wanted = params.get('event');
        if (wanted) {
          const match = data.find(
            (event) => event.slug === wanted || event.id === wanted
          );
          if (match) openEvent(match);
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openEvent(event: TicketingEvent) {
    setSelected(event);
    setSelectedStand(null);
    setStep('checkout');
    setResult(null);
    setSubmitError(null);
    setQuantities({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function backToCatalogue() {
    setSelected(null);
    setSelectedStand(null);
    setStep('catalogue');
    setResult(null);
    setSubmitError(null);
  }

  const hasStandMap = Boolean(selected?.ticketTypes.some((type) => type.standId));
  const lines = useMemo(() => {
    if (!selected) return [];
    return selected.ticketTypes
      .filter((type) => !hasStandMap || type.standId === selectedStand)
      .map((type) => ({ type, quantity: quantities[type.id] ?? 0 }))
      .filter((line) => line.quantity > 0);
  }, [selected, quantities, selectedStand]);

  const standInfo: Array<{ id: StandId; label: string; side: string }> = [
    { id: 'DELACOURT', label: 'Delacourt', side: 'Nord · but nord' },
    { id: 'TRANNIN', label: 'Trannin', side: 'Sud · but sud' },
    { id: 'MAREK_XERCES', label: 'Marek / Xercès', side: 'Est · kop' },
    { id: 'LEPAGNOT', label: 'Lepagnot', side: 'Ouest · honneur' }
  ];
  const standPrices = (standId: StandId) =>
    selected?.ticketTypes.filter((type) => type.standId === standId && type.active && type.available > 0) ?? [];
  const featuredEvent = events.find((event) => event.featured) ?? events[0] ?? null;

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.type.price * line.quantity, 0),
    [lines]
  );

  const totalTickets = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines]
  );

  function changeQuantity(ticketTypeId: string, delta: number, max: number) {
    setQuantities((current) => {
      const next = Math.max(0, Math.min(max, (current[ticketTypeId] ?? 0) + delta));
      const nextMap = { ...current, [ticketTypeId]: next };
      const totalCount = Object.values(nextMap).reduce((sum, value) => sum + value, 0);
      if (totalCount > 10) return current;
      return nextMap;
    });
  }

  function chooseStand(standId: StandId) {
    setSelectedStand(standId);
    setQuantities({});
  }

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;

    if (!buyer.name.trim() || buyer.name.trim().length < 2) {
      setSubmitError('Merci d’indiquer votre nom complet.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(buyer.email.trim())) {
      setSubmitError('Merci d’indiquer une adresse e-mail valide.');
      return;
    }
    if (lines.length === 0) {
      setSubmitError('Sélectionnez au moins un billet.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await eventsApi.createGuestOrder({
        eventId: selected.id,
        buyer: {
          name: buyer.name.trim(),
          email: buyer.email.trim(),
          phone: buyer.phone.trim() || undefined
        },
        items: lines.map((line) => ({
          ticketTypeId: line.type.id,
          quantity: line.quantity
        })),
      });
      setResult(response);
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader active="events" />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
        {step === 'catalogue' && (
          <>
            <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-slate-950 text-white shadow-2xl shadow-red-950/20">
              <img
                src="/images/hero_bollaert_atmosphere_1794048534296.jpg"
                alt="L’ambiance des tribunes du stade Bollaert-Delelis"
                className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/10" />
              <div className="grid min-h-[560px] items-center gap-10 px-5 py-10 sm:px-10 sm:py-14 lg:min-h-[600px] lg:grid-cols-[1.15fr_.85fr] lg:px-14">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-slate-950/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 backdrop-blur sm:text-xs">
                    <Sparkles className="h-3.5 w-3.5" /> Une passion, un stade, une histoire
                  </div>
                  <h1 className="mt-5 font-heading text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
                    Bollaert<br />
                    <span className="text-amber-400">vous attend.</span>
                  </h1>
                  <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/80 sm:text-lg">
                    Vivez le RC Lens au plus près. Choisissez votre événement et votre tribune, puis réservez vos billets en quelques étapes, sans créer de compte.
                  </p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <a href="#evenements" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-300">
                      <Ticket className="h-4 w-4" /> Découvrir les événements
                    </a>
                    <a href="/verifier" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15">
                      <ShieldCheck className="h-4 w-4" /> Retrouver ma commande
                    </a>
                  </div>
                </div>

                <div className="w-full max-w-md justify-self-end">
                  <div className="rounded-2xl border border-white/15 bg-slate-950/60 p-5 shadow-2xl backdrop-blur-md sm:p-6">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">À l’affiche</div>
                        <div className="mt-1 font-heading text-xl font-black uppercase">Le prochain rendez-vous</div>
                      </div>
                      <CalendarDays className="h-7 w-7 text-amber-400" />
                    </div>
                    {featuredEvent ? (
                      <>
                        <div className="mt-5 text-2xl font-black leading-tight sm:text-3xl">{featuredEvent.title}</div>
                        <div className="mt-3 space-y-2 text-sm text-white/75">
                          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-amber-400" />{featuredEvent.formattedDate}</div>
                          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-400" />{featuredEvent.venue}</div>
                        </div>
                        <div className="mt-6 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
                          <div><div className="text-[10px] font-bold uppercase tracking-widest text-white/50">À partir de</div><div className="font-heading text-3xl font-black text-amber-300">{formatPrice(featuredEvent.minPrice)}</div></div>
                          <button type="button" onClick={() => openEvent(featuredEvent)} disabled={featuredEvent.availableStock <= 0} className="rounded-lg bg-red-700 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-600 disabled:bg-slate-700">{featuredEvent.availableStock <= 0 ? 'Complet' : 'Réserver'}</button>
                        </div>
                      </>
                    ) : (
                      <p className="mt-5 text-sm leading-relaxed text-white/70">{loading ? 'Nous recherchons les prochains événements…' : 'Les prochains événements seront bientôt annoncés.'}</p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2 text-[10px] font-semibold uppercase tracking-widest text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Billetterie ouverte selon disponibilité</div>
                </div>
              </div>
              <div className="grid grid-cols-1 border-t border-white/10 bg-slate-950/70 backdrop-blur-sm sm:grid-cols-3">
                <div className="flex items-center gap-3 px-5 py-4 sm:px-8"><Ticket className="h-5 w-5 text-amber-400" /><div><div className="text-sm font-bold">À l’unité</div><div className="text-[11px] text-white/55">Choisissez vos billets</div></div></div>
                <div className="flex items-center gap-3 border-white/10 px-5 py-4 sm:border-x sm:px-8"><ShieldCheck className="h-5 w-5 text-amber-400" /><div><div className="text-sm font-bold">Sans compte</div><div className="text-[11px] text-white/55">Une réservation en quelques étapes</div></div></div>
                <div className="flex items-center gap-3 px-5 py-4 sm:px-8"><Mail className="h-5 w-5 text-amber-400" /><div><div className="text-sm font-bold">Suivi par e-mail</div><div className="text-[11px] text-white/55">Votre bon de commande vous accompagne</div></div></div>
              </div>
            </section>

            <section id="evenements" className="mt-14 scroll-mt-28 sm:mt-20">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-700 dark:text-amber-400">Le calendrier Sang et Or</div>
                  <h2 className="mt-1 font-heading text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                    Tous les événements
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                    Matchs, visites et expériences disponibles à la réservation.
                  </p>
                </div>
                <a
                  href="/verifier"
                  className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-amber-300"
                >
                  <ShieldCheck className="h-4 w-4" /> Vérifier une commande
                </a>
              </div>

              {loading && (
                <div className="mt-10 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-10 text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                  <Loader2 className="h-5 w-5 animate-spin" /> Chargement des événements…
                </div>
              )}

              {loadError && (
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Impossible de charger les événements.</p>
                    <p>{loadError}</p>
                  </div>
                </div>
              )}

              {!loading && !loadError && events.length === 0 && (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  Aucun événement n’est ouvert à la vente pour le moment.
                </div>
              )}

              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => {
                  const soldOut = event.availableStock <= 0;
                  return (
                    <article
                      key={event.id}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-red-900"
                    >
                      <div className="relative h-48 overflow-hidden bg-slate-200 dark:bg-slate-800 sm:h-52">
                        {event.imageUrl ? (
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-700 to-slate-950">
                            <Ticket className="h-10 w-10 text-amber-400" />
                          </div>
                        )}
                        <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                          {event.category}
                        </span>
                        {event.featured && (
                          <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-950">
                            À la une
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="font-heading text-xl font-black uppercase leading-tight text-slate-900 dark:text-white">
                          {event.title}
                        </h3>
                        <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-red-600 dark:text-amber-400" />
                            {event.formattedDate}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-red-600 dark:text-amber-400" />
                            {event.venue}
                          </p>
                          {event.doorsOpen && (
                            <p className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-red-600 dark:text-amber-400" />
                              Ouverture des portes : {event.doorsOpen}
                            </p>
                          )}
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                          {event.description}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              À partir de
                            </div>
                            <div className="font-heading text-2xl font-black text-slate-900 dark:text-white">
                              {formatPrice(event.minPrice)}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={soldOut}
                            onClick={() => openEvent(event)}
                            className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700"
                          >
                            {soldOut ? 'Épuisé' : 'Réserver'}
                          </button>
                        </div>
                        {!soldOut && (
                          <p className="mt-2 text-right text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            {event.availableStock} billet(s) disponible(s)
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <section className="mt-16 grid gap-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-8 lg:grid-cols-[.75fr_1.25fr] lg:p-10">
                <div className="max-w-md">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-700 dark:text-amber-400">Simple du début à la fin</div>
                  <h3 className="mt-2 font-heading text-3xl font-black uppercase leading-tight text-slate-900 dark:text-white sm:text-4xl">Votre réservation, étape par étape.</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Retrouvez les informations essentielles avant de commander. Le prix et les disponibilités affichés sont liés à l’événement et aux catégories ouvertes à la vente.</p>
                  <a href="#questions" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-red-700 hover:underline dark:text-amber-400">Consulter les questions fréquentes <ArrowRight className="h-4 w-4" /></a>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <article className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 font-heading text-lg font-black text-red-700 dark:bg-red-950 dark:text-amber-400">01</div>
                    <h4 className="mt-4 font-bold text-slate-900 dark:text-white">Choisissez l’événement</h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Consultez la date, le lieu, l’ouverture des portes et les tarifs de départ.</p>
                  </article>
                  <article className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 font-heading text-lg font-black text-red-700 dark:bg-red-950 dark:text-amber-400">02</div>
                    <h4 className="mt-4 font-bold text-slate-900 dark:text-white">Sélectionnez la tribune</h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Sur le plan, choisissez un côté du stade, puis une catégorie et une quantité.</p>
                  </article>
                  <article className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 font-heading text-lg font-black text-red-700 dark:bg-red-950 dark:text-amber-400">03</div>
                    <h4 className="mt-4 font-bold text-slate-900 dark:text-white">Finalisez le paiement</h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Indiquez votre e-mail, puis suivez les instructions de virement jointes à votre commande.</p>
                  </article>
                </div>
              </section>

              <section className="mt-8 grid gap-5 lg:grid-cols-2">
                <div className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300"><MapPinned className="h-4 w-4" /> Comprendre les tribunes</div>
                  <h3 className="mt-3 font-heading text-3xl font-black uppercase">Choisissez votre côté.</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">Le plan de réservation représente les quatre tribunes de Bollaert-Delelis. Les catégories proposées et leur tarif dépendent de l’événement.</p>
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    {[
                      ['Nord', 'Delacourt', 'Derrière le but'],
                      ['Sud', 'Trannin', 'Derrière le but'],
                      ['Est', 'Marek / Xercès', 'Kop Sang et Or'],
                      ['Ouest', 'Lepagnot', 'Tribune honneur']
                    ].map(([side, stand, detail]) => (
                      <div key={stand} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-amber-300">{side}</div>
                        <div className="mt-1 text-sm font-bold">{stand}</div>
                        <div className="mt-0.5 text-[10px] text-white/50">{detail}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-[11px] leading-relaxed text-white/50">La sélection porte sur la tribune et la catégorie proposées. Le choix d’un siège numéroté précis n’est pas encore proposé dans ce parcours.</p>
                </div>

                <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30 sm:p-8">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300"><Banknote className="h-4 w-4" /> Règlement par virement</div>
                  <h3 className="mt-3 font-heading text-3xl font-black uppercase text-slate-900 dark:text-white">Les bonnes informations, au bon moment.</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Après la commande, les coordonnées bancaires de la billetterie s’affichent à l’écran et sont envoyées par e-mail avec le montant exact et un motif de paiement unique.</p>
                  <ul className="mt-5 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                    <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /><span>Utilisez le montant et le motif indiqués pour votre commande.</span></li>
                    <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /><span>Choisissez un virement instantané depuis votre application bancaire.</span></li>
                    <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /><span>Les billets sont activés après réception et validation du paiement.</span></li>
                  </ul>
                  <div className="mt-5 flex items-start gap-2 rounded-xl bg-white/70 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-900/60 dark:text-slate-300"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />Gardez votre numéro de bon de commande : il vous permettra de retrouver l’état de votre réservation.</div>
                </div>
              </section>

              <section id="questions" className="mt-16 scroll-mt-28">
                <div className="mx-auto max-w-3xl">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-700 dark:text-amber-400"><CircleHelp className="h-4 w-4" /> Besoin d’un repère ?</div>
                    <h3 className="mt-2 font-heading text-3xl font-black uppercase text-slate-900 dark:text-white sm:text-4xl">Questions fréquentes</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Les détails utiles pour réserver et suivre vos billets.</p>
                  </div>
                  <div className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                    <details className="group p-4 sm:p-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 marker:hidden dark:text-white">Dois-je créer un compte pour commander ?<span className="text-xl text-red-700 transition group-open:rotate-45 dark:text-amber-400">+</span></summary>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">Non. La commande se fait avec votre nom et votre adresse e-mail. Un compte client n’est pas nécessaire.</p>
                    </details>
                    <details className="group p-4 sm:p-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 marker:hidden dark:text-white">Où trouver les coordonnées et le motif du virement ?<span className="text-xl text-red-700 transition group-open:rotate-45 dark:text-amber-400">+</span></summary>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">Ils s’affichent une fois la commande enregistrée et figurent dans l’e-mail récapitulatif. Le motif est propre à votre commande : recopiez-le exactement.</p>
                    </details>
                    <details className="group p-4 sm:p-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 marker:hidden dark:text-white">Quand mes billets sont-ils validés ?<span className="text-xl text-red-700 transition group-open:rotate-45 dark:text-amber-400">+</span></summary>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">La commande reste en attente pendant le règlement. Les billets sont activés après réception et validation du virement.</p>
                    </details>
                    <details className="group p-4 sm:p-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 marker:hidden dark:text-white">Comment retrouver ma commande ?<span className="text-xl text-red-700 transition group-open:rotate-45 dark:text-amber-400">+</span></summary>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">Utilisez le numéro de bon de commande reçu par e-mail sur la page de vérification. Si le message tarde, vérifiez aussi le dossier des courriers indésirables.</p>
                      <a href="/verifier" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-red-700 hover:underline dark:text-amber-400">Ouvrir la vérification <ArrowRight className="h-4 w-4" /></a>
                    </details>
                    <details className="group p-4 sm:p-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 marker:hidden dark:text-white">Le prix peut-il changer selon la tribune ?<span className="text-xl text-red-700 transition group-open:rotate-45 dark:text-amber-400">+</span></summary>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">Oui. Les catégories, leurs tarifs et les stocks disponibles sont définis pour chaque événement. Le total se met à jour selon les billets sélectionnés avant l’envoi de la commande.</p>
                    </details>
                  </div>
                </div>
              </section>

              <section className="mt-12 flex flex-col items-start justify-between gap-5 rounded-2xl bg-gradient-to-r from-red-800 to-red-950 p-5 text-white sm:flex-row sm:items-center sm:p-7">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Prêt à vivre Bollaert ?</div>
                  <h3 className="mt-1 font-heading text-2xl font-black uppercase sm:text-3xl">Votre prochain rendez-vous commence ici.</h3>
                  <p className="mt-1 text-sm text-white/70">Consultez les événements ouverts à la réservation.</p>
                </div>
                <a href="#evenements" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-400 px-5 py-3 text-sm font-black uppercase text-slate-950 transition hover:bg-amber-300">Voir les événements <ArrowRight className="h-4 w-4" /></a>
              </section>
            </section>
          </>
        )}

        {step === 'checkout' && selected && (
          <section>
            <button
              type="button"
              onClick={backToCatalogue}
              className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-red-700 dark:text-slate-300 dark:hover:text-amber-400"
            >
              <ArrowLeft className="h-4 w-4" /> Retour aux événements
            </button>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {selected.imageUrl && (
                  <img
                    src={selected.imageUrl}
                    alt={selected.title}
                    className="h-44 w-full object-cover"
                  />
                )}
                <div className="p-5 sm:p-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-amber-400">
                    {selected.category}
                  </span>
                  <h1 className="mt-1 font-heading text-3xl font-black uppercase leading-none text-slate-900 dark:text-white">
                    {selected.title}
                  </h1>
                  <div className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-red-600 dark:text-amber-400" />
                      {selected.formattedDate}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-600 dark:text-amber-400" />
                      {selected.venue}
                    </p>
                    {selected.doorsOpen && (
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-red-600 dark:text-amber-400" />
                        Portes : {selected.doorsOpen}
                      </p>
                    )}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {selected.description}
                  </p>
                </div>
              </div>

              <form
                onSubmit={submitOrder}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
              >
                <h2 className="font-heading text-xl font-black uppercase text-slate-900 dark:text-white">
                  Vos billets
                </h2>
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Choisissez votre tribune sur le plan. Le prix et les catégories disponibles s’actualisent selon le côté sélectionné.</span>
                </div>

                {hasStandMap && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                    <div className="grid grid-cols-[1fr_1.1fr_1fr] grid-rows-[auto_auto_auto] gap-2 text-center">
                      {(['DELACOURT'] as StandId[]).map((id) => {
                        const categories = standPrices(id);
                        return <button key={id} type="button" onClick={() => chooseStand(id)} disabled={!categories.length} className={`col-span-3 rounded-lg border p-2.5 text-xs font-bold transition ${selectedStand === id ? 'border-red-600 bg-red-700 text-white' : 'border-slate-300 bg-white text-slate-800 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-white'}`}>
                          NORD · TRIBUNE DELACOURT <span className="block mt-1 font-normal opacity-80">{categories.length ? `Dès ${formatPrice(Math.min(...categories.map((type) => type.price)))}` : 'Indisponible'}</span>
                        </button>;
                      })}
                      {(['LEPAGNOT'] as StandId[]).map((id) => {
                        const categories = standPrices(id);
                        return <button key={id} type="button" onClick={() => chooseStand(id)} disabled={!categories.length} className={`row-span-2 rounded-lg border p-2 text-[10px] font-bold transition sm:text-xs ${selectedStand === id ? 'border-red-600 bg-red-700 text-white' : 'border-slate-300 bg-white text-slate-800 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-white'}`}>
                          OUEST<br />TRIBUNE LEPAGNOT<span className="mt-2 block font-normal opacity-80">{categories.length ? `Dès ${formatPrice(Math.min(...categories.map((type) => type.price)))}` : 'Indisponible'}</span>
                        </button>;
                      })}
                      <div className="flex min-h-24 items-center justify-center rounded-lg border-2 border-dashed border-emerald-700 bg-emerald-100 px-2 text-[10px] font-black uppercase tracking-widest text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 sm:text-xs">Terrain</div>
                      {(['MAREK_XERCES'] as StandId[]).map((id) => {
                        const categories = standPrices(id);
                        return <button key={id} type="button" onClick={() => chooseStand(id)} disabled={!categories.length} className={`row-span-2 rounded-lg border p-2 text-[10px] font-bold transition sm:text-xs ${selectedStand === id ? 'border-red-600 bg-red-700 text-white' : 'border-slate-300 bg-white text-slate-800 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-white'}`}>
                          EST<br />TRIBUNE MAREK / XERCÈS<span className="mt-2 block font-normal opacity-80">{categories.length ? `Dès ${formatPrice(Math.min(...categories.map((type) => type.price)))}` : 'Indisponible'}</span>
                        </button>;
                      })}
                      {(['TRANNIN'] as StandId[]).map((id) => {
                        const categories = standPrices(id);
                        return <button key={id} type="button" onClick={() => chooseStand(id)} disabled={!categories.length} className={`col-span-3 rounded-lg border p-2.5 text-xs font-bold transition ${selectedStand === id ? 'border-red-600 bg-red-700 text-white' : 'border-slate-300 bg-white text-slate-800 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-white'}`}>
                          SUD · TRIBUNE TRANNIN <span className="block mt-1 font-normal opacity-80">{categories.length ? `Dès ${formatPrice(Math.min(...categories.map((type) => type.price)))}` : 'Indisponible'}</span>
                        </button>;
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {hasStandMap && !selectedStand && (
                    <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">Sélectionnez une tribune sur le plan pour afficher les billets et tarifs.</p>
                  )}
                  {selected.ticketTypes.map((type) => {
                    if (hasStandMap && type.standId !== selectedStand) return null;
                    const quantity = quantities[type.id] ?? 0;
                    const max = Math.min(type.maxPerOrder, type.available);
                    return (
                      <div
                        key={type.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors dark:border-slate-700 ${quantity > 0 ? 'border-red-500 bg-red-50/60 dark:bg-red-950/20' : 'border-slate-200'}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-start gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-amber-400" />
                            <span>{standInfo.find((stand) => stand.id === type.standId)?.label ?? ''}{type.standId ? ' · ' : ''}{type.name}</span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {formatPrice(type.price)} · {type.available} restant(s)
                          </div>
                          {type.description && (
                            <div className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                              {type.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="Retirer un billet"
                            onClick={() => changeQuantity(type.id, -1, max)}
                            disabled={quantity === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-7 text-center text-sm font-bold text-slate-900 dark:text-white">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Ajouter un billet"
                            onClick={() => changeQuantity(type.id, 1, max)}
                            disabled={quantity >= max}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {totalTickets} billet(s)
                  </span>
                  <span className="font-heading text-2xl font-black text-slate-900 dark:text-white">
                    {formatPrice(total)}
                  </span>
                </div>

                <h2 className="mt-6 font-heading text-xl font-black uppercase text-slate-900 dark:text-white">
                  Vos coordonnées
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Aucun compte requis. Votre bon de commande sera envoyé à cette adresse.
                </p>

                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Nom complet *
                    </span>
                    <input
                      value={buyer.name}
                      onChange={(event) =>
                        setBuyer({ ...buyer, name: event.target.value })
                      }
                      autoComplete="name"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      placeholder="Alexandre Dupont"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Adresse e-mail *
                    </span>
                    <input
                      type="email"
                      value={buyer.email}
                      onChange={(event) =>
                        setBuyer({ ...buyer, email: event.target.value })
                      }
                      autoComplete="email"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      placeholder="vous@exemple.fr"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Téléphone (facultatif)
                    </span>
                    <input
                      type="tel"
                      value={buyer.phone}
                      onChange={(event) =>
                        setBuyer({ ...buyer, phone: event.target.value })
                      }
                      autoComplete="tel"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      placeholder="06 12 34 56 78"
                    />
                  </label>
                </div>

                {submitError && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || totalTickets === 0}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Traitement…
                    </>
                  ) : (
                    <>
                      <Ticket className="h-4 w-4" /> Confirmer la commande ·{' '}
                      {formatPrice(total)}
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  Le règlement se fera par virement instantané après l’enregistrement de la commande.
                </p>
              </form>
            </div>
          </section>
        )}

        {step === 'success' && result && (
          <section className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm dark:border-emerald-900 dark:bg-slate-900 sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="mt-4 font-heading text-3xl font-black uppercase text-slate-900 dark:text-white">
                Commande enregistrée · virement en attente
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Merci {result.buyer.name} ! Effectuez le virement instantané avec le montant et le motif indiqués ci-dessous. Vos billets seront activés après réception du paiement. Un récapitulatif a été envoyé à{' '}
                <strong>{result.buyer.email}</strong>.
              </p>

              <div className="mt-6 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 dark:bg-amber-400/10">
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                  Votre numéro de bon de commande
                </div>
                <div className="mt-1 font-mono text-2xl font-black tracking-wider text-slate-900 dark:text-white sm:text-3xl">
                  {result.orderNumber}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Conservez-le précieusement : il permet de vérifier vos billets.
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left dark:border-amber-900 dark:bg-amber-950/30">
                <h2 className="font-heading text-lg font-black uppercase text-slate-900 dark:text-white">
                  Virement instantané SEPA
                </h2>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-slate-500 dark:text-slate-400">Titulaire</dt><dd className="font-bold text-slate-900 dark:text-white">{result.payment.accountHolder}</dd></div>
                  <div><dt className="text-xs text-slate-500 dark:text-slate-400">Montant exact</dt><dd className="font-bold text-slate-900 dark:text-white">{formatPrice(result.payment.amount)}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs text-slate-500 dark:text-slate-400">IBAN</dt><dd className="break-all font-mono font-bold text-slate-900 dark:text-white">{result.payment.iban}</dd></div>
                  <div><dt className="text-xs text-slate-500 dark:text-slate-400">BIC</dt><dd className="font-mono font-bold text-slate-900 dark:text-white">{result.payment.bic}</dd></div>
                  <div><dt className="text-xs text-slate-500 dark:text-slate-400">Motif obligatoire</dt><dd className="font-mono font-bold text-red-700 dark:text-amber-300">{result.payment.reference}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">Indiquez le motif exactement comme affiché afin que votre paiement soit rapproché de la commande.</p>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 text-left dark:border-slate-700">
                <div className="bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {result.event.title} · {result.event.formattedDate}
                </div>
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {result.tickets.map((ticket) => (
                    <li
                      key={ticket.code}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div>
                        <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          {ticket.code}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {ticket.typeName} · {ticket.beneficiaryName}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatPrice(ticket.price)}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between bg-slate-50 px-4 py-3 dark:bg-slate-800">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Total
                  </span>
                  <span className="font-heading text-xl font-black text-slate-900 dark:text-white">
                    {formatPrice(result.total)}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <a
                  href={`/verifier?commande=${encodeURIComponent(result.orderNumber)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800"
                >
                  <ShieldCheck className="h-4 w-4" /> Vérifier ma commande
                </a>
                <button
                  type="button"
                  onClick={backToCatalogue}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Réserver un autre événement
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
