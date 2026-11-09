import React from 'react';
import { ShoppingBag, Ticket, Repeat, Clock, Sun, Moon, Calendar, Sparkles } from 'lucide-react';
import { CartItem } from '../types/ticketing';

interface NavbarProps {
  activeTab: 'matches' | 'exchange' | 'season' | 'tours' | 'tickets';
  setActiveTab: (tab: 'matches' | 'exchange' | 'season' | 'tours' | 'tickets') => void;
  cart: CartItem[];
  setIsCartOpen: (open: boolean) => void;
  timeLeft: number; // in seconds
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  cart,
  setIsCartOpen,
  timeLeft,
  theme,
  toggleTheme
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md transition-colors duration-200">
      {/* Top emergency announcement bar */}
      <div className="bg-gradient-to-r from-red-700 via-amber-600 to-red-700 py-1 px-3 sm:px-4 text-[11px] sm:text-xs font-medium text-white flex items-center justify-between text-center overflow-hidden">
        <div className="mx-auto flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="font-heading tracking-wide uppercase text-amber-200 font-extrabold shrink-0">
            BILLETTERIE OFFICIELLE
          </span>
          <span className="hidden sm:inline text-white/80">·</span>
          <span className="text-white/95 truncate">
            Stade Bollaert-Delelis · 100% sécurisée au prix facial
          </span>
        </div>
      </div>

      {/* Main Navigation - Strictly 3 zones separated by gap-4 sm:gap-8 */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-8">
        {/* Zone 1: Brand Wordmark & Club Emblem */}
        <button
          onClick={() => setActiveTab('matches')}
          className="flex items-center gap-2 sm:gap-3 group text-left cursor-pointer shrink-0"
        >
          {/* Authentic Sang et Or Shield Emblem */}
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-b from-red-600 to-red-800 rounded-lg p-0.5 shadow-md flex items-center justify-center border border-amber-400/50 group-hover:scale-105 transition-transform shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[6px] flex flex-col items-center justify-center p-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400"></div>
              <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-amber-400 font-heading">RC LENS</span>
              <span className="text-[7px] sm:text-[8px] font-bold text-red-500 uppercase tracking-tighter">1906</span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="font-heading text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none group-hover:text-red-700 dark:group-hover:text-amber-400 transition-colors uppercase whitespace-nowrap">
              BILLETTERIE <span className="text-red-600 dark:text-amber-400">RC LENS</span>
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase mt-0.5 whitespace-nowrap">
              Bollaert-Delelis
            </span>
          </div>
        </button>

        {/* Zone 2: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-7 text-sm font-semibold tracking-wide whitespace-nowrap">
          <button
            onClick={() => setActiveTab('matches')}
            className={`py-2 transition-colors relative cursor-pointer ${
              activeTab === 'matches'
                ? 'text-red-700 dark:text-amber-400 font-bold'
                : 'text-slate-700 hover:text-red-700 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Matchs &amp; Billets
            {activeTab === 'matches' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 dark:bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('exchange')}
            className={`py-2 flex items-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === 'exchange'
                ? 'text-red-700 dark:text-amber-400 font-bold'
                : 'text-slate-700 hover:text-red-700 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <Repeat className="w-4 h-4 text-red-600 dark:text-amber-400" />
            Bourse d&apos;Échange
            {activeTab === 'exchange' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 dark:bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('season')}
            className={`py-2 transition-colors relative cursor-pointer ${
              activeTab === 'season'
                ? 'text-red-700 dark:text-amber-400 font-bold'
                : 'text-slate-700 hover:text-red-700 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Abonnements &amp; Pass
            {activeTab === 'season' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 dark:bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('tours')}
            className={`py-2 transition-colors relative cursor-pointer ${
              activeTab === 'tours'
                ? 'text-red-700 dark:text-amber-400 font-bold'
                : 'text-slate-700 hover:text-red-700 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Visites &amp; VIP
            {activeTab === 'tours' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 dark:bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`py-2 flex items-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === 'tickets'
                ? 'text-red-700 dark:text-amber-400 font-bold'
                : 'text-slate-700 hover:text-red-700 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4 text-red-600 dark:text-red-400" />
            Mes Billets
            {activeTab === 'tickets' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 dark:bg-amber-400 rounded-full" />
            )}
          </button>
        </nav>

        {/* Zone 3: Primary Actions (Theme Toggle, Auth, Cart) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Reservation Countdown if cart has items */}
          {cart.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-red-100 border border-red-300 text-red-800 dark:bg-red-950/80 dark:border-red-800/80 dark:text-red-200 rounded-lg text-xs font-mono font-bold">
              <Clock className="w-3.5 h-3.5 text-red-600 dark:text-amber-400 animate-pulse" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          {/* Theme Toggle Button: Fond Blanc / Fond Noir */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Activer le Fond Blanc' : 'Activer le Fond Noir'}
            aria-label={theme === 'dark' ? 'Passer en fond blanc' : 'Passer en fond noir'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700 shadow-xs"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-sans text-[11px] font-semibold text-slate-200">Fond Blanc</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-sans text-[11px] font-semibold text-slate-800">Fond Noir</span>
              </>
            )}
          </button>

          {/* Cart Action Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md hover:shadow-amber-500/20 active:scale-95 cursor-pointer shrink-0"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="font-heading text-xs sm:text-sm">Panier</span>
            {cart.length > 0 && (
              <span className="flex items-center justify-center w-5 h-5 bg-red-600 text-white rounded-full text-xs font-bold font-mono">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation tab strip with touch scrolling and active highlight */}
      <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 py-1.5 px-2 text-xs font-semibold overflow-x-auto whitespace-nowrap flex items-center gap-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'matches'
              ? 'text-red-700 bg-red-50 dark:text-amber-400 dark:bg-slate-800 font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Matchs</span>
        </button>

        <button
          onClick={() => setActiveTab('exchange')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'exchange'
              ? 'text-red-700 bg-red-50 dark:text-amber-400 dark:bg-slate-800 font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Repeat className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
          <span>Bourse</span>
        </button>

        <button
          onClick={() => setActiveTab('season')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'season'
              ? 'text-red-700 bg-red-50 dark:text-amber-400 dark:bg-slate-800 font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Abonnements</span>
        </button>

        <button
          onClick={() => setActiveTab('tours')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'tours'
              ? 'text-red-700 bg-red-50 dark:text-amber-400 dark:bg-slate-800 font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Visites VIP</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'tickets'
              ? 'text-red-700 bg-red-50 dark:text-amber-400 dark:bg-slate-800 font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Ticket className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          <span>Mes Billets</span>
        </button>
      </div>
    </header>
  );
};
