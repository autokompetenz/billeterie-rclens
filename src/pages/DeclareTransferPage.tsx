import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { PublicFooter, PublicHeader } from '../components/PublicHeader';
import { getErrorMessage, transferApi } from '../services/api';
import {
  TransferDeclarationInfo,
  TransferDeclarationResult
} from '../types/ticketing';

function formatPrice(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

function formatDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short'
  });
}

function tokenFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('jeton') || params.get('token') || '';
}

export default function DeclareTransferPage() {
  const [token, setToken] = useState(tokenFromUrl);
  const [tokenInput, setTokenInput] = useState('');
  const [info, setInfo] = useState<TransferDeclarationInfo | null>(null);
  const [result, setResult] = useState<TransferDeclarationResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clean = token.trim();
    if (!clean) {
      setInfo(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setResult(null);
    setConfirmed(false);
    transferApi
      .info(clean)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleDeclare() {
    if (!info || !confirmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await transferApi.declare(token.trim());
      setResult(response);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const declared = Boolean(result || info?.declaredAt);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader active="verify" />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <Banknote className="h-7 w-7 text-emerald-700 dark:text-emerald-400" />
          </div>
          <h1 className="mt-4 font-heading text-3xl font-black uppercase text-slate-900 dark:text-white sm:text-4xl">
            Déclarer mon virement
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Confirmez que vous avez bien effectué le virement de votre commande. Le service
            billetterie vérifiera ensuite sa réception avant d&apos;activer vos billets.
          </p>
        </div>

        {!token && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <label
              htmlFor="transfer-token"
              className="text-sm font-bold text-slate-800 dark:text-white"
            >
              Collez le lien ou le jeton reçu par e-mail
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Le jeton se trouve dans l&apos;e-mail de confirmation, après « Virement effectué ? ».
            </p>
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                setToken(tokenInput.trim());
              }}
            >
              <input
                id="transfer-token"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Collez votre jeton ici"
                className="w-full flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="submit"
                disabled={!tokenInput.trim()}
                className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60"
              >
                Continuer
              </button>
            </form>
          </div>
        )}

        {loading && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre commande…
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{error}</p>
              {token && (
                <button
                  type="button"
                  onClick={() => {
                    setToken('');
                    setTokenInput('');
                    setError(null);
                  }}
                  className="mt-2 text-xs font-bold underline"
                >
                  Utiliser un autre jeton
                </button>
              )}
            </div>
          </div>
        )}

        {info && !error && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Bon de commande
                </div>
                <div className="font-mono text-xl font-black text-slate-900 dark:text-white">
                  {info.orderNumber}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  declared
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                }`}
              >
                {declared ? 'Virement déclaré' : 'Virement en attente'}
              </span>
            </div>

            {info.eventTitle && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                <CalendarDays className="h-4 w-4" /> {info.eventTitle}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Commande passée par {info.buyerName}
            </p>

            <div className="mt-4 grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30 sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Montant à virer</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {formatPrice(info.total)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Motif obligatoire</div>
                <div className="font-mono font-bold text-red-700 dark:text-amber-300">
                  {info.paymentReference || '—'}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">Titulaire du compte</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {info.bankAccount.accountHolder}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">IBAN</div>
                <div className="break-all font-mono font-bold text-slate-900 dark:text-white">
                  {info.bankAccount.iban}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">BIC</div>
                <div className="font-mono font-bold text-slate-900 dark:text-white">
                  {info.bankAccount.bic}
                </div>
              </div>
            </div>

            {result || info.declaredAt ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="flex items-start gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  Votre déclaration est enregistrée
                </div>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                  {result?.message || 'Le service billetterie va vérifier la réception du virement.'}
                </p>
                {(result?.declaredAt || info.declaredAt) && (
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                    Déclarée le {formatDateTime(result?.declaredAt || info.declaredAt)}
                  </p>
                )}
              </div>
            ) : info.status === 'paid' ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                Cette commande est déjà réglée, aucune déclaration n&apos;est nécessaire.
              </div>
            ) : (
              <div className="mt-5">
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-emerald-600"
                  />
                  <span>
                    Je certifie avoir effectué le virement de{' '}
                    <strong>{formatPrice(info.total)}</strong> avec le motif{' '}
                    <strong className="font-mono">{info.paymentReference}</strong>.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleDeclare}
                  disabled={!confirmed || submitting}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4" />
                  )}
                  Je confirme avoir effectué le virement
                </button>
              </div>
            )}

            <a
              href={`/verifier?commande=${encodeURIComponent(info.orderNumber)}`}
              className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-red-700 underline hover:text-red-900 dark:text-amber-400"
            >
              <ShieldCheck className="h-4 w-4" /> Vérifier le statut de ma commande
            </a>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
