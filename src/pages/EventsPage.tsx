import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Ticket
} from 'lucide-react';
import { PublicFooter, PublicHeader } from '../components/PublicHeader';
import { eventsApi, getErrorMessage } from '../services/api';
import { GuestOrderResult, TicketingEvent } from '../types/ticketing';

type Step = 'catalogue' | 'checkout' | 'success';

function formatPrice(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<TicketingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<TicketingEvent | null>(null);
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
    setStep('checkout');
    setResult(null);
    setSubmitError(null);
    setQuantities({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function backToCatalogue() {
    setSelected(null);
    setStep('catalogue');
    setResult(null);
    setSubmitError(null);
  }

  const lines = useMemo(() => {
    if (!selected) return [];
    return selected.ticketTypes
      .map((type) => ({ type, quantity: quantities[type.id] ?? 0 }))
      .filter((line) => line.quantity > 0);
  }, [selected, quantities]);

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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {step === 'catalogue' && (
          <>
            <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-red-700 via-red-800 to-slate-950 p-6 text-white shadow-xl sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                Billets à l’unité · sans compte
              </div>
              <h1 className="mt-4 font-heading text-4xl font-black uppercase leading-none sm:text-6xl">
                Vivez l’émotion <span className="text-amber-400">Sang et Or</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-white/80 sm:text-base">
                Choisissez votre événement, réservez vos billets en quelques clics et
                recevez immédiatement votre bon de commande par e-mail. Aucun compte
                n’est nécessaire.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-white/80">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-400" /> Commande sécurisée
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                  <Mail className="h-4 w-4 text-amber-400" /> Confirmation par e-mail
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                  <Ticket className="h-4 w-4 text-amber-400" /> Vérification par bon de commande
                </span>
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-heading text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    Prochains événements
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Matchs, visites et expériences à Bollaert-Delelis.
                  </p>
                </div>
                <a
                  href="/verifier"
                  className="hidden items-center gap-1.5 text-sm font-semibold text-red-700 hover:underline dark:text-amber-400 sm:flex"
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

              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => {
                  const soldOut = event.availableStock <= 0;
                  return (
                    <article
                      key={event.id}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="relative h-40 overflow-hidden bg-slate-200 dark:bg-slate-800">
                        {event.imageUrl ? (
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
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

                <div className="mt-4 space-y-3">
                  {selected.ticketTypes.map((type) => {
                    const quantity = quantities[type.id] ?? 0;
                    const max = Math.min(type.maxPerOrder, type.available);
                    return (
                      <div
                        key={type.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {type.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {formatPrice(type.price)} · {type.available} restant(s)
                          </div>
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
