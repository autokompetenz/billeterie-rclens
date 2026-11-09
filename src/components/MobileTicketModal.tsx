import React, { useState, useEffect } from 'react';
import { ETicket } from '../types/ticketing';
import { X, Smartphone, Sun, ShieldCheck, CheckCircle2, Share2, Download, ArrowRight } from 'lucide-react';

interface MobileTicketModalProps {
  ticket: ETicket;
  onClose: () => void;
}

export const MobileTicketModal: React.FC<MobileTicketModalProps> = ({ ticket, onClose }) => {
  const [maxBrightness, setMaxBrightness] = useState(true);
  const [walletAdded, setWalletAdded] = useState(false);
  const [scanSimulated, setScanSimulated] = useState(false);

  useEffect(() => {
    // Simulate turnstile reading scan after 3 seconds
    const timer = setTimeout(() => {
      setScanSimulated(true);
    }, 3200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-[36px] bg-slate-900 border-4 border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Smartphone Speaker notch */}
        <div className="bg-slate-950 pt-3 pb-2 flex justify-center items-center relative">
          <div className="w-20 h-4 bg-slate-900 rounded-full flex items-center justify-center">
            <div className="w-8 h-1 bg-slate-800 rounded-full" />
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-2 text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* M-Billet Digital Body */}
        <div
          className={`flex-1 p-5 transition-all ${
            maxBrightness ? 'bg-slate-950' : 'bg-slate-900'
          }`}
        >
          {/* Official Pass Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-red-600 flex items-center justify-center font-heading font-black text-amber-400 text-xs">
                RCL
              </div>
              <span className="font-heading text-sm font-bold uppercase text-white tracking-wider">
                M-BILLET OFFICIEL
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
              MATCHDAY
            </span>
          </div>

          {/* Match & Opponent */}
          <div className="mt-3 text-center">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              {ticket.competition}
            </div>
            <h3 className="font-heading text-2xl font-black uppercase text-white mt-0.5">
              RC LENS <span className="text-amber-400">vs</span> {ticket.opponent}
            </h3>
            <div className="text-xs text-slate-300 mt-1">
              {ticket.date} à {ticket.time}
            </div>
          </div>

          {/* Interactive QR Code Card */}
          <div className="mt-4 p-4 rounded-2xl bg-white text-slate-950 shadow-inner flex flex-col items-center relative overflow-hidden">
            {/* Animated Laser Scanning Beam */}
            <div
              className="absolute left-0 right-0 h-1 bg-red-600 shadow-[0_0_12px_#dc2626] animate-bounce pointer-events-none"
              style={{ animationDuration: '2s' }}
            />

            <div className="w-44 h-44 flex items-center justify-center">
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

            <div className="mt-1 font-mono text-[10px] tracking-widest text-slate-700 font-bold">
              {ticket.barcode}
            </div>

            {/* Turnstile verification feedback */}
            <div className="mt-2 w-full pt-2 border-t border-slate-200 flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-700">
              {scanSimulated ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Tourniquet validé · Entrée autorisée</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Présentez aux bornes du stade</span>
                </>
              )}
            </div>
          </div>

          {/* Seat coordinates grid */}
          <div className="mt-4 grid grid-cols-4 gap-1.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs">
            <div>
              <div className="text-[9px] text-slate-500 uppercase font-mono">Tribune</div>
              <div className="font-heading font-bold text-white uppercase truncate">
                {ticket.standName.replace('Tribune ', '')}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase font-mono">Bloc</div>
              <div className="font-heading font-bold text-amber-400 uppercase truncate">
                {ticket.sectorName.split(' ')[0]}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase font-mono">Rang</div>
              <div className="font-mono font-bold text-white">{ticket.row}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase font-mono">Place</div>
              <div className="font-mono font-bold text-amber-400">{ticket.seatNumber}</div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
            <span>
              Titulaire : <strong>{ticket.beneficiaryName}</strong>
            </span>
            <span className="text-amber-400 font-bold font-mono">{ticket.gate}</span>
          </div>

          {/* Wallet integration simulation */}
          <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
            <button
              onClick={() => {
                setWalletAdded(true);
                setTimeout(() => setWalletAdded(false), 3000);
              }}
              className="w-full py-2 bg-black hover:bg-slate-950 text-white rounded-xl border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Smartphone className="w-4 h-4 text-slate-300" />
              <span>{walletAdded ? '✓ Ajouté à Apple Wallet' : 'Ajouter à Apple Wallet / Google Wallet'}</span>
            </button>

            <button
              onClick={() => setMaxBrightness(!maxBrightness)}
              className="w-full py-1.5 text-[11px] text-slate-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>{maxBrightness ? 'Luminosité maximale activée' : 'Activer la luminosité maximale'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
