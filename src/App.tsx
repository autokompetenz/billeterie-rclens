import React, { useEffect, useState } from 'react';
import {
  Match,
  StandId,
  Sector,
  Seat,
  CartItem,
  ETicket,
  ResaleListing,
  OrderAddons,
  TariffType,
  TourPackage,
} from './types/ticketing';
import {
  ticketingApi,
  getErrorMessage
} from './services/api';
import { Navbar } from './components/Navbar';
import { StadiumMap } from './components/StadiumMap';
import { SeatPicker } from './components/SeatPicker';
import { PitchViewModal } from './components/PitchViewModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ETicketCard } from './components/ETicketCard';
import { BourseExchange } from './components/BourseExchange';
import { SeasonTickets } from './components/SeasonTickets';
import { StadiumTours } from './components/StadiumTours';
import { AnthemPlayer } from './components/AnthemPlayer';
import { MatchCard } from './components/MatchCard';
import { Footer } from './components/Footer';
import {
  Calendar,
  Clock,
  MapPin,
  Repeat,
  Ticket,
  ChevronLeft,
  Flame,
  Code2,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  Loader2,
  AlertCircle
} from 'lucide-react';

const DEFAULT_HOLD_SECONDS = 15 * 60;

/** Retrouve la tribune à partir du libellé renvoyé par la Bourse d'échange. */
function resolveStandId(standName: string): StandId {
  const value = standName.toLowerCase();
  if (value.includes('marek') || value.includes('xerc')) return 'MAREK_XERCES';
  if (value.includes('lepagnot')) return 'LEPAGNOT';
  if (value.includes('delacourt')) return 'DELACOURT';
  return 'TRANNIN';
}

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'matches' | 'exchange' | 'season' | 'tours' | 'tickets'>('matches');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedCompetitionFilter, setSelectedCompetitionFilter] = useState<string>('all');

  // Stadium & Seat Selection State
  const [selectedStand, setSelectedStand] = useState<StandId | null>(null);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorSeats, setSectorSeats] = useState<Seat[]>([]);
  const [isSeatPickerOpen, setIsSeatPickerOpen] = useState(false);
  const [previewPitchStand, setPreviewPitchStand] = useState<StandId | null>(null);

  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [addons, setAddons] = useState<OrderAddons>({
    insurance: false,
    scarf: false,
    parkingPass: 'none'
  });
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_HOLD_SECONDS);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);

  // Data State
  const [matches, setMatches] = useState<Match[]>([]);
  const [tours, setTours] = useState<TourPackage[]>([]);
  const [myTickets, setMyTickets] = useState<ETicket[]>([]);
  const [resaleListings, setResaleListings] = useState<ResaleListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // User Auth & Backend Docs Modal
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<{
    orderId: string;
    ticketsCount: number;
  } | null>(null);

  // Theme Management (Fond Blanc / Fond Noir) - Stored in localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('rclens_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return 'light'; // Fond blanc par défaut officiel
  });

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('rclens_theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Chargement initial du catalogue (matchs, visites, bourse d'échange)
  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [matchList, tourList, listings] = await Promise.all([
          ticketingApi.getMatches(),
          ticketingApi.getTours(),
          ticketingApi.getResaleListings()
        ]);
        if (cancelled) return;
        setMatches(matchList);
        setTours(tourList);
        setResaleListings(listings);
      } catch (error) {
        if (!cancelled) setLoadError(getErrorMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  // Compte à rebours synchronisé sur l'expiration réelle du blocage serveur
  useEffect(() => {
    if (!holdExpiresAt) {
      setTimeLeft(DEFAULT_HOLD_SECONDS);
      return;
    }

    let hasExpired = false;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((new Date(holdExpiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);

      if (remaining === 0 && !hasExpired) {
        hasExpired = true;
        setHoldId(null);
        setHoldExpiresAt(null);
        setCart([]);
        setIsCartOpen(false);
        setIsCheckoutOpen(false);
        alert('Votre session de réservation a expiré. Les places ont été libérées.');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt]);

  /**
   * Recrée le blocage serveur pour l'ensemble du panier.
   * L'API libère les anciens holds puis réserve toutes les places transmises.
   */
  const applyHold = async (nextCart: CartItem[]) => {
    const seatIds = nextCart
      .filter((item) => Boolean(item.seatId))
      .map((item) => item.seatId as string);

    if (seatIds.length === 0) {
      if (holdId) {
        try {
          await ticketingApi.releaseHold(holdId);
        } catch {
          /* le hold expirera de lui-même */
        }
      }
      setHoldId(null);
      setHoldExpiresAt(null);
      setTimeLeft(DEFAULT_HOLD_SECONDS);
      return;
    }

    const hold = await ticketingApi.createHold(seatIds);
    setHoldId(hold.holdId);
    setHoldExpiresAt(hold.expiresAt);
  };

  // Ajoute des articles au panier en bloquant les places côté serveur
  const applyItems = async (
    newItems: Omit<CartItem, 'id'>[],
    baseCart: CartItem[] = cart
  ): Promise<CartItem[]> => {
    // Évite d'ajouter deux fois la même place ou la même annonce de revente.
    const existingSeatIds = new Set(
      baseCart.map((item) => item.seatId).filter(Boolean) as string[]
    );
    const existingListingIds = new Set(
      baseCart.map((item) => item.resaleListingId).filter(Boolean) as string[]
    );
    const uniqueItems = newItems.filter((item) => {
      if (item.seatId && existingSeatIds.has(item.seatId)) return false;
      if (item.resaleListingId && existingListingIds.has(item.resaleListingId)) return false;
      return true;
    });

    if (uniqueItems.length === 0) {
      setIsCartOpen(true);
      return baseCart;
    }

    const stamp = Date.now();
    const itemsWithIds: CartItem[] = uniqueItems.map((item, index) => ({
      ...item,
      id: `cart-${stamp}-${index}`
    }));
    const nextCart = [...baseCart, ...itemsWithIds];

    await applyHold(nextCart);
    setCart(nextCart);
    setIsCartOpen(true);
    return nextCart;
  };

  const handleAddToCart = async (newItems: Omit<CartItem, 'id'>[]) => {
    await applyItems(newItems);
  };

  // Retire un article et recalcule le blocage des places restantes
  const handleRemoveCartItem = async (id: string) => {
    const nextCart = cart.filter((item) => item.id !== id);
    try {
      await applyHold(nextCart);
    } catch (error) {
      alert(getErrorMessage(error));
      return;
    }
    setCart(nextCart);
    if (nextCart.length === 0) setIsCartOpen(false);
  };

  // Met à jour le bénéficiaire nominatif d'un article
  const handleUpdateBeneficiary = (id: string, firstName: string, lastName: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, beneficiary: { ...item.beneficiary, firstName, lastName } } : item
      )
    );
  };

  // Met à jour le tarif appliqué (le serveur recalcule toujours le prix final)
  const handleUpdateTariff = (id: string, tariff: TariffType) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.tourId || item.resaleListingId) {
          return { ...item, tariff };
        }
        const basePrice = item.basePrice ?? item.price;
        const newPrice =
          tariff === 'u16'
            ? Math.round(basePrice * 0.75 * 100) / 100
            : tariff === 'student'
            ? Math.round(basePrice * 0.85 * 100) / 100
            : basePrice;
        return { ...item, tariff, price: newPrice };
      })
    );
  };

  // Recharge le catalogue après une commande pour refléter les places vendues
  const refreshCatalog = () => {
    ticketingApi
      .getMatches()
      .then((freshMatches) => {
        setMatches(freshMatches);
        // Met à jour le match ouvert (compteurs de places) sans le fermer
        setSelectedMatch((current) =>
          current ? freshMatches.find((match) => match.id === current.id) ?? current : null
        );
      })
      .catch(() => {});
    ticketingApi
      .getResaleListings()
      .then(setResaleListings)
      .catch(() => {});
    if (selectedMatch) {
      ticketingApi
        .getSectorsByMatch(selectedMatch.id)
        .then(setSectors)
        .catch(() => {});
    }
  };

  // Commande confirmée : les e-billets proviennent directement du serveur
  const handleOrderSuccess = (orderId: string, newTickets: ETicket[]) => {
    setMyTickets((prev) => [...newTickets, ...prev]);
    setCart([]);
    setHoldId(null);
    setHoldExpiresAt(null);
    setTimeLeft(DEFAULT_HOLD_SECONDS);
    setIsCartOpen(false);
    setIsSeatPickerOpen(false);
    setSelectedSector(null);
    setOrderConfirmation({ orderId, ticketsCount: newTickets.length });
    setActiveTab('tickets');
    refreshCatalog();
  };

  // Achat d'une place proposée sur la Bourse d'échange
  const handleBuyResale = (listing: ResaleListing) => {
    const targetMatch = matches.find((m) => m.id === listing.matchId);
    if (!targetMatch) {
      alert("La rencontre associée à cette annonce est introuvable.");
      return;
    }

    const resaleCartItem: Omit<CartItem, 'id'> = {
      matchId: targetMatch.id,
      match: targetMatch,
      standId: resolveStandId(listing.standName),
      standName: listing.standName,
      sectorId: `resale-${listing.id}`,
      sectorName: listing.sectorName,
      categoryName: "Bourse d'Échange Certifiée",
      row: listing.row,
      seatNumber: listing.seatNumber,
      tariff: 'full',
      price: listing.resalePrice,
      basePrice: listing.resalePrice,
      beneficiary: { firstName: '', lastName: '', email: '' },
      gate: 'Accès Bourse / Portes 5 à 12',
      isResale: true,
      resaleListingId: listing.id
    };

    handleAddToCart([resaleCartItem]).catch((error) => alert(getErrorMessage(error)));
  };

  // Mise en vente d'un e-billet sur la Bourse officielle
  const handleListTicketForResale = async (ticketId: string) => {
    try {
      await ticketingApi.listTicketForResale(ticketId);
      const [updatedTickets, updatedListings] = await Promise.all([
        ticketingApi.getMyTickets(),
        ticketingApi.getResaleListings()
      ]);
      setMyTickets(updatedTickets);
      setResaleListings(updatedListings);
      alert("Votre billet a été mis en vente avec succès sur la Bourse d'échange officielle !");
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  // Cession nominative d'un e-billet
  const handleTransferTicket = async (ticketId: string, recipientName: string) => {
    try {
      await ticketingApi.transferTicket(ticketId, recipientName);
      const updatedTickets = await ticketingApi.getMyTickets();
      setMyTickets(updatedTickets);
      alert(`Le billet a été cédé avec succès à ${recipientName}.`);
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  // Ouvre un match et charge ses secteurs tarifaires
  const handleSelectMatch = async (match: Match): Promise<Sector[]> => {
    setSelectedMatch(match);
    setSelectedStand('MAREK_XERCES');
    setSelectedSector(null);
    setSectors([]);
    try {
      const matchSectors = await ticketingApi.getSectorsByMatch(match.id);
      setSectors(matchSectors);
      return matchSectors;
    } catch (error) {
      alert(getErrorMessage(error));
      return [];
    }
  };

  // Charge la grille des sièges d'un secteur puis ouvre le sélecteur
  const handleSelectSector = async (sector: Sector) => {
    setSelectedSector(sector);
    try {
      const seats = await ticketingApi.getSeats(sector.id);
      setSectorSeats(seats);
      setIsSeatPickerOpen(true);
    } catch (error) {
      setSectorSeats([]);
      alert(getErrorMessage(error));
    }
  };

  // Filtered Matches
  const filteredMatches = matches.filter((m) => {
    if (selectedCompetitionFilter === 'all') return true;
    return m.competition === selectedCompetitionFilter;
  });

  const featuredMatch = matches.find((m) => m.featured) || matches[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-amber-400 selection:text-slate-950 overflow-x-hidden">
      {/* Top Navbar with Theme toggle */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'matches') setSelectedMatch(null);
        }}
        cart={cart}
        setIsCartOpen={setIsCartOpen}
        timeLeft={timeLeft}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Floating Theme & Developer Helper on Desktop & Mobile */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 items-end">
        {/* Floating Quick Theme Toggle button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Basculer en fond blanc' : 'Basculer en fond noir'}
          className="px-3.5 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-105"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Fond Blanc</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-700" />
              <span>Fond Noir</span>
            </>
          )}
        </button>

        {/* Aide API réservée au développement : jamais visible en production. */}
        {import.meta.env.DEV && (
          <button
            onClick={() => setShowApiDocs(!showApiDocs)}
            className="px-3.5 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-amber-500/60 hover:border-amber-500 text-slate-800 dark:text-amber-300 hover:text-red-700 dark:hover:text-amber-200 text-xs font-mono font-bold flex items-center gap-2 shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-105"
          >
            <Code2 className="w-4 h-4 text-red-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Architecture API Backend</span>
            <span className="sm:hidden">API</span>
          </button>
        )}
      </div>

      {/* Quick Interactive Tour Bar for effortless preview of all features */}
      <div className="bg-white dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 py-2.5 px-3 sm:px-4 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-red-700 dark:text-amber-400 font-semibold uppercase tracking-wider shrink-0">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Aperçu direct :</span>
            <span className="sm:hidden">Accès :</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-medium overflow-x-auto py-0.5 scrollbar-none">
            <button
              onClick={() => {
                setActiveTab('matches');
                setSelectedMatch(null);
              }}
              className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'matches' && !selectedMatch
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              1. Accueil
            </button>

            <button
              onClick={() => {
                setActiveTab('matches');
                const target = matches[0];
                if (target) {
                  handleSelectMatch(target);
                }
              }}
              className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer whitespace-nowrap ${
                selectedMatch && !isSeatPickerOpen
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              2. Plan Bollaert
            </button>

            <button
              onClick={async () => {
                setActiveTab('matches');
                const match = matches[0];
                if (!match) return;
                const matchSectors = await handleSelectMatch(match);
                if (matchSectors[0]) handleSelectSector(matchSectors[0]);
              }}
              className="px-3 py-1 rounded-md text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              3. Grille Sièges
            </button>

            <button
              onClick={() => setActiveTab('exchange')}
              className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'exchange'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              4. Bourse
            </button>

            <button
              onClick={() => setActiveTab('season')}
              className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'season'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              5. Abonnements
            </button>

            <button
              onClick={() => setActiveTab('tours')}
              className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'tours'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              6. Visites
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'tickets'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              7. E-Billets QR
            </button>
          </div>

          {/* Authentic Bollaert Stadium Anthem Player */}
          <div className="shrink-0">
            <AnthemPlayer />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Order confirmation banner if just purchased */}
        {orderConfirmation && (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-900/90 border border-emerald-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-200 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold uppercase text-white">
                  Commande {orderConfirmation.orderId} confirmée !
                </h3>
                <p className="text-xs text-emerald-100">
                  Vos {orderConfirmation.ticketsCount} e-billet(s) ont été générés et enregistrés. Vous pouvez les retrouver ci-dessous.
                </p>
              </div>
            </div>
            <button
              onClick={() => setOrderConfirmation(null)}
              className="text-xs font-semibold text-emerald-200 hover:text-white underline self-start sm:self-auto cursor-pointer"
            >
              Masquer
            </button>
          </div>
        )}

        {/* API connection feedback */}
        {loadError && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-start gap-3 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold uppercase tracking-wider">Serveur de billetterie indisponible</div>
              <p className="mt-0.5">{loadError}</p>
              <p className="mt-1 text-red-700 dark:text-red-300">
                Lancez <code className="font-mono font-bold">npm run dev</code> pour démarrer l&apos;API Express et Vite.
              </p>
            </div>
          </div>
        )}

        {/* VIEW 1: MATCHES & STADIUM SEAT BOOKING */}
        {activeTab === 'matches' && (
          <>
            {!selectedMatch ? (
              <>
                {/* Hero Showcase: Stade Bollaert-Delelis Atmosphere */}
                <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-900">
                  <div className="relative h-[340px] sm:h-[440px] w-full">
                    <img
                      src="/images/hero_bollaert_atmosphere_1794048534296.jpg"
                      alt="Stade Bollaert-Delelis Ambiance Sang et Or"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent" />

                    {/* Content inside Hero */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-10 max-w-3xl">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-widest mb-2">
                        <Flame className="w-4 h-4 text-red-500 fill-red-500" />
                        <span>Choc à domicile · Stade Bollaert-Delelis</span>
                      </div>

                      <h1 className="text-2xl sm:text-5xl font-heading font-black uppercase text-white tracking-tight leading-none">
                        RC LENS <span className="text-amber-400">vs</span> {featuredMatch?.opponent || 'Olympique de Marseille'}
                      </h1>

                      <p className="mt-3 text-xs sm:text-sm text-slate-200 line-clamp-2 max-w-xl">
                        Vibrez au son des Corons et de la ferveur Sang et Or. Réservez dès maintenant vos places assises numérotées sur le plan officiel.
                      </p>

                      <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            if (featuredMatch) handleSelectMatch(featuredMatch);
                          }}
                          className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <span>Réserver sur le plan interactif</span>
                        </button>

                        <button
                          onClick={() => setActiveTab('exchange')}
                          className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <Repeat className="w-4 h-4 text-amber-400" />
                          <span>Bourse d&apos;Échange</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4-KPI Stadium Trust Bar */}
                  <div className="grid grid-cols-2 md:grid-cols-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 py-4 px-4 sm:px-6 gap-4 text-center">
                    <div>
                      <div className="font-heading text-xl sm:text-2xl font-black text-red-700 dark:text-amber-400">
                        38 223
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-medium">
                        Capacité Bollaert
                      </div>
                    </div>
                    <div>
                      <div className="font-heading text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        100%
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-medium">
                        Guichets Fermés
                      </div>
                    </div>
                    <div>
                      <div className="font-heading text-xl sm:text-2xl font-black text-red-700 dark:text-amber-400">
                        30 000+
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-medium">
                        Abonnés Fidèles
                      </div>
                    </div>
                    <div>
                      <div className="font-heading text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        0 €
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-medium">
                        Frais Cachés
                      </div>
                    </div>
                  </div>
                </div>

                {/* Competition filter tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-heading font-extrabold uppercase text-slate-900 dark:text-white tracking-tight">
                      Prochains Matchs au Stade Bollaert
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Billetterie officielle grand public et priorités abonnés.
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 self-start sm:self-auto overflow-x-auto max-w-full">
                    {[
                      { key: 'all', label: 'Tous les matchs' },
                      { key: 'Ligue 1', label: 'Ligue 1 McDonald\'s' },
                      { key: 'Coupe de France', label: 'Coupe de France' }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setSelectedCompetitionFilter(tab.key)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                          selectedCompetitionFilter === tab.key
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matches Grid */}
                {isLoading && matches.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Chargement du calendrier officiel…
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMatches.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        onSelectMatch={(match) => handleSelectMatch(match)}
                        onGoToExchange={() => setActiveTab('exchange')}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* MATCH SEAT SELECTION VIEW */
              <div className="space-y-6">
                {/* Selected Match Top Bar */}
                <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm dark:shadow-xl transition-colors duration-200">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button
                      onClick={() => setSelectedMatch(null)}
                      className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-amber-400 uppercase tracking-wider">
                        <span>{selectedMatch.competition}</span>
                        <span>·</span>
                        <span>{selectedMatch.round}</span>
                      </div>
                      <h1 className="font-heading text-xl sm:text-3xl font-black uppercase text-slate-900 dark:text-white mt-0.5">
                        RC LENS <span className="text-red-600 dark:text-amber-400">vs</span> {selectedMatch.opponent}
                      </h1>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
                          <span>{selectedMatch.formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono font-semibold">
                          <Clock className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
                          <span>{selectedMatch.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-red-500" />
                          <span>Stade Bollaert-Delelis</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedMatch(null)}
                      className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      Changer de match
                    </button>
                  </div>
                </div>

                {/* Interactive Stadium Map */}
                <StadiumMap
                  match={selectedMatch}
                  sectors={sectors}
                  selectedStand={selectedStand}
                  onSelectStand={(standId) => setSelectedStand(standId)}
                  selectedSector={selectedSector}
                  onSelectSector={handleSelectSector}
                  onPreviewPitch={(standId) => setPreviewPitchStand(standId)}
                />
              </div>
            )}
          </>
        )}

        {/* VIEW 2: BOURSE D'ÉCHANGE */}
        {activeTab === 'exchange' && (
          <BourseExchange
            listings={resaleListings}
            matches={matches}
            onBuyResaleTicket={handleBuyResale}
            onGoToMyTickets={() => setActiveTab('tickets')}
          />
        )}

        {/* VIEW 3: ABONNEMENTS */}
        {activeTab === 'season' && <SeasonTickets />}

        {/* VIEW 4: VISITES & VIP */}
        {activeTab === 'tours' && <StadiumTours onAddToCart={handleAddToCart} tours={tours} />}

        {/* VIEW 5: MES BILLETS (User tickets portal) */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold uppercase text-slate-900 dark:text-white tracking-tight">
                  Mes Billets &amp; E-Pass
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Consultez vos billets confirmés et téléchargez vos e-billets. Un récapitulatif est également envoyé par e-mail.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('matches')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
              >
                Réserver un autre match
              </button>
            </div>

            {myTickets.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Ticket className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                <h3 className="font-heading text-lg font-bold uppercase text-slate-900 dark:text-white">
                  Vos billets seront envoyés par e-mail
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Après votre commande, les billets s’afficheront ici et un e-mail avec un lien de vérification sera envoyé à l’adresse indiquée.
                </p>
                <button
                  onClick={() => setActiveTab('matches')}
                  className="mt-5 px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Découvrir les prochains matchs
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {myTickets.map((t) => (
                  <ETicketCard key={t.id} ticket={t} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Interactive Seat Picker Modal */}
      {isSeatPickerOpen && selectedSector && selectedMatch && (
        <SeatPicker
          match={selectedMatch}
          sector={selectedSector}
          seats={sectorSeats}
          onClose={() => setIsSeatPickerOpen(false)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Sightline Pitch Preview Modal */}
      {previewPitchStand && (
        <PitchViewModal
          standId={previewPitchStand}
          onClose={() => setPreviewPitchStand(null)}
        />
      )}

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveItem={handleRemoveCartItem}
        onUpdateBeneficiary={handleUpdateBeneficiary}
        onUpdateTariff={handleUpdateTariff}
        addons={addons}
        setAddons={setAddons}
        timeLeft={timeLeft}
        onProceedToCheckout={() => {
          if (cart.length === 0) return;
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        addons={addons}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Developer Backend Architecture Modal */}
      {import.meta.env.DEV && showApiDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-amber-500/40 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white transition-colors">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-red-600 dark:text-amber-400" />
                <h3 className="font-heading text-lg font-bold uppercase text-slate-900 dark:text-white">
                  API Backend RC Lens (Express + PostgreSQL)
                </h3>
              </div>
              <button
                onClick={() => setShowApiDocs(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300 font-mono">
              <p className="text-slate-800 dark:text-slate-200 font-sans">
                Le frontend consomme une véritable API REST Node/Express adossée à une base
                PostgreSQL/Neon. Les prix sont recalculés côté serveur, les places sont bloquées 15 minutes,
                les e-billets sont générés à la commande et les commandes invité sont confirmées par e-mail.
              </p>

              <div className="p-3 bg-amber-50 dark:bg-slate-950 rounded-xl border border-amber-200 dark:border-slate-800 font-sans">
                <div className="text-red-700 dark:text-amber-400 font-bold mb-1">Compte de démonstration</div>
                <div className="text-[11px]">
                  E-mail : <code className="font-mono font-bold">supporter@rclens.fr</code> · Mot de passe :{' '}
                  <code className="font-mono font-bold">Bollaert2026!</code>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Codes promo actifs : <code className="font-mono">LENSOIS10</code> (-10%) et{' '}
                  <code className="font-mono">CORONS</code> (-15,00 €).
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-red-700 dark:text-amber-400 font-bold mb-1 font-sans">Routes REST disponibles :</div>
                <ul className="space-y-1 text-[11px]">
                  <li><strong className="text-emerald-600 dark:text-emerald-400">GET</strong> /api/health - État du service et de la base</li>
                  <li><strong className="text-red-700 dark:text-amber-400">POST</strong> /api/auth/register · /api/auth/login · /api/auth/logout</li>
                  <li><strong className="text-emerald-600 dark:text-emerald-400">GET</strong> /api/auth/me · <strong className="text-red-700 dark:text-amber-400">PATCH</strong> /api/auth/me</li>
                  <li><strong className="text-emerald-600 dark:text-emerald-400">GET</strong> /api/matches · /api/matches/:id · /api/matches/:id/sectors</li>
                  <li><strong className="text-emerald-600 dark:text-emerald-400">GET</strong> /api/sectors/:id/seats - Statut temps réel des sièges</li>
                  <li><strong className="text-red-700 dark:text-amber-400">POST</strong> /api/holds · <strong className="text-red-700 dark:text-amber-400">DELETE</strong> /api/holds/:id - Blocage 15 min</li>
                  <li><strong className="text-red-700 dark:text-amber-400">POST</strong> /api/orders - Commande nominative, addons et promo</li>
                  <li><strong className="text-emerald-600 dark:text-emerald-400">GET</strong> /api/tickets/my · <strong className="text-red-700 dark:text-amber-400">POST</strong> /api/tickets/:id/transfer</li>
                  <li><strong className="text-emerald-600 dark:text-emerald-400">GET</strong> /api/resale · <strong className="text-red-700 dark:text-amber-400">POST</strong> /api/resale/list · <strong className="text-red-700 dark:text-amber-400">DELETE</strong> /api/resale/:id</li>
                  <li><strong className="text-emerald-600 dark:text-emerald-400">GET</strong> /api/tours · <strong className="text-red-700 dark:text-amber-400">POST</strong> /api/season/waitlist</li>
                  <li><strong className="text-emerald-600 dark:text-emerald-400">GET</strong> /api/events · /api/events/:idOrSlug - Événements publiés</li>
                  <li><strong className="text-red-700 dark:text-amber-400">POST</strong> /api/orders/guest - Achat sans compte + e-mails</li>
                  <li><strong className="text-emerald-600 dark:text-emerald-400">GET</strong> /api/orders/verify/:numero · /api/tickets/verify/:code</li>
                  <li><strong className="text-red-700 dark:text-amber-400">POST</strong> /api/admin/login · /api/admin/logout (espace masqué)</li>
                  <li><strong className="text-emerald-600 dark:text-emerald-400">GET</strong> /api/admin/events · /api/admin/orders · /api/admin/stats</li>
                  <li><strong className="text-red-700 dark:text-amber-400">POST</strong> /api/admin/tickets/:code/check-in - Contrôle d’accès</li>
                </ul>
              </div>

              <div className="text-slate-600 dark:text-slate-400 font-sans text-xs">
                Variables d&apos;environnement : <code className="font-mono">DATABASE_URL</code>,{' '}
                <code className="font-mono">ADMIN_CODE</code>, <code className="font-mono">SMTP_*</code>,{' '}
                <code className="font-mono">ADMIN_EMAIL</code>, <code className="font-mono">APP_URL</code>. Documentation complète dans le{' '}
                <code className="font-mono">README.md</code>.
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowApiDocs(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
