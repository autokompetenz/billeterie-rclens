import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Ticket,
  XCircle
} from 'lucide-react';
import { PublicFooter, PublicHeader } from '../components/PublicHeader';
import { eventsApi, getErrorMessage } from '../services/api';
import { VerifiedOrder, VerifiedTicket } from '../types/ticketing';

type Tab = 'order' | 'ticket';

function statusBadge(status: string) {
  if (status === 'valid') {
    return {
      label: 'Valide',
      className:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      icon: CheckCircle2
    };
  }
  if (status === 'pending_payment') {
    return {
      label: 'En attente du virement',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      icon: Clock
    };
  }
  if (status === 'used') {
    return {
      label: 'Déjà scanné',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      icon: Clock
    };
  }
  return {
    label: 'Annulé',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    icon: XCircle
  };
}

export default function VerifyPage() {
  const [tab, setTab] = useState<Tab>('order');
  const [orderNumber, setOrderNumber] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [order, setOrder] = useState<VerifiedOrder | null>(null);
  const [ticket, setTicket] = useState<VerifiedTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const commande = params.get('commande');
    const billet = params.get('billet');
    if (commande) {
      setOrderNumber(commande);
      void searchOrder(commande);
    } else if (billet) {
      setTab('ticket');
      setTicketCode(billet);
      void searchTicket(billet);
    }
  }, []);

  async function searchOrder(value: string) {
    const clean = value.trim();
    if (!clean) {
      setError('Saisissez votre numéro de bon de commande.');
      return;
    }
    setLoading(true);
    setError(null);
    setOrder(null);
    setTicket(null);
    try {
      setOrder(await eventsApi.verifyOrder(clean));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function searchTicket(value: string) {
    const clean = value.trim();
    if (!clean) {
      setError('Saisissez le code de votre billet.');
      return;
    }
    setLoading(true);
    setError(null);
    setOrder(null);
    setTicket(null);
    try {
      setTicket(await eventsApi.verifyTicket(clean));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (tab === 'order') void searchOrder(orderNumber);
    else void searchTicket(ticketCode);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader active="verify" />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <ShieldCheck className="h-8 w-8 text-red-700 dark:text-amber-400" />
          </div>
          <h1 className="mt-4 font-heading text-3xl font-black uppercase text-slate-900 dark:text-white sm:text-4xl">
            Vérifier un billet
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Retrouvez votre commande à partir du numéro de bon de commande reçu par
            e-mail, ou vérifiez un billet à partir de son code.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setTab('order');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                tab === 'order'
                  ? 'bg-white text-red-700 shadow-sm dark:bg-slate-950 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Search className="h-4 w-4" /> Bon de commande
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('ticket');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                tab === 'ticket'
                  ? 'bg-white text-red-700 shadow-sm dark:bg-slate-950 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Ticket className="h-4 w-4" /> Code billet
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={tab === 'order' ? orderNumber : ticketCode}
              onChange={(event) =>
                tab === 'order'
                  ? setOrderNumber(event.target.value)
                  : setTicketCode(event.target.value)
              }
              placeholder={tab === 'order' ? 'BC-2026-123456' : 'RCL-2026-123456'}
              className="w-full flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm uppercase text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Vérifier
            </button>
          </form>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {order && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Bon de commande
                </div>
                <div className="font-mono text-xl font-black text-slate-900 dark:text-white">
                  {order.orderNumber}
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${order.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                {order.status === 'paid' ? `${order.summary.valid} billet(s) valide(s)` : 'Virement en attente · billets non activés'}
              </span>
            </div>

            {order.event && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <h2 className="font-heading text-xl font-black uppercase text-slate-900 dark:text-white">
                  {order.event.title}
                </h2>
                <div className="mt-1 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" /> {order.event.formattedDate}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {order.event.venue}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Total
                </div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {order.total.toFixed(2).replace('.', ',')} €
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Billets
                </div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {order.summary.total}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Validés
                </div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  {order.summary.valid}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Scannés
                </div>
                <div className="font-bold text-amber-600 dark:text-amber-400">
                  {order.summary.used}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Client : {order.buyer.name} · {order.buyer.email}
            </div>

            <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
              {order.tickets.map((item) => {
                const badge = statusBadge(item.status);
                const Icon = badge.icon;
                return (
                  <li
                    key={item.code}
                    className="flex flex-wrap items-center justify-between gap-2 p-3"
                  >
                    <div>
                      <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {item.code}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.typeName} · {item.beneficiaryName}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.className}`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {badge.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {ticket && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Billet
                </div>
                <div className="font-mono text-xl font-black text-slate-900 dark:text-white">
                  {ticket.code}
                </div>
              </div>
              {(() => {
                const badge = statusBadge(ticket.status);
                const Icon = badge.icon;
                return (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${badge.className}`}
                  >
                    <Icon className="h-4 w-4" /> {badge.label}
                  </span>
                );
              })()}
            </div>

            {ticket.event && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <h2 className="font-heading text-xl font-black uppercase text-slate-900 dark:text-white">
                  {ticket.event.title}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {ticket.event.formattedDate} · {ticket.event.venue}
                </p>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Catégorie
                </div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {ticket.typeName}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Bénéficiaire
                </div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {ticket.beneficiaryName}
                </div>
              </div>
            </div>

            {ticket.checkedInAt && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                Scanné le{' '}
                {new Date(ticket.checkedInAt).toLocaleString('fr-FR', {
                  dateStyle: 'long',
                  timeStyle: 'short'
                })}
              </p>
            )}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
