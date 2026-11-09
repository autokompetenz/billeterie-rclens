import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, ShieldCheck, Ticket, Users } from 'lucide-react';
import { PublicFooter, PublicHeader } from '../components/PublicHeader';
import { eventsApi, getErrorMessage } from '../services/api';
import { TicketingEvent } from '../types/ticketing';

function dateParts(iso: string) {
  const date = new Date(iso);
  return {
    day: new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', '').toUpperCase(),
    full: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(date)
  };
}

export default function HomePage() {
  const [events, setEvents] = useState<TicketingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    eventsApi.list().then((data) => { if (alive) setEvents(data); })
      .catch((reason) => { if (alive) setError(getErrorMessage(reason)); })
      .finally(() => { if (alive) setLoading(false); });
    document.title = 'Billetterie RC Lens | Vivez Bollaert';
    return () => { alive = false; };
  }, []);

  const upcoming = events.filter((event) => new Date(event.eventDate).getTime() >= Date.now());
  const featured = upcoming.find((event) => event.featured) ?? upcoming[0] ?? events[0];
  const highlights = upcoming.filter((event) => event.id !== featured?.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-slate-900 dark:bg-slate-950 dark:text-white">
      <PublicHeader active="home" />
      <main>
        <section className="relative isolate min-h-[520px] overflow-hidden bg-[#09152e] sm:min-h-[620px]">
          <img src={featured?.imageUrl || '/images/hero_bollaert_atmosphere_1794048534296.jpg'} alt="Le stade Bollaert-Delelis" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#071126]/95 via-[#071126]/65 to-[#071126]/10" />
          <div className="mx-auto flex min-h-[520px] max-w-7xl items-end px-4 pb-10 pt-20 sm:min-h-[620px] sm:px-6 sm:pb-16 lg:items-center">
            <div className="max-w-3xl text-white">
              <span className="inline-flex items-center gap-2 rounded bg-[#fed100] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[#201800]"><span className="h-2 w-2 rounded-full bg-red-700" /> Le stade vous attend</span>
              <h1 className="mt-5 font-heading text-5xl font-black uppercase leading-[.9] sm:text-7xl lg:text-8xl">À Bollaert,<br /><span className="text-[#fed100]">on ne vient</span><br />jamais seul.</h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/80 sm:text-lg sm:leading-7">Retrouvez les prochains matchs et expériences du RC Lens. Choisissez votre événement, votre tribune, puis recevez votre confirmation directement par e-mail.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a href={featured ? `/evenements/${encodeURIComponent(featured.slug)}` : '/evenements'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#fed100] px-6 font-heading text-sm font-black uppercase text-[#201800] transition hover:brightness-105">{featured ? 'Découvrir le prochain événement' : 'Voir les événements'} <ArrowRight className="h-4 w-4" /></a>
                <a href="/evenements" className="inline-flex min-h-12 items-center justify-center rounded border border-white/50 px-6 text-sm font-bold text-white transition hover:bg-white/10">Tous les événements</a>
              </div>
              {featured && <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-white/80"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#fed100]" />{dateParts(featured.eventDate).full}</span><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#fed100]" />{featured.venue}</span></div>}
            </div>
          </div>
          <div className="absolute bottom-0 right-0 hidden w-1/3 max-w-sm translate-y-1/3 rotate-[-8deg] bg-[#fed100] px-5 py-4 text-center font-heading text-sm font-black uppercase tracking-[.2em] text-[#201800] lg:block">Sang et Or · depuis 1906</div>
        </section>

        <section className="relative z-10 mx-auto -mt-5 grid max-w-7xl gap-3 px-4 sm:grid-cols-3 sm:px-6">
          {[
            { Icon: Ticket, title: 'Billets officiels', body: 'Les événements publiés par votre billetterie.' },
            { Icon: ShieldCheck, title: 'Commande sécurisée', body: 'Un récapitulatif clair à chaque étape.' },
            { Icon: CheckCircle2, title: 'Confirmation par e-mail', body: 'Retrouvez votre commande dans votre boîte mail.' }
          ].map(({ Icon, title, body }) => <article key={title} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#fff4b6] text-red-700"><Icon className="h-5 w-5" /></span><div><h2 className="font-heading text-sm font-black uppercase">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{body}</p></div></article>)}
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-red-700 dark:text-amber-400">Le calendrier Sang et Or</p><h2 className="mt-2 font-heading text-3xl font-black uppercase sm:text-5xl">Les prochains rendez-vous</h2><p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">Chaque événement possède sa page dédiée : informations pratiques, tarifs, tribunes et accès à la réservation.</p></div>
            <a href="/evenements" className="inline-flex items-center gap-2 text-sm font-black uppercase text-red-700 hover:underline dark:text-amber-400">Tout le calendrier <ArrowRight className="h-4 w-4" /></a>
          </div>
          {loading && <div className="mt-8 rounded-xl bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Chargement des événements…</div>}
          {error && <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}
          {!loading && !error && events.length === 0 && <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Aucun événement n’est ouvert à la vente pour le moment.</div>}
          <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {(featured ? [featured, ...highlights] : []).map((event) => {
              const date = dateParts(event.eventDate);
              return <article key={event.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"><a href={`/evenements/${encodeURIComponent(event.slug)}`} className="block"><div className="relative h-52 overflow-hidden bg-slate-900"><img src={event.imageUrl || '/images/stadium_pitch_aerial_1794048534631.jpg'} alt={event.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-3 top-3 rounded bg-[#fed100] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#201800]">{event.category}</span><span className="absolute bottom-3 left-3 flex h-14 w-14 flex-col items-center justify-center rounded bg-white font-heading text-[#111827]"><b className="text-2xl leading-none">{date.day}</b><small className="mt-1 text-[9px] font-black">{date.month}</small></span></div><div className="p-5"><h3 className="font-heading text-xl font-black uppercase">{event.title}</h3><div className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400"><p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-red-700" />{event.formattedDate}</p><p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-red-700" />{event.venue}</p></div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"><span className="text-xs text-slate-500">À partir de <b className="ml-1 text-base text-slate-900 dark:text-white">{event.minPrice.toFixed(2).replace('.', ',')} €</b></span><span className="inline-flex items-center gap-1 text-xs font-black uppercase text-red-700 dark:text-amber-400">Découvrir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div></div></a></article>;
            })}
          </div>
        </section>

        <section className="bg-[#101c37] text-white"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#fed100]">Un stade, une ville, une ferveur</p><h2 className="mt-3 font-heading text-4xl font-black uppercase leading-tight sm:text-5xl">Entrez dans l’expérience Bollaert.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-white/70">Du premier coup de sifflet aux chants des tribunes, chaque place offre une autre façon de vivre le match. Sur la page de chaque événement, explorez le stade et comparez les catégories disponibles.</p><a href="/evenements" className="mt-6 inline-flex items-center gap-2 rounded bg-[#fed100] px-5 py-3 font-heading text-sm font-black uppercase text-[#201800]">Trouver ma place <ArrowRight className="h-4 w-4" /></a></div><div className="grid grid-cols-2 gap-3">{[{ n: '4', label: 'tribunes à explorer' }, { n: '1', label: 'stade au cœur de Lens' }, { n: '3 étapes', label: 'pour réserver' }, { n: '0 compte', label: 'à créer pour commander' }].map((item) => <div key={item.n} className="rounded-lg border border-white/10 bg-white/5 p-5"><div className="font-heading text-3xl font-black text-[#fed100]">{item.n}</div><p className="mt-2 text-xs font-bold uppercase tracking-wide text-white/70">{item.label}</p></div>)}</div></div></section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6"><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.22em] text-red-700 dark:text-amber-400">En trois temps</p><h2 className="mt-2 font-heading text-3xl font-black uppercase sm:text-4xl">Votre soirée commence ici</h2></div><div className="mt-8 grid gap-4 md:grid-cols-3">{[{ Icon: CalendarDays, title: 'Choisissez votre événement', body: 'Consultez sa date, son lieu, les informations pratiques et les tarifs.' }, { Icon: Users, title: 'Choisissez votre tribune', body: 'Repérez le côté du stade qui vous correspond et sélectionnez vos billets.' }, { Icon: CheckCircle2, title: 'Recevez votre confirmation', body: 'Finalisez le formulaire et retrouvez les détails de commande par e-mail.' }].map(({ Icon, title, body }, index) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><span className="flex h-10 w-10 items-center justify-center rounded bg-red-50 text-red-700 dark:bg-red-950 dark:text-amber-400"><Icon className="h-5 w-5" /></span><p className="mt-4 text-[10px] font-black tracking-widest text-red-700 dark:text-amber-400">ÉTAPE 0{index + 1}</p><h3 className="mt-1 font-heading text-lg font-black uppercase">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{body}</p></article>)}</div></section>
      </main>
      <PublicFooter />
    </div>
  );
}
