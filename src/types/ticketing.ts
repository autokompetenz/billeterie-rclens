export type StandId = 'MAREK_XERCES' | 'LEPAGNOT' | 'DELACOURT' | 'TRANNIN';

export type MatchStatus = 
  | 'open'              // Billetterie ouverte
  | 'selling_fast'      // Dernières places
  | 'sold_out_exchange' // Guichet fermé - Bourse d'échange active
  | 'subscribers_only'  // Priorité abonnés
  | 'coming_soon';      // Bientôt disponible

export type Competition = 'Ligue 1' | 'Coupe de France' | 'Coupe d\'Europe' | 'Amical' | 'Visites & Expériences';

export interface StandSummary {
  id: StandId;
  name: string;
  category: string;
  price: number;
  availableSeats: number;
  isSoldOut: boolean;
  accentColor: string;
}

export interface Match {
  id: string;
  opponent: string;
  opponentShort: string;
  opponentLogo: string;
  opponentColor: string;
  homeTeam: string;
  competition: Competition;
  round: string;
  date: string; // ISO format or formatted string
  formattedDate: string;
  time: string;
  venue: string;
  status: MatchStatus;
  minPrice: number;
  featured?: boolean;
  bannerImage?: string;
  stands: Record<StandId, StandSummary>;
  availableSeats?: number;
  totalSeats?: number;
}

export interface Sector {
  id: string;
  standId: StandId;
  name: string;
  code: string;
  category: number; // 1 to 5
  categoryName: string;
  price: number;
  reducedPrice: number;
  totalSeats: number;
  availableSeats: number;
  gate: string;
  viewAngleDescription: string;
}

export interface Seat {
  id: string;
  sectorId: string;
  standId: StandId;
  row: number;
  number: number;
  price: number;
  status: 'available' | 'occupied' | 'selected' | 'resale';
  resalePrice?: number;
}

export interface Beneficiary {
  firstName: string;
  lastName: string;
  email: string;
  birthDate?: string;
}

export type TariffType = 'full' | 'u16' | 'student';

export interface CartItem {
  id: string;
  matchId: string;
  match: Match;
  standId: StandId;
  standName: string;
  sectorId: string;
  sectorName: string;
  categoryName: string;
  row: number;
  seatNumber: number;
  tariff: TariffType;
  price: number;
  /** Prix facial de référence (avant réduction tarifaire). */
  basePrice?: number;
  beneficiary: Beneficiary;
  gate: string;
  isResale?: boolean;
  /** Identifiant serveur de la place (billets de match). */
  seatId?: string;
  /** Identifiant de l'annonce de revente (bourse d'échange). */
  resaleListingId?: string;
  /** Identifiant de la visite / expérience VIP. */
  tourId?: string;
  /** Créneau choisi pour une visite. */
  tourDate?: string;
}

export interface OrderAddons {
  insurance: boolean; // 2.50 € per ticket
  scarf: boolean;     // 18.00 €
  parkingPass: 'none' | 'P1_Bollaert' | 'P2_Delacourt'; // 10.00 €
}

export interface ETicket {
  id: string;
  ticketNumber: string;
  matchId: string;
  opponent: string;
  date: string;
  time: string;
  competition: string;
  standName: string;
  sectorName: string;
  row: number;
  seatNumber: number;
  gate: string;
  beneficiaryName: string;
  tariff: string;
  price: number;
  qrCodeData: string;
  barcode: string;
  status: 'valid' | 'used' | 'listed_resale' | 'transferred';
}

export interface ResaleListing {
  id: string;
  ticketId: string;
  matchId: string;
  matchOpponent: string;
  matchDate: string;
  standName: string;
  sectorName: string;
  row: number;
  seatNumber: number;
  originalPrice: number;
  resalePrice: number;
  sellerInitials: string;
  verified: boolean;
  createdAt: string;
}

export interface TourPackage {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  duration: string;
  badge: string;
  image: string;
  highlights: string[];
  description: string;
  availableDates: string[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

/* ------------------------------------------------------------------ */
/* Événements, commandes invité et administration                      */
/* ------------------------------------------------------------------ */

export interface EventTicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  priceCents: number;
  stock: number;
  sold: number;
  available: number;
  maxPerOrder: number;
  sortOrder?: number;
  active?: boolean;
}

export type EventStatus = 'draft' | 'published' | 'sold_out' | 'cancelled';

export interface TicketingEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  opponent: string | null;
  venue: string;
  eventDate: string;
  formattedDate: string;
  doorsOpen: string | null;
  imageUrl: string | null;
  status: EventStatus;
  featured: boolean;
  minPrice: number;
  availableStock: number;
  ticketTypes: EventTicketType[];
}

export interface GuestOrderTicket {
  code: string;
  typeName: string;
  beneficiaryName: string;
  price: number;
}

export interface GuestOrderResult {
  success: boolean;
  orderNumber: string;
  status: string;
  total: number;
  payment: BankTransferDetails;
  event: {
    id: string;
    title: string;
    formattedDate: string;
    venue: string;
  };
  buyer: { name: string; email: string };
  tickets: GuestOrderTicket[];
  verificationUrl: string;
}

export interface BankTransferDetails {
  accountHolder: string;
  iban: string;
  bic: string;
  method: string;
  reference: string;
  amount: number;
}

export interface VerifiedOrder {
  found: boolean;
  orderNumber: string;
  status: string;
  createdAt: string;
  total: number;
  event: {
    id: string;
    title: string;
    formattedDate: string;
    venue: string;
  } | null;
  buyer: { name: string; email: string };
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  tickets: Array<{
    code: string;
    typeName: string;
    beneficiaryName: string;
    price: number;
    status: string;
    checkedInAt: string | null;
  }>;
  summary: { total: number; valid: number; used: number; cancelled: number };
}

export interface VerifiedTicket {
  found: boolean;
  code: string;
  typeName: string;
  beneficiaryName: string;
  price: number;
  status: string;
  checkedInAt: string | null;
  event: {
    id: string;
    title: string;
    formattedDate: string;
    venue: string;
  } | null;
}

export interface AdminEvent extends TicketingEvent {
  ticketTypes: EventTicketType[];
  stats: { orders: number; ticketsSold: number; revenue: number };
}

export interface AdminOrderSummary {
  orderNumber: string;
  eventId: string | null;
  eventTitle: string | null;
  eventDate: string | null;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  paymentRef: string | null;
  total: number;
  status: string;
  createdAt: string;
  ticketCount: number;
  checkedInCount: number;
}

export interface AdminOrderDetail {
  orderNumber: string;
  status: string;
  createdAt: string;
  total: number;
  paymentRef: string | null;
  event: {
    id: string;
    title: string;
    formattedDate: string;
    venue: string;
  } | null;
  buyer: { name: string; email: string; phone: string | null };
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  tickets: Array<{
    code: string;
    typeName: string;
    beneficiaryName: string | null;
    price: number;
    status: string;
    checkedInAt: string | null;
  }>;
}

export interface AdminStats {
  events: number;
  publishedEvents: number;
  orders: number;
  tickets: number;
  checkedIn: number;
  revenue: number;
}

