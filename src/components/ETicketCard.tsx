import React, { useState } from 'react';
import { ETicket } from '../types/ticketing';
import { Download, Share2, Repeat, Check, Calendar, MapPin, ShieldCheck, Smartphone, Loader2, AlertCircle } from 'lucide-react';
import { MobileTicketModal } from './MobileTicketModal';

interface ETicketCardProps {
  ticket: ETicket;
  onListForResale?: (ticketId: string) => void;
  onTransfer?: (ticketId: string, recipientName: string) => Promise<void> | void;
}

export const ETicketCard: React.FC<ETicketCardProps> = ({
  ticket,
  onListForResale,
  onTransfer
}) => {
  const [isTransferring, setIsTransferring] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);

  const handleDownload = () => {
    setIsDownloaded(true);
    setTimeout(() => {
      const element = document.createElement('a');
      const file = new Blob(
        [
          `BILLET OFFICIEL RC LENS - STADE BOLLAERT-DELELIS\n\nNuméro: ${ticket.ticketNumber}\nMatch: RC Lens vs ${ticket.opponent}\nDate: ${ticket.date} à ${ticket.time}\nTribune: ${ticket.standName}\nSecteur: ${ticket.sectorName}\nRang: ${ticket.row} - Place: ${ticket.seatNumber}\nAccès: ${ticket.gate}\nBénéficiaire: ${ticket.beneficiaryName}\nTarif: ${ticket.tariff}\nCode-barre: ${ticket.barcode}\n\nPrésentez ce document ou le QR code sur votre smartphone aux tourniquets du stade.`
        ],
        { type: 'text/plain' }
      );
      element.href = URL.createObjectURL(file);
      element.download = `E-Billet-RCLens-${ticket.ticketNumber}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 400);
  };

  const submitTransfer = async () => {
    if (!recipientName.trim() || isSubmitting) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      await onTransfer?.(ticket.id, recipientName.trim());
      setIsTransferring(false);
      setRecipientName('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cession impossible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
      {/* Top Sang et Or Strip */}
      <div className="h-2 bg-gradient-to-r from-red-600 via-amber-400 to-red-600" />

      <div className="p-5 sm:p-6 flex flex-col md:flex-row gap-6">
        {/* Left Ticket Main Data */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <span className="font-mono text-xs font-bold text-red-700 dark:text-amber-400 tracking-wider">
                {ticket.ticketNumber}
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                ticket.status === 'valid'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : ticket.status === 'listed_resale'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
              }`}
            >
              {ticket.status === 'valid'
                ? 'Billet Actif'
                : ticket.status === 'listed_resale'
                ? 'En Bourse d\'échange'
                : 'Transféré'}
            </span>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {ticket.competition}
            </div>
            <h3 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white uppercase mt-0.5">
              RC LENS <span className="text-red-600 dark:text-amber-400">vs</span> {ticket.opponent}
            </h3>
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 mt-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
                <span>{ticket.date} · {ticket.time}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>Stade Bollaert-Delelis</span>
              </div>
            </div>
          </div>

          {/* Seat Placement Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">Tribune</div>
              <div className="font-heading font-black text-sm text-slate-900 dark:text-white truncate">
                {ticket.standName.replace('Tribune ', '')}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">Secteur</div>
              <div className="font-heading font-black text-sm text-red-700 dark:text-amber-400 truncate">
                {ticket.sectorName}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">Rang</div>
              <div className="font-heading font-black text-sm text-slate-900 dark:text-white">
                {ticket.row}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">Siège</div>
              <div className="font-heading font-black text-sm text-red-700 dark:text-amber-400">
                {ticket.seatNumber}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-1">
            <div>
              <span className="text-slate-500">Titulaire : </span>
              <strong className="text-slate-900 dark:text-white font-semibold">{ticket.beneficiaryName}</strong>
              <span className="text-slate-500"> ({ticket.tariff})</span>
            </div>
            <div className="font-mono text-red-800 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/50">
              Accès : {ticket.gate}
            </div>
          </div>
        </div>

        {/* Right QR Code & Digital Scan Card */}
        <div className="md:w-52 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center shrink-0">
          <div className="w-32 h-32 bg-white rounded-lg p-2 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950">
              <rect x="5" y="5" width="25" height="25" fill="currentColor" />
              <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
              <rect x="13" y="13" width="9" height="9" fill="currentColor" />

              <rect x="70" y="5" width="25" height="25" fill="currentColor" />
              <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
              <rect x="78" y="13" width="9" height="9" fill="currentColor" />

              <rect x="5" y="70" width="25" height="25" fill="currentColor" />
              <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
              <rect x="13" y="78" width="9" height="9" fill="currentColor" />

              <rect x="35" y="10" width="8" height="8" fill="currentColor" />
              <rect x="50" y="15" width="12" height="8" fill="currentColor" />
              <rect x="35" y="30" width="30" height="6" fill="currentColor" />
              <rect x="40" y="45" width="15" height="15" fill="currentColor" />
              <rect x="15" y="40" width="10" height="15" fill="currentColor" />
              <rect x="65" y="40" width="15" height="10" fill="currentColor" />
              <rect x="35" y="70" width="10" height="20" fill="currentColor" />
              <rect x="55" y="65" width="20" height="10" fill="currentColor" />
              <rect x="80" y="75" width="12" height="15" fill="currentColor" />
            </svg>
          </div>

          <div className="mt-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 tracking-wider">
            {ticket.barcode}
          </div>

          <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-3 h-3" />
            <span>Certifié FFF / LFP</span>
          </div>
        </div>
      </div>

      {/* Ticket Actions Strip */}
      <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowMobileModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-red-700 dark:text-amber-300 hover:text-red-800 dark:hover:text-amber-200 border border-slate-300 dark:border-amber-400/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
            <span>M-Billet Mobile</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isDownloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isDownloaded ? 'Téléchargé' : 'E-Billet PDF'}</span>
          </button>

          {onTransfer && (
            <button
              onClick={() => setIsTransferring(!isTransferring)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Céder la place</span>
            </button>
          )}
        </div>

        {ticket.status === 'valid' && onListForResale && (
          <button
            onClick={() => onListForResale(ticket.id)}
            className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-300 text-red-800 dark:bg-red-950/60 dark:hover:bg-red-900 dark:border-red-800/80 dark:text-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Repeat className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
            <span>Revendre sur la Bourse</span>
          </button>
        )}
      </div>

      {/* Transfer Input Drawer */}
      {isTransferring && (
        <div className="p-4 bg-slate-100 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Nom & prénom du nouveau bénéficiaire"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 w-full"
            />
            <button
              onClick={submitTransfer}
              disabled={isSubmitting || !recipientName.trim()}
              className="w-full sm:w-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSubmitting ? 'Cession…' : 'Valider la cession'}
            </button>
          </div>
          {actionError && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}
        </div>
      )}

      {/* Mobile Scanner Simulation Modal */}
      {showMobileModal && (
        <MobileTicketModal ticket={ticket} onClose={() => setShowMobileModal(false)} />
      )}
    </div>
  );
};
