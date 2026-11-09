import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, ShieldCheck, Ticket } from 'lucide-react';
import { PublicFooter, PublicHeader } from '../components/PublicHeader';
import { DigitalStadium, DigitalStand } from '../components/DigitalStadium';
import { eventsApi, getErrorMessage } from '../services/api';
import { Sector, StandId, TicketingEvent } from '../types/ticketing';

const STANDS: Array<Omit<DigitalStand, 'price' | 'availableSeats'>> = [
  { id: 'DELACOURT', label: 'Delacourt', direction: 'À droite', color: '#059669' },
  { id: 'TRANNIN', label: 'Trannin', direction: 'À gauche', color: '#2563eb' },
  { id: 'MAREK_XERCES', label: 'Marek / Xercès', direction: 'En haut · kop', color: '#dc2626' },
  { id: 'LEPAGNOT', label: 'Lepagnot', direction: 'En bas · honneur', color: '#d97706' }
];

function money(value: number) { return `${value.toFixed(2).replace('.', ',')} €`; }

export default function EventDetailPage({ slug }: { slug: string }) {
  const [event, setEvent] = useState<TicketingEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStand, setSelectedStand] = useState<StandId | null>(null);

  useEffect(() => {
    let alive = true;
    eventsApi.get(slug).then((data) => { if (alive) setEvent(data); })
      .catch((reason) => { if (alive) setError(getErrorMessage(reason)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => { if (event) document.title = `${event.title} | Billetterie RC Lens`; }, [event]);

  const stands = useMemo<DigitalStand[]>(() => STANDS.map((stand) => {
    const types = event?.ticketTypes.filter((type) => type.active !== false && type.standId === stand.id && type.available > 0) ?? [];
    return { ...stand, price: types.length ? Math.min(...types.map((type) => type.price)) : null, availableSeats: types.reduce((sum, type) => sum + type.available, 0) };
  }), [event]);
  const sectors = useMemo<Sector[]>(() => (event?.ticketTypes ?? []).flatMap((type, index) => {
    if (type.standId == null || type.active === false || type.available <= 0) return [];
    const stand = STANDS.find((item) => item.id === type.standId);
    if (!stand) return [];
    return [{ id: type.id, standId: type.standId, name: type.name, code: `CAT-${String(index + 1).padStart(2, '0')}`, category: index + 1, categoryName: type.name, price: type.price, reducedPrice: type.price, totalSeats: type.stock, availableSeats: type.available, gate: type.description || `Accès ${stand.label}`, viewAngleDescription: type.description || `${stand.label} · ${stand.direction}` }];
  }), [event]);
  const visibleTypes = (event?.ticketTypes ?? []).filter((type) => type.active !== false && (selectedStand === null || type.standId === selectedStand));

  if (loading) return <div className="min-h-screen bg-[#fcf9f8]"><PublicHeader active="events" /><div className="mx-auto max-w-5xl px-4 py-24 text-center text-slate-500">Chargement de l’événement…</div></div>;
  if (!event) return <div className="min-h-screen bg-[#fcf9f8] dark:bg-slate-950"><PublicHeader active="events" /><main className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="font-heading text-3xl font-black uppercase">Événement introuvable</h1><p className="mt-3 text-sm text-slate-500">{error || 'Cet événement n’est plus disponible ou son adresse a changé.'}</p><a href="/evenements" className="mt-6 inline-flex items-center gap-2 font-bold text-red-700"><ArrowLeft className="h-4 w-4" /> Retour aux événements</a></main><PublicFooter /></div>;

  const availableTypes = event.ticketTypes.filter((type) => type.active !== false && type.available > 0);
  const reserveUrl = `/evenements?event=${encodeURIComponent(event.slug)}`;

  return (
    <div className="min-h-screen bg-[#fcf9f8] dark:bg-slate-950">
      <PublicHeader active="events" />
      <main>
        <section className="relative isolate flex min-h-[390px] items-end overflow-hidden bg-[#101c37] sm:min-h-[510px]">
          <img src={event.imageUrl || '/images/stadium_pitch_aerial_1794048534631.jpg'} alt={event.title} className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#081126] via-[#081126]/65 to-[#081126]/10" />
          <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-20 sm:px-6 sm:pb-12"><a href="/evenements" className="inline-flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white"><ArrowLeft className="h-4 w-4" /> Tous les événements</a><div className="mt-8 max-w-4xl text-white"><span className="inline-block rounded bg-[#fed100] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#201800]">{event.category}</span><h1 className="mt-3 font-heading text-4xl font-black uppercase leading-[.95] sm:text-6xl lg:text-7xl">{event.title}</h1><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/85 sm:text-sm"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#fed100]" />{event.formattedDate}</span><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#fed100]" />{event.venue}</span>{event.doorsOpen && <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#fed100]" />Ouverture des portes : {event.doorsOpen}</span>}</div><a href={reserveUrl} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#fed100] px-6 font-heading text-sm font-black uppercase text-[#201800]">{availableTypes.length ? `Réserver dès ${money(event.minPrice)}` : 'Voir les informations'} <ArrowRight className="h-4 w-4" /></a></div></div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-14">
          <div className="min-w-0">
            <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7"><p className="text-[10px] font-black uppercase tracking-[.2em] text-red-700 dark:text-amber-400">Le rendez-vous</p><h2 className="mt-2 font-heading text-2xl font-black uppercase">Vivez l’événement à Bollaert</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">{event.description || `Retrouvez le RC Lens au stade Bollaert-Delelis pour ${event.title}. Consultez les tribunes et les catégories disponibles avant de réserver.`}</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{[{ Icon: CalendarDays, label: 'Date', value: event.formattedDate }, { Icon: MapPin, label: 'Lieu', value: event.venue }, { Icon: Ticket, label: 'Tarif', value: availableTypes.length ? `Dès ${money(event.minPrice)}` : 'Indisponible' }].map(({ Icon, label, value }) => <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400"><Icon className="h-4 w-4 text-red-700 dark:text-amber-400" />{label}</div><div className="mt-2 text-xs font-bold text-slate-800 dark:text-white">{value}</div></div>)}</div></section>

            <section className="mt-8"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.2em] text-red-700 dark:text-amber-400">Choisissez votre côté</p><h2 className="mt-1 font-heading text-2xl font-black uppercase sm:text-3xl">Le stade, vu du dessus</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Touchez une tribune pour voir ses tarifs et disponibilités.</p></div><DigitalStadium stands={stands} sectors={sectors} selectedStand={selectedStand} selectedSectorId={null} onSelectStand={(id) => setSelectedStand((current) => current === id ? null : id)} onSelectSector={() => undefined} /></section>

            <section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-red-700 dark:text-amber-400">Offres disponibles</p><h2 className="mt-1 font-heading text-2xl font-black uppercase">Catégories et tarifs</h2></div>{selectedStand && <button type="button" onClick={() => setSelectedStand(null)} className="text-xs font-bold text-red-700 hover:underline dark:text-amber-400">Voir toutes les tribunes</button>}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">{visibleTypes.map((type) => { const stand = STANDS.find((item) => item.id === type.standId); return <article key={type.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><h3 className="font-heading text-lg font-black uppercase">{type.name}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stand ? `Tribune ${stand.label} · ${stand.direction}` : 'Placement selon disponibilité'}</p>{type.description && <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{type.description}</p>}</div><div className="shrink-0 text-right"><div className="font-heading text-xl font-black">{money(type.price)}</div><div className="mt-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{type.available} disponible{type.available > 1 ? 's' : ''}</div></div></div><a href={reserveUrl} className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#ba0819] px-4 text-xs font-black uppercase text-white hover:bg-red-800">Choisir cette catégorie <ArrowRight className="h-4 w-4" /></a></article>; })}</div>
              {visibleTypes.length === 0 && <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{availableTypes.length ? 'Aucune catégorie dans cette tribune.' : 'Aucun billet disponible pour le moment.'}</div>}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start"><div className="rounded-xl bg-[#101c37] p-5 text-white shadow-lg"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#fed100]">Préparez votre venue</p><h2 className="mt-2 font-heading text-2xl font-black uppercase">On se retrouve à Bollaert ?</h2><p className="mt-2 text-xs leading-5 text-white/70">Les billets sont réservés en quelques étapes. Vous recevrez votre récapitulatif et les instructions de paiement par e-mail.</p><a href={reserveUrl} className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded bg-[#fed100] px-4 text-xs font-black uppercase text-[#201800]">Accéder à la réservation <ArrowRight className="h-4 w-4" /></a></div><div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h3 className="font-heading text-base font-black uppercase">À retenir</h3><ul className="mt-3 space-y-3 text-xs text-slate-600 dark:text-slate-300"><li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />Choisissez la tribune avant le tarif.</li><li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />Le stock affiché est lié à cet événement.</li><li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />Aucun compte client n’est nécessaire.</li><li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />Suivez votre commande avec son numéro.</li></ul><a href="/verifier" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-red-700 dark:text-amber-400"><ShieldCheck className="h-4 w-4" />Retrouver une commande</a></div></aside>
        </div>
        <section className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-900"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 sm:flex-row sm:items-center sm:px-6"><div><h2 className="font-heading text-xl font-black uppercase">Envie de vivre l’événement ?</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Consultez les disponibilités et complétez le formulaire de réservation.</p></div><a href={reserveUrl} className="inline-flex min-h-11 items-center gap-2 rounded bg-red-700 px-5 text-xs font-black uppercase text-white">Réserver mes billets <ArrowRight className="h-4 w-4" /></a></div></section>
      </main>
      <PublicFooter />
    </div>
  );
}
