import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Euro,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  ShoppingBag,
  Ticket,
  Trash2,
  Users,
  X,
  Power
} from 'lucide-react';
import { adminApi, getErrorMessage } from '../services/api';
import {
  AdminEvent,
  AdminOrderDetail,
  AdminOrderSummary,
  AdminStats,
  EventStatus
} from '../types/ticketing';

type Tab = 'dashboard' | 'events' | 'orders' | 'checkin';
type SessionState = 'loading' | 'locked' | 'unlocked';

interface EventFormState {
  id?: string;
  title: string;
  description: string;
  category: string;
  opponent: string;
  venue: string;
  eventDate: string;
  doorsOpen: string;
  imageUrl: string;
  status: EventStatus;
  featured: boolean;
}

interface TicketTypeFormState {
  id?: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  maxPerOrder: string;
}

const EMPTY_EVENT: EventFormState = {
  title: '',
  description: '',
  category: 'Match',
  opponent: '',
  venue: 'Stade Bollaert-Delelis, Lens',
  eventDate: '',
  doorsOpen: '',
  imageUrl: '',
  status: 'draft',
  featured: false
};

const EMPTY_TYPE: TicketTypeFormState = {
  name: '',
  description: '',
  price: '',
  stock: '',
  maxPerOrder: '6'
};

function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function euros(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'published':
      return 'Publié';
    case 'draft':
      return 'Brouillon';
    case 'sold_out':
      return 'Épuisé';
    case 'cancelled':
      return 'Annulé';
    default:
      return status;
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'published':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'draft':
      return 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    case 'cancelled':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  }
}

export default function AdminPage() {
  const [session, setSession] = useState<SessionState>('loading');
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>(EMPTY_EVENT);
  const [savingEvent, setSavingEvent] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [typeForm, setTypeForm] = useState<TicketTypeFormState>(EMPTY_TYPE);
  const [savingType, setSavingType] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  const [orderSearch, setOrderSearch] = useState('');
  const [orderDetail, setOrderDetail] = useState<AdminOrderDetail | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const [checkinCode, setCheckinCode] = useState('');
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkinResult, setCheckinResult] = useState<{
    success: boolean;
    message: string;
    code?: string;
    typeName?: string;
    beneficiaryName?: string | null;
    checkedInAt?: string;
  } | null>(null);

  const editingEvent = useMemo(
    () => events.find((event) => event.id === eventForm.id) ?? null,
    [events, eventForm.id]
  );

  useEffect(() => {
    adminApi
      .session()
      .then((result) => {
        setSession(result.authenticated ? 'unlocked' : 'locked');
        if (result.authenticated) void loadAll();
      })
      .catch(() => setSession('locked'));
  }, []);

  async function loadAll() {
    setLoadingData(true);
    setDataError(null);
    try {
      const [nextStats, nextEvents, nextOrders] = await Promise.all([
        adminApi.stats(),
        adminApi.listEvents(),
        adminApi.listOrders()
      ]);
      setStats(nextStats);
      setEvents(nextEvents);
      setOrders(nextOrders);
    } catch (error) {
      setDataError(getErrorMessage(error));
    } finally {
      setLoadingData(false);
    }
  }

  async function refreshEvents(keepId?: string) {
    const nextEvents = await adminApi.listEvents();
    setEvents(nextEvents);
    if (keepId) {
      const found = nextEvents.find((event) => event.id === keepId);
      if (found) {
        setEventForm({
          id: found.id,
          title: found.title,
          description: found.description,
          category: found.category,
          opponent: found.opponent ?? '',
          venue: found.venue,
          eventDate: toDateTimeLocal(found.eventDate),
          doorsOpen: found.doorsOpen ?? '',
          imageUrl: found.imageUrl ?? '',
          status: found.status,
          featured: found.featured
        });
      }
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      await adminApi.login(code);
      setSession('unlocked');
      setCode('');
      await loadAll();
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    try {
      await adminApi.logout();
    } finally {
      setSession('locked');
      setStats(null);
      setEvents([]);
      setOrders([]);
    }
  }

  function openCreateEvent() {
    setEventForm({ ...EMPTY_EVENT, eventDate: '' });
    setTypeForm(EMPTY_TYPE);
    setEditorError(null);
    setTypeError(null);
    setEditorOpen(true);
  }

  function openEditEvent(event: AdminEvent) {
    setEventForm({
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      opponent: event.opponent ?? '',
      venue: event.venue,
      eventDate: toDateTimeLocal(event.eventDate),
      doorsOpen: event.doorsOpen ?? '',
      imageUrl: event.imageUrl ?? '',
      status: event.status,
      featured: event.featured
    });
    setTypeForm(EMPTY_TYPE);
    setEditorError(null);
    setTypeError(null);
    setEditorOpen(true);
  }

  async function saveEvent(event: React.FormEvent) {
    event.preventDefault();
    setSavingEvent(true);
    setEditorError(null);
    try {
      if (!eventForm.eventDate) {
        throw new Error('Renseignez la date et l’heure de l’événement.');
      }
      const payload = {
        title: eventForm.title,
        description: eventForm.description,
        category: eventForm.category,
        opponent: eventForm.opponent || null,
        venue: eventForm.venue,
        eventDate: new Date(eventForm.eventDate).toISOString(),
        doorsOpen: eventForm.doorsOpen || null,
        imageUrl: eventForm.imageUrl || null,
        status: eventForm.status,
        featured: eventForm.featured
      };

      const saved = eventForm.id
        ? await adminApi.updateEvent(eventForm.id, payload)
        : await adminApi.createEvent(payload);

      await loadAll();
      await refreshEvents(saved.id);
      setTab('events');
    } catch (error) {
      setEditorError(getErrorMessage(error));
    } finally {
      setSavingEvent(false);
    }
  }

  async function saveTicketType(event: React.FormEvent) {
    event.preventDefault();
    if (!eventForm.id) {
      setTypeError("Enregistrez d'abord l'événement avant d'ajouter des billets.");
      return;
    }
    setSavingType(true);
    setTypeError(null);
    try {
      const payload = {
        name: typeForm.name,
        description: typeForm.description,
        price: Number(typeForm.price.replace(',', '.')),
        stock: Number(typeForm.stock),
        maxPerOrder: Number(typeForm.maxPerOrder)
      };
      if (!Number.isFinite(payload.price) || payload.price < 0) {
        throw new Error('Prix invalide.');
      }
      if (!Number.isInteger(payload.stock) || payload.stock < 0) {
        throw new Error('Stock invalide.');
      }

      if (typeForm.id) {
        await adminApi.updateTicketType(typeForm.id, payload);
      } else {
        await adminApi.createTicketType(eventForm.id, payload);
      }

      setTypeForm(EMPTY_TYPE);
      await loadAll();
      await refreshEvents(eventForm.id);
    } catch (error) {
      setTypeError(getErrorMessage(error));
    } finally {
      setSavingType(false);
    }
  }

  async function removeTicketType(id: string) {
    if (!window.confirm('Supprimer cette catégorie de billet ?')) return;
    try {
      await adminApi.deleteTicketType(id);
      await loadAll();
      await refreshEvents(eventForm.id);
    } catch (error) {
      setTypeError(getErrorMessage(error));
    }
  }

  async function toggleTicketType(event: AdminEvent, typeId: string, active: boolean) {
    try {
      await adminApi.updateTicketType(typeId, { active: !active });
      await loadAll();
      await refreshEvents(event.id);
    } catch (error) {
      setTypeError(getErrorMessage(error));
    }
  }

  async function removeEvent(event: AdminEvent) {
    if (
      !window.confirm(
        `Supprimer l’événement « ${event.title} » ? Cette action est irréversible.`
      )
    ) {
      return;
    }
    try {
      await adminApi.deleteEvent(event.id);
      await loadAll();
    } catch (error) {
      setDataError(getErrorMessage(error));
    }
  }

  async function searchOrders(event?: React.FormEvent) {
    event?.preventDefault();
    try {
      setOrders(await adminApi.listOrders({ search: orderSearch }));
    } catch (error) {
      setDataError(getErrorMessage(error));
    }
  }

  async function openOrder(orderNumber: string) {
    setOrderLoading(true);
    setOrderDetail(null);
    try {
      setOrderDetail(await adminApi.getOrder(orderNumber));
    } catch (error) {
      setDataError(getErrorMessage(error));
    } finally {
      setOrderLoading(false);
    }
  }

  async function runCheckIn(value: string) {
    const clean = value.trim();
    if (!clean) return;
    setCheckinBusy(true);
    setCheckinResult(null);
    try {
      const result = await adminApi.checkIn(clean);
      setCheckinResult({
        success: true,
        message: 'Billet validé. Bon match !',
        code: result.code,
        typeName: result.typeName,
        beneficiaryName: result.beneficiaryName,
        checkedInAt: result.checkedInAt
      });
      setCheckinCode('');
      void loadAll();
    } catch (error) {
      setCheckinResult({
        success: false,
        message: getErrorMessage(error)
      });
    } finally {
      setCheckinBusy(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Écran de connexion                                                  */
  /* ------------------------------------------------------------------ */

  if (session === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement de l’espace
        administrateur…
      </div>
    );
  }

  if (session === 'locked') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15">
            <Lock className="h-6 w-6 text-amber-400" />
          </div>
          <h1 className="mt-4 text-center font-heading text-2xl font-black uppercase tracking-wide text-white">
            Espace organisateur
          </h1>
          <p className="mt-1 text-center text-xs text-slate-400">
            Accès réservé. Saisissez le code administrateur.
          </p>

          <label className="mt-6 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Code
            </span>
            <input
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoFocus
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-center font-mono text-lg tracking-[0.3em] text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              placeholder="••••••••"
            />
          </label>

          {loginError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-900 bg-red-950/50 p-2.5 text-xs text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loggingIn}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {loggingIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Accéder
          </button>
          <p className="mt-3 text-center text-[10px] text-slate-500">
            Espace masqué — ne partagez pas cette adresse.
          </p>
        </form>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Tableau de bord                                                     */
  /* ------------------------------------------------------------------ */

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'events', label: 'Événements', icon: CalendarDays },
    { id: 'orders', label: 'Commandes', icon: ShoppingBag },
    { id: 'checkin', label: 'Contrôle d’accès', icon: ScanLine }
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-amber-400">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <div className="font-heading text-lg font-black uppercase leading-none text-slate-900 dark:text-white">
                Administration <span className="text-red-600 dark:text-amber-400">RC Lens</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">
                Billetterie · espace privé
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadAll()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <LogOut className="h-3.5 w-3.5" /> Déconnexion
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                  tab === item.id
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {dataError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">{dataError}</div>
            <button type="button" onClick={() => setDataError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {tab === 'dashboard' && (
          <section>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: 'Événements', value: stats?.events ?? 0, icon: CalendarDays },
                {
                  label: 'Publiés',
                  value: stats?.publishedEvents ?? 0,
                  icon: CheckCircle2
                },
                { label: 'Commandes', value: stats?.orders ?? 0, icon: ShoppingBag },
                { label: 'Billets vendus', value: stats?.tickets ?? 0, icon: Ticket },
                { label: 'Recette', value: euros(stats?.revenue ?? 0), icon: Euro }
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {card.label}
                      </span>
                      <Icon className="h-4 w-4 text-red-600 dark:text-amber-400" />
                    </div>
                    <div className="mt-2 font-heading text-2xl font-black text-slate-900 dark:text-white">
                      {card.value}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-black uppercase text-slate-900 dark:text-white">
                    Contrôle d’accès rapide
                  </h2>
                  <ScanLine className="h-5 w-5 text-red-600 dark:text-amber-400" />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Saisissez le code du billet pour le valider à l’entrée.
                </p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runCheckIn(checkinCode);
                  }}
                  className="mt-3 flex gap-2"
                >
                  <input
                    value={checkinCode}
                    onChange={(event) => setCheckinCode(event.target.value)}
                    placeholder="RCL-2026-123456"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={checkinBusy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60"
                  >
                    {checkinBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ScanLine className="h-4 w-4" />
                    )}
                    Valider
                  </button>
                </form>
                {checkinResult && (
                  <div
                    className={`mt-3 rounded-lg border p-3 text-xs ${
                      checkinResult.success
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      {checkinResult.success ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {checkinResult.message}
                    </div>
                    {checkinResult.code && (
                      <div className="mt-1">
                        {checkinResult.code} · {checkinResult.typeName} ·{' '}
                        {checkinResult.beneficiaryName}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-heading text-lg font-black uppercase text-slate-900 dark:text-white">
                  Dernières commandes
                </h2>
                <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
                  {orders.slice(0, 5).map((order) => (
                    <button
                      key={order.orderNumber}
                      type="button"
                      onClick={() => void openOrder(order.orderNumber)}
                      className="flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {order.orderNumber}
                        </div>
                        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {order.buyerName} · {order.eventTitle}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {euros(order.total)}
                      </div>
                    </button>
                  ))}
                  {orders.length === 0 && (
                    <p className="py-3 text-xs text-slate-500">Aucune commande.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'events' && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-black uppercase text-slate-900 dark:text-white">
                  Événements
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Créez un événement, ses catégories de billets, ses prix et son stock.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateEvent}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800"
              >
                <Plus className="h-4 w-4" /> Nouvel événement
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-heading text-lg font-black uppercase text-slate-900 dark:text-white">
                          {event.title}
                        </h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(
                            event.status
                          )}`}
                        >
                          {statusLabel(event.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {event.formattedDate} · {event.venue}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {event.ticketTypes.length} catégorie(s) ·{' '}
                        {event.availableStock} billet(s) disponible(s) ·{' '}
                        {event.stats.orders} commande(s) ·{' '}
                        {euros(event.stats.revenue)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditEvent(event)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Gérer
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeEvent(event)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {event.ticketTypes.map((type) => (
                      <div
                        key={type.id}
                        className={`rounded-lg border p-2.5 text-xs ${
                          type.active
                            ? 'border-slate-200 dark:border-slate-700'
                            : 'border-dashed border-slate-300 opacity-60 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-bold text-slate-900 dark:text-white">
                            {type.name}
                          </span>
                          <span className="shrink-0 font-bold text-red-700 dark:text-amber-400">
                            {euros(type.price)}
                          </span>
                        </div>
                        <div className="mt-1 text-slate-500 dark:text-slate-400">
                          Stock : {type.available}/{type.stock} · vendus {type.sold}
                        </div>
                      </div>
                    ))}
                    {event.ticketTypes.length === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Aucune catégorie de billet : ajoutez-en pour ouvrir la vente.
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                  Aucun événement. Commencez par en créer un.
                </div>
              )}
            </div>
          </section>
        )}

        {tab === 'orders' && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-black uppercase text-slate-900 dark:text-white">
                  Commandes
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Recherchez par bon de commande, nom ou adresse e-mail.
                </p>
              </div>
              <form onSubmit={searchOrders} className="flex gap-2">
                <input
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="BC-2026-… / email / nom"
                  className="w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-72"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 dark:bg-slate-800"
                >
                  <Search className="h-4 w-4" /> Rechercher
                </button>
              </form>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2">Bon de commande</th>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Événement</th>
                    <th className="px-3 py-2">Billets</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {orders.map((order) => (
                    <tr
                      key={order.orderNumber}
                      onClick={() => void openOrder(order.orderNumber)}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-3 py-2 font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {order.orderNumber}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {order.buyerName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {order.buyerEmail}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                        {order.eventTitle}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                        {order.checkedInCount}/{order.ticketCount}
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                        {euros(order.total)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-sm text-slate-500"
                      >
                        Aucune commande trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'checkin' && (
          <section className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-2">
                <ScanLine className="h-6 w-6 text-red-600 dark:text-amber-400" />
                <h1 className="font-heading text-2xl font-black uppercase text-slate-900 dark:text-white">
                  Contrôle d’accès
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Saisissez ou scannez le code du billet. Chaque billet ne peut être
                validé qu’une seule fois.
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void runCheckIn(checkinCode);
                }}
                className="mt-4 flex flex-col gap-2 sm:flex-row"
              >
                <input
                  value={checkinCode}
                  onChange={(event) => setCheckinCode(event.target.value)}
                  placeholder="RCL-2026-123456"
                  autoFocus
                  className="w-full flex-1 rounded-lg border border-slate-300 bg-white px-3 py-3 font-mono text-lg uppercase tracking-wider text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={checkinBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-6 py-3 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {checkinBusy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  Valider le billet
                </button>
              </form>

              {checkinResult && (
                <div
                  className={`mt-4 rounded-xl border p-4 ${
                    checkinResult.success
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
                      : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 text-lg font-black ${
                      checkinResult.success
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}
                  >
                    {checkinResult.success ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <AlertCircle className="h-6 w-6" />
                    )}
                    {checkinResult.message}
                  </div>
                  {checkinResult.code && (
                    <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      <p className="font-mono font-bold">{checkinResult.code}</p>
                      <p>
                        {checkinResult.typeName} · {checkinResult.beneficiaryName}
                      </p>
                      {checkinResult.checkedInAt && (
                        <p className="text-xs text-slate-500">
                          Validé à{' '}
                          {new Date(checkinResult.checkedInAt).toLocaleTimeString('fr-FR')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Modale d'édition d'événement                                     */}
      {/* ---------------------------------------------------------------- */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="my-6 w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="font-heading text-xl font-black uppercase text-slate-900 dark:text-white">
                {eventForm.id ? 'Modifier l’événement' : 'Nouvel événement'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_1fr]">
              <form onSubmit={saveEvent} className="space-y-3">
                <h3 className="font-heading text-lg font-black uppercase text-slate-900 dark:text-white">
                  Informations
                </h3>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Titre *
                  </span>
                  <input
                    value={eventForm.title}
                    onChange={(event) =>
                      setEventForm({ ...eventForm, title: event.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder="RC Lens — Olympique de Marseille"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Catégorie
                    </span>
                    <select
                      value={eventForm.category}
                      onChange={(event) =>
                        setEventForm({ ...eventForm, category: event.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      <option>Match</option>
                      <option>Visite</option>
                      <option>Événement</option>
                      <option>Expérience VIP</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Statut
                    </span>
                    <select
                      value={eventForm.status}
                      onChange={(event) =>
                        setEventForm({
                          ...eventForm,
                          status: event.target.value as EventStatus
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="draft">Brouillon</option>
                      <option value="published">Publié</option>
                      <option value="sold_out">Épuisé</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Date et heure *
                  </span>
                  <input
                    type="datetime-local"
                    value={eventForm.eventDate}
                    onChange={(event) =>
                      setEventForm({ ...eventForm, eventDate: event.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Ouverture des portes
                    </span>
                    <input
                      value={eventForm.doorsOpen}
                      onChange={(event) =>
                        setEventForm({ ...eventForm, doorsOpen: event.target.value })
                      }
                      placeholder="18h30"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Adversaire (facultatif)
                    </span>
                    <input
                      value={eventForm.opponent}
                      onChange={(event) =>
                        setEventForm({ ...eventForm, opponent: event.target.value })
                      }
                      placeholder="Olympique de Marseille"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Lieu *
                  </span>
                  <input
                    value={eventForm.venue}
                    onChange={(event) =>
                      setEventForm({ ...eventForm, venue: event.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Image (URL)
                  </span>
                  <input
                    value={eventForm.imageUrl}
                    onChange={(event) =>
                      setEventForm({ ...eventForm, imageUrl: event.target.value })
                    }
                    placeholder="/images/… ou https://…"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Description
                  </span>
                  <textarea
                    value={eventForm.description}
                    onChange={(event) =>
                      setEventForm({ ...eventForm, description: event.target.value })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={eventForm.featured}
                    onChange={(event) =>
                      setEventForm({ ...eventForm, featured: event.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-red-600"
                  />
                  Mettre à la une
                </label>

                {editorError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {editorError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingEvent}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {savingEvent ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {eventForm.id ? 'Enregistrer les modifications' : 'Créer l’événement'}
                </button>
              </form>

              <div className="space-y-3">
                <h3 className="font-heading text-lg font-black uppercase text-slate-900 dark:text-white">
                  Catégories de billets
                </h3>

                {!eventForm.id && (
                  <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    Enregistrez d’abord l’événement pour pouvoir ajouter des
                    catégories de billets et leurs prix.
                  </p>
                )}

                {editingEvent && (
                  <div className="space-y-2">
                    {editingEvent.ticketTypes.map((type) => (
                      <div
                        key={type.id}
                        className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {type.name}{' '}
                              {!type.active && (
                                <span className="text-[10px] font-normal uppercase text-slate-400">
                                  (inactif)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {euros(type.price)} · stock {type.sold}/{type.stock}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              title={type.active ? 'Désactiver' : 'Activer'}
                              onClick={() =>
                                void toggleTicketType(editingEvent, type.id, type.active ?? true)
                              }
                              className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Modifier"
                              onClick={() =>
                                setTypeForm({
                                  id: type.id,
                                  name: type.name,
                                  description: type.description,
                                  price: String(type.price),
                                  stock: String(type.stock),
                                  maxPerOrder: String(type.maxPerOrder)
                                })
                              }
                              className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Supprimer"
                              onClick={() => void removeTicketType(type.id)}
                              className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {editingEvent.ticketTypes.length === 0 && (
                      <p className="text-xs text-slate-500">
                        Aucune catégorie pour le moment.
                      </p>
                    )}
                  </div>
                )}

                {eventForm.id && (
                  <form
                    onSubmit={saveTicketType}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                      {typeForm.id ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
                    </div>
                    <div className="mt-2 space-y-2">
                      <input
                        value={typeForm.name}
                        onChange={(event) =>
                          setTypeForm({ ...typeForm, name: event.target.value })
                        }
                        placeholder="Nom (ex. Tribune Trannin)"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          value={typeForm.price}
                          onChange={(event) =>
                            setTypeForm({ ...typeForm, price: event.target.value })
                          }
                          placeholder="Prix €"
                          inputMode="decimal"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                        <input
                          value={typeForm.stock}
                          onChange={(event) =>
                            setTypeForm({ ...typeForm, stock: event.target.value })
                          }
                          placeholder="Stock"
                          inputMode="numeric"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                        <input
                          value={typeForm.maxPerOrder}
                          onChange={(event) =>
                            setTypeForm({ ...typeForm, maxPerOrder: event.target.value })
                          }
                          placeholder="Max/commande"
                          inputMode="numeric"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                      <input
                        value={typeForm.description}
                        onChange={(event) =>
                          setTypeForm({ ...typeForm, description: event.target.value })
                        }
                        placeholder="Description (facultatif)"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                    {typeError && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {typeError}
                      </div>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={savingType}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-700"
                      >
                        {savingType ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        {typeForm.id ? 'Mettre à jour' : 'Ajouter'}
                      </button>
                      {typeForm.id && (
                        <button
                          type="button"
                          onClick={() => setTypeForm(EMPTY_TYPE)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Modale de détail de commande                                     */}
      {/* ---------------------------------------------------------------- */}
      {(orderDetail || orderLoading) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="my-6 w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="font-heading text-xl font-black uppercase text-slate-900 dark:text-white">
                Détail de la commande
              </h2>
              <button
                type="button"
                onClick={() => {
                  setOrderDetail(null);
                  setOrderLoading(false);
                }}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              {orderLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
                </div>
              )}
              {orderDetail && (
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-lg font-black text-slate-900 dark:text-white">
                        {orderDetail.orderNumber}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(orderDetail.createdAt).toLocaleString('fr-FR')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        Total
                      </div>
                      <div className="font-heading text-xl font-black text-slate-900 dark:text-white">
                        {euros(orderDetail.total)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        Client
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {orderDetail.buyer.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {orderDetail.buyer.email}
                        {orderDetail.buyer.phone ? ` · ${orderDetail.buyer.phone}` : ''}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        Événement
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {orderDetail.event?.title ?? '—'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {orderDetail.event?.formattedDate}
                      </div>
                    </div>
                  </div>

                  <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                    {orderDetail.tickets.map((ticket) => (
                      <li
                        key={ticket.code}
                        className="flex flex-wrap items-center justify-between gap-2 p-2.5"
                      >
                        <div>
                          <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {ticket.code}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {ticket.typeName} · {ticket.beneficiaryName}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              ticket.status === 'valid'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                          >
                            {ticket.status === 'valid' ? 'Valide' : 'Scanné'}
                          </span>
                          {ticket.status === 'valid' ? (
                            <button
                              type="button"
                              onClick={() => void runCheckIn(ticket.code)}
                              className="rounded-md bg-red-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-800"
                            >
                              Valider
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await adminApi.resetCheckIn(ticket.code);
                                  await openOrder(orderDetail.orderNumber);
                                } catch (error) {
                                  setDataError(getErrorMessage(error));
                                }
                              }}
                              className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                            >
                              Réinitialiser
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {checkinResult && (
                    <div
                      className={`mt-3 rounded-lg border p-2.5 text-xs ${
                        checkinResult.success
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
                      }`}
                    >
                      {checkinResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
