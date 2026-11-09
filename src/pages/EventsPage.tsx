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
  Search,
  ShieldCheck,
  Sparkles,
  Ticket
} from 'lucide-react';
import { PublicFooter, PublicHeader } from '../components/PublicHeader';
import { DigitalStadium } from '../components/DigitalStadium';
import { eventsApi, getErrorMessage } from '../services/api';
import { GuestOrderResult, Match, Sector, StandId, TicketingEvent } from '../types/ticketing';

type Step = 'catalogue' | 'checkout' | 'success';

function formatPrice(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

const STANDS: Array<{ id: StandId; label: string; side: string; color: string }> = [
  { id: 'DELACOURT', label: 'Delacourt', side: 'Nord · but nord', color: '#059669' },
  { id: 'TRANNIN', label: 'Trannin', side: 'Sud · but sud', color: '#2563eb' },
  { id: 'MAREK_XERCES', label: 'Marek / Xercès', side: 'Est · kop', color: '#dc2626' },
  { id: 'LEPAGNOT', label: 'Lepagnot', side: 'Ouest · honneur', color: '#d97706' }
];

interface HomepageHeroProps {
  event: TicketingEvent | null;
  events: TicketingEvent[];
  loading: boolean;
  onReserve: (event: TicketingEvent) => void;
}

const HomepageHero: React.FC<HomepageHeroProps> = ({ event, events, loading, onReserve }) => {
  const [now, setNow] = useState(Date.now());
  const target = event ? new Date(event.eventDate).getTime() : NaN;

  useEffect(() => {
    if (!Number.isFinite(target) || target <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  const secondsRemaining = Number.isFinite(target) && target > now
    ? Math.floor((target - now) / 1000)
    : null;
  const countdown = secondsRemaining === null ? null : [
    { label: 'Jours', value: Math.floor(secondsRemaining / 86400) },
    { label: 'Heures', value: Math.floor((secondsRemaining % 86400) / 3600) },
    { label: 'Minutes', value: Math.floor((secondsRemaining % 3600) / 60) },
    { label: 'Secondes', value: secondsRemaining % 60 }
  ];
  const otherEvents = events.filter((item) => item.id !== event?.id).slice(0, 2);

  return (
    <section className="w-full bg-[#f6f3f2] pb-5">
      <div className="relative aspect-[1.12] w-full overflow-hidden bg-slate-900 sm:aspect-[1.8] lg:aspect-[2.55]">
        <img
          src={event?.imageUrl || '/images/hero_bollaert_atmosphere_1794048534296.jpg'}
          alt={event ? `Affiche de ${event.title}` : 'Ambiance des tribunes du stade Bollaert-Delelis'}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/5" />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl flex-col items-stretch gap-3 p-4 sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
          <div className="max-w-3xl text-white">
            <span className="inline-flex rounded-sm bg-[#fed100] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#231b00]">{event?.category ?? 'Sang et Or'}</span>
            <h1 className="mt-2 font-heading text-3xl font-black uppercase leading-none sm:text-5xl lg:text-6xl">{event?.title ?? 'Vivez Bollaert en Sang et Or'}</h1>
            {event && <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-white/85 sm:text-sm">{event.formattedDate} · {event.venue}</p>}
          </div>
          {event ? (
            <button type="button" onClick={() => onReserve(event)} disabled={event.availableStock <= 0} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded bg-[#fed100] px-5 py-3 font-heading text-base font-black uppercase tracking-wide text-[#231b00] shadow-md transition hover:brightness-105 active:translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300">
              {event.availableStock > 0 ? 'Réserver mes billets' : 'Complet'} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <a href="#evenements" className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-[#fed100] px-5 py-3 font-heading text-base font-black uppercase tracking-wide text-[#231b00] shadow-md">Voir les événements <ArrowRight className="h-4 w-4" /></a>
          )}
        </div>
      </div>

      {event && countdown && (
        <div className="relative z-10 mx-4 -mt-2 rounded-xl bg-white p-2 shadow-lg sm:mx-auto sm:max-w-3xl sm:p-3">
          <div className="grid grid-cols-4 gap-1.5 text-center sm:gap-2">
            {countdown.map((unit) => (
              <div key={unit.label} className="flex flex-col items-center justify-center rounded-lg bg-[#fed100] px-1 py-2 text-[#231b00] sm:py-3">
                <span className="font-heading text-2xl font-black leading-none sm:text-4xl">{String(unit.value).padStart(2, '0')}</span>
                <span className="mt-1 text-[9px] font-black uppercase tracking-wider sm:text-[10px]">{unit.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto mt-4 grid max-w-7xl gap-3 px-4 sm:grid-cols-2 sm:px-6">
        {otherEvents.length ? otherEvents.map((item) => (
          <button key={item.id} type="button" onClick={() => onReserve(item)} className="group relative flex min-h-24 items-end overflow-hidden rounded-lg bg-slate-900 text-left shadow-sm sm:min-h-32">
            <img src={item.imageUrl || '/images/stadium_pitch_aerial_1794048534631.jpg'} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
            <span className="relative z-10 flex w-full items-center justify-between gap-3 p-3 text-white sm:p-4">
              <span><span className="block text-[9px] font-black uppercase tracking-widest text-[#fed100]">{item.category} · {item.formattedDate}</span><span className="mt-1 block font-heading text-lg font-black uppercase sm:text-xl">{item.title}</span></span>
              <ArrowRight className="h-5 w-5 shrink-0 text-[#fed100]" />
            </span>
          </button>
        )) : (
          <>
            <a href="#stade" className="flex min-h-24 items-center justify-between gap-3 rounded-lg bg-[#fed100] p-4 text-[#231b00] shadow-sm transition hover:brightness-105 sm:min-h-32 sm:px-6"><span><span className="block text-[9px] font-black uppercase tracking-widest">Bollaert-Delelis</span><span className="mt-1 block font-heading text-xl font-black uppercase">Explorez le stade</span></span><MapPinned className="h-7 w-7" /></a>
            <a href="/verifier" className="flex min-h-24 items-center justify-between gap-3 rounded-lg bg-[#0d1b3e] p-4 text-white shadow-sm transition hover:brightness-110 sm:min-h-32 sm:px-6"><span><span className="block text-[9px] font-black uppercase tracking-widest text-[#fed100]">Votre espace commande</span><span className="mt-1 block font-heading text-xl font-black uppercase">Retrouvez vos billets</span></span><ShieldCheck className="h-7 w-7 text-[#fed100]" /></a>
          </>
        )}
      </div>
      {!event && loading && <p className="mt-3 text-center text-xs text-slate-500">Chargement du prochain événement…</p>}
    </section>
  );
};

export default function EventsPage() {
  const [events, setEvents] = useState<TicketingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<TicketingEvent | null>(null);
  const [selectedStand, setSelectedStand] = useState<StandId | null>(null);
  const [exploreStand, setExploreStand] = useState<StandId | null>(null);
  const [eventSearch, setEventSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [eventSort, setEventSort] = useState<'date' | 'price'>('date');
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
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
    setSelectedSectorId(null);
    setStep('checkout');
    setResult(null);
    setSubmitError(null);
    setQuantities({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function backToCatalogue() {
    setSelected(null);
    setSelectedStand(null);
    setSelectedSectorId(null);
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

  const eventSectors = useMemo<Sector[]>(() => {
    if (!selected) return [];
    return selected.ticketTypes.flatMap((type, index) => {
      if (!type.standId || !type.active || type.available <= 0) return [];
      const stand = STANDS.find((item) => item.id === type.standId)!;
      return [{
        id: type.id,
        standId: type.standId,
        name: type.name,
        code: `CAT-${String(index + 1).padStart(2, '0')}`,
        category: index + 1,
        categoryName: type.name,
        price: type.price,
        reducedPrice: type.price,
        totalSeats: type.stock,
        availableSeats: type.available,
        gate: type.description || `Accès ${stand.label}`,
        viewAngleDescription: type.description || `${stand.label} · ${stand.side}`
      }];
    });
  }, [selected]);

  const eventMapMatch = useMemo<Match | null>(() => {
    if (!selected) return null;
    const stands = Object.fromEntries(STANDS.map((stand) => {
      const types = selected.ticketTypes.filter((type) => type.standId === stand.id && type.active && type.available > 0);
      const availableSeats = types.reduce((sum, type) => sum + type.available, 0);
      return [stand.id, {
        id: stand.id,
        name: `Tribune ${stand.label}`,
        category: stand.side,
        price: types.length ? Math.min(...types.map((type) => type.price)) : selected.minPrice,
        availableSeats,
        isSoldOut: availableSeats <= 0,
        accentColor: stand.color
      }];
    })) as Match['stands'];
    return {
      id: selected.id,
      opponent: selected.opponent || selected.title,
      opponentShort: (selected.opponent || selected.title).slice(0, 12),
      opponentLogo: '',
      opponentColor: '#dc2626',
      homeTeam: 'RC Lens',
      competition: selected.category as Match['competition'],
      round: selected.category,
      date: selected.eventDate,
      formattedDate: selected.formattedDate,
      time: '',
      venue: selected.venue,
      status: 'open',
      minPrice: selected.minPrice,
      featured: selected.featured,
      bannerImage: selected.imageUrl ?? undefined,
      stands
    };
  }, [selected]);

  const featuredEvent = [...events]
    .filter((event) => new Date(event.eventDate).getTime() >= Date.now())
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())[0]
    ?? events.find((event) => event.featured)
    ?? events[0]
    ?? null;
  const eventCategories = useMemo(
    () => [...new Set(events.map((event) => event.category))].sort((a, b) => a.localeCompare(b, 'fr')),
    [events]
  );
  const visibleEvents = useMemo(() => {
    const search = eventSearch
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fr');
    return events
      .filter((event) => {
        const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
        const searchableText = `${event.title} ${event.opponent ?? ''} ${event.venue} ${event.category} ${event.description}`
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('fr');
        return matchesCategory && (!search || searchableText.includes(search));
      })
      .sort((a, b) => eventSort === 'price'
        ? a.minPrice - b.minPrice || new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
        : new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }, [events, eventSearch, categoryFilter, eventSort]);

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
    setSelectedSectorId(null);
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
    <div className={`min-h-screen bg-[#fcf9f8] dark:bg-slate-950 ${step === 'catalogue' ? 'pb-16 md:pb-0' : ''}`}>
      <PublicHeader active="events" />

      <main className={step === 'catalogue' ? 'mx-auto w-full max-w-7xl px-0 pb-8' : step === 'checkout' ? 'mx-auto max-w-6xl px-4 pb-40 pt-6 sm:px-6 sm:py-12 sm:pb-12' : 'mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12'}>
        {step === 'catalogue' && (
          <>
            <HomepageHero
              event={featuredEvent}
              events={events}
              loading={loading}
              onReserve={(event) => window.location.assign(`/evenements/${encodeURIComponent(event.slug)}`)}
            />

            <section id="evenements" className="scroll-mt-24 bg-[#fcf9f8] px-4 py-9 sm:px-6 sm:py-12">
              <div className="mb-6 flex flex-col items-center justify-center text-center">
                <Ticket className="mb-1 h-7 w-7 text-[#ba0819]" />
                <h2 className="font-heading text-3xl font-black uppercase tracking-tight text-[#121212] sm:text-4xl">
                  Les prochains événements
                </h2>
                <div className="mt-2 h-1 w-10 rounded-full bg-[#fed100]" />
                <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                  Matchs, visites et expériences disponibles à Bollaert-Delelis.
                </p>
                <a href="/verifier" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#ba0819] hover:underline"><ShieldCheck className="h-4 w-4" /> Retrouver une commande</a>
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

              {!loading && !loadError && events.length > 0 && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_200px]">
                    <label className="relative block">
                      <span className="sr-only">Rechercher un événement</span>
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={eventSearch}
                        onChange={(event) => setEventSearch(event.target.value)}
                        placeholder="Rechercher un match, un lieu…"
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                    <label className="block">
                      <span className="sr-only">Filtrer par type</span>
                      <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="all">Tous les types</option>
                        {eventCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="sr-only">Trier les événements</span>
                      <select
                        value={eventSort}
                        onChange={(event) => setEventSort(event.target.value as 'date' | 'price')}
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="date">Trier par date</option>
                        <option value="price">Trier par prix croissant</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{visibleEvents.length} événement{visibleEvents.length > 1 ? 's' : ''} affiché{visibleEvents.length > 1 ? 's' : ''}</span>
                    {(eventSearch || categoryFilter !== 'all' || eventSort !== 'date') && (
                      <button type="button" onClick={() => { setEventSearch(''); setCategoryFilter('all'); setEventSort('date'); }} className="font-bold text-red-700 hover:underline dark:text-amber-400">Réinitialiser les filtres</button>
                    )}
                  </div>
                </div>
              )}

              {!loading && !loadError && events.length > 0 && visibleEvents.length === 0 && (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                  <Search className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">Aucun événement ne correspond à ces critères.</p>
                  <button type="button" onClick={() => { setEventSearch(''); setCategoryFilter('all'); setEventSort('date'); }} className="mt-2 text-sm font-bold text-red-700 hover:underline dark:text-amber-400">Effacer la recherche et les filtres</button>
                </div>
              )}

              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleEvents.map((event) => {
                  const isEuropean = /uefa|europe|champions/i.test(event.category);
                  return (
                    <article
                      key={event.id}
                      className={`group flex flex-col overflow-hidden rounded-lg border shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl ${isEuropean ? 'border-[#25375b] bg-[#0d1b3e] text-white' : 'border-[#e3bd00] bg-[#fed100] text-[#121212]'}`}
                    >
                      <div className="relative h-40 overflow-hidden bg-slate-200 sm:h-48">
                        {event.imageUrl ? (
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                        ) : (
                            <div className={`flex h-full w-full items-center justify-center ${isEuropean ? 'bg-gradient-to-br from-[#243967] to-[#0d1b3e]' : 'bg-gradient-to-br from-[#ffe56e] to-[#fed100]'}`}>
                            <Ticket className={`h-10 w-10 ${isEuropean ? 'text-[#fed100]' : 'text-[#ba0819]'}`} />
                          </div>
                        )}
                        <span className={`absolute left-3 top-3 rounded-sm px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${isEuropean ? 'bg-black/40 text-[#ffe07d]' : 'bg-white/60 text-[#5a4800]'}`}>
                          {event.category}
                        </span>
                        {event.featured && (
                            <span className="absolute right-3 top-3 rounded-sm bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#ba0819]">
                            À la une
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className={`font-heading text-xl font-black uppercase leading-tight ${isEuropean ? 'text-white' : 'text-[#121212]'}`}>
                          {event.title}
                        </h3>
                        <div className={`mt-2 space-y-1 text-xs ${isEuropean ? 'text-white/75' : 'text-[#453900]'}`}>
                          <p className="flex items-center gap-1.5">
                            <CalendarDays className={`h-3.5 w-3.5 ${isEuropean ? 'text-[#fed100]' : 'text-[#ba0819]'}`} />
                            {event.formattedDate}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPin className={`h-3.5 w-3.5 ${isEuropean ? 'text-[#fed100]' : 'text-[#ba0819]'}`} />
                            {event.venue}
                          </p>
                          {event.doorsOpen && (
                            <p className="flex items-center gap-1.5">
                              <Clock className={`h-3.5 w-3.5 ${isEuropean ? 'text-[#fed100]' : 'text-[#ba0819]'}`} />
                              Ouverture des portes : {event.doorsOpen}
                            </p>
                          )}
                        </div>
                        <p className={`mt-3 line-clamp-3 text-sm ${isEuropean ? 'text-white/75' : 'text-[#453900]'}`}>
                          {event.description}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                          <div>
                              <div className={`text-[10px] font-bold uppercase tracking-wider ${isEuropean ? 'text-white/50' : 'text-[#6c5700]'}`}>
                              À partir de
                            </div>
                            <div className={`font-heading text-2xl font-black ${isEuropean ? 'text-white' : 'text-[#121212]'}`}>
                              {formatPrice(event.minPrice)}
                            </div>
                          </div>
                          <a
                            href={`/evenements/${encodeURIComponent(event.slug)}`}
                            className={`rounded px-4 py-2.5 font-heading text-sm font-black uppercase tracking-wide shadow-sm transition ${isEuropean ? 'bg-[#fed100] text-[#231b00] hover:brightness-105' : 'bg-[#111111] text-white hover:bg-black'}`}
                          >
                            Découvrir
                          </a>
                        </div>
                        {event.availableStock > 0 && (
                          <p className="mt-2 text-right text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            {event.availableStock} billet(s) disponible(s)
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

            <section id="stade" className="mt-12 scroll-mt-24 px-4 sm:mt-16 sm:px-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-700 dark:text-amber-400">Entrez dans Bollaert</div>
                  <h2 className="mt-1 font-heading text-3xl font-black uppercase text-slate-900 dark:text-white sm:text-4xl">Explorez le stade en numérique</h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Parcourez les quatre tribunes dans une maquette isométrique. Choisissez un événement pour consulter ensuite les tarifs et les catégories disponibles.</p>
                </div>
                <a href="#evenements" className="inline-flex w-fit items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-xs font-bold uppercase text-white transition hover:bg-red-800">Choisir un événement <ArrowRight className="h-4 w-4" /></a>
              </div>
              <DigitalStadium
                stands={STANDS.map((stand) => ({ ...stand, direction: stand.side, price: null, availableSeats: null }))}
                sectors={[]}
                selectedStand={exploreStand}
                selectedSectorId={null}
                onSelectStand={setExploreStand}
                onSelectSector={() => undefined}
                showPricing={false}
              />
            </section>

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
                  <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                    <h2 className="font-heading text-lg font-black uppercase text-slate-900 dark:text-white">Informations pratiques</h2>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"><CalendarDays className="h-3.5 w-3.5 text-red-600 dark:text-amber-400" />Date et horaire</div><div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{selected.formattedDate}</div></div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"><MapPin className="h-3.5 w-3.5 text-red-600 dark:text-amber-400" />Lieu</div><div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{selected.venue}</div></div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"><Clock className="h-3.5 w-3.5 text-red-600 dark:text-amber-400" />Ouverture des portes</div><div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{selected.doorsOpen || 'Horaire non communiqué'}</div></div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"><Ticket className="h-3.5 w-3.5 text-red-600 dark:text-amber-400" />Disponibilité</div><div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{selected.availableStock} billet(s) en stock</div></div>
                    </div>
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />Votre réservation est sans compte. Le total est calculé selon la tribune, la catégorie et les quantités choisies; les détails de paiement vous seront communiqués après l’envoi de la commande.</div>
                  </div>
                </div>
              </div>

              <form
                id="checkout-form"
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
                  eventMapMatch && (
                    <div className="mt-4">
                      <DigitalStadium
                        stands={STANDS.map((stand) => ({
                          ...stand,
                          direction: stand.side,
                          price: eventMapMatch.stands[stand.id].price,
                          availableSeats: eventMapMatch.stands[stand.id].availableSeats
                        }))}
                        sectors={eventSectors}
                        selectedStand={selectedStand}
                        selectedSectorId={selectedSectorId}
                        onSelectStand={chooseStand}
                        onSelectSector={(sector) => {
                          setSelectedStand(sector.standId);
                          setSelectedSectorId(sector.id);
                          setQuantities({});
                        }}
                      />
                    </div>
                  )
                )}

                <div className="mt-4 space-y-3">
                  {selected.ticketTypes.map((type) => {
                    if (hasStandMap && type.standId !== selectedStand) return null;
                    const quantity = quantities[type.id] ?? 0;
                    const max = Math.min(type.maxPerOrder, type.available);
                    return (
                      <div
                        key={type.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors dark:border-slate-700 ${quantity > 0 || selectedSectorId === type.id ? 'border-red-500 bg-red-50/60 dark:bg-red-950/20' : 'border-slate-200'}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-start gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-amber-400" />
                            <span>{STANDS.find((stand) => stand.id === type.standId)?.label ?? ''}{type.standId ? ' · ' : ''}{type.name}</span>
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
                  className="mt-5 hidden w-full items-center justify-center gap-2 rounded bg-[#111111] px-4 py-3 font-heading text-sm font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:flex"
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

      {step === 'checkout' && selected && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-6px_20px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 sm:hidden">
          <div className="mx-auto max-w-2xl">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-widest text-[#ba0819]">
                  {selectedStand ? `Tribune ${STANDS.find((stand) => stand.id === selectedStand)?.label}` : 'Votre sélection'}
                </div>
                <div className="truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {lines.length
                    ? lines.map((line) => `${line.quantity} × ${line.type.name}`).join(' · ')
                    : 'Choisissez vos billets pour voir le total'}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total</div>
                <div className="font-heading text-xl font-black leading-none text-[#121212] dark:text-white">{formatPrice(total)}</div>
              </div>
            </div>
            <button
              type="submit"
              form="checkout-form"
              disabled={submitting || totalTickets === 0}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded bg-[#fed100] px-4 py-2.5 font-heading text-sm font-black uppercase tracking-wide text-[#231b00] transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Traitement…</> : <>Confirmer la commande <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      )}

      {step === 'catalogue' && (
        <nav aria-label="Navigation rapide" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-1px_8px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
          <div className="mx-auto grid h-16 max-w-lg grid-cols-3 items-center px-2">
            <a href="#evenements" className="flex flex-col items-center justify-center gap-0.5 text-[#ba0819]"><Ticket className="h-5 w-5" /><span className="font-heading text-[10px] font-bold uppercase">Billetterie</span></a>
            <a href="#stade" className="flex flex-col items-center justify-center gap-0.5 text-slate-600 dark:text-slate-300"><MapPinned className="h-5 w-5" /><span className="font-heading text-[10px] font-bold uppercase">Bollaert</span></a>
            <a href="/verifier" className="flex flex-col items-center justify-center gap-0.5 text-slate-600 dark:text-slate-300"><ShieldCheck className="h-5 w-5" /><span className="font-heading text-[10px] font-bold uppercase">Mes billets</span></a>
          </div>
        </nav>
      )}

      <PublicFooter />
    </div>
  );
}
