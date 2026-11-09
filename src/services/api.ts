import {
  AdminEvent,
  AdminOrderDetail,
  AdminOrderSummary,
  AdminStats,
  AuthUser,
  BankTransferDetails,
  CartItem,
  ETicket,
  EventStatus,
  GuestOrderResult,
  Match,
  OrderAddons,
  ResaleListing,
  Seat,
  Sector,
  TicketingEvent,
  TourPackage,
  VerifiedOrder,
  VerifiedTicket
} from '../types/ticketing';

/**
 * Client HTTP de la billetterie RC Lens.
 * Toutes les données proviennent de l'API Express + PostgreSQL (Neon).
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const TOKEN_STORAGE_KEY = 'rclens_auth_token';
const GUEST_ID_STORAGE_KEY = 'rclens_guest_id';

function getGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(GUEST_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = 'ERROR') {
    // Toujours convertir en chaîne : une erreur renvoyée sous forme d'objet
    // ne doit jamais produire « [object Object] » à l'écran.
    super(typeof message === 'string' && message.trim() ? message : String(message));
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Extrait un message lisible depuis une valeur inconnue.
 * Gère les erreurs sous forme de chaîne, d'objet `{ message }` ou
 * d'objet imbriqué `{ error: { message } }`.
 */
function toMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return (
      toMessage(record.message) ??
      toMessage(record.error) ??
      toMessage(record.detail) ??
      null
    );
  }
  return null;
}

/**
 * Construit un message et un code d'erreur à partir du corps de réponse.
 * Le serveur renvoie normalement `{ error, code }`, mais une passerelle ou
 * une page d'erreur peut renvoyer un objet différent : on ne plante jamais.
 */
function extractError(payload: unknown, status: number): { message: string; code: string } {
  const fallback =
    status === 404
      ? "Le service de billetterie est introuvable. Réessayez dans un instant."
      : 'Une erreur est survenue. Merci de réessayer.';

  if (!payload || typeof payload !== 'object') {
    return { message: fallback, code: 'ERROR' };
  }

  const record = payload as Record<string, unknown>;
  const message = toMessage(record.error) ?? toMessage(record.message) ?? fallback;
  const code = typeof record.code === 'string' ? record.code : 'ERROR';
  return { message, code };
}

/* ------------------------------------------------------------------ */
/* Gestion du jeton de session                                         */
/* ------------------------------------------------------------------ */

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* stockage indisponible (navigation privée) */
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Guest-Id': getGuestId()
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;
    throw new ApiError(
      0,
      "Impossible de joindre le serveur de billetterie. Vérifiez que l'API est démarrée.",
      'NETWORK_ERROR'
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const { message, code } = extractError(payload, response.status);
    throw new ApiError(response.status, message, code);
  }

  return payload as T;
}

/* ------------------------------------------------------------------ */
/* Authentification                                                    */
/* ------------------------------------------------------------------ */

export interface SessionResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export const authApi = {
  async login(email: string, password: string): Promise<SessionResponse> {
    const session = await request<SessionResponse>('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    setStoredToken(session.token);
    return session;
  },

  async register(name: string, email: string, password: string): Promise<SessionResponse> {
    const session = await request<SessionResponse>('/auth/register', {
      method: 'POST',
      body: { name, email, password }
    });
    setStoredToken(session.token);
    return session;
  },

  async me(): Promise<AuthUser> {
    return request<AuthUser>('/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await request<{ success: boolean }>('/auth/logout', { method: 'POST' });
    } finally {
      clearStoredToken();
    }
  },

  async updateName(name: string): Promise<AuthUser> {
    return request<AuthUser>('/auth/me', { method: 'PATCH', body: { name } });
  }
};

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

interface HoldResponse {
  holdId: string;
  expiresAt: string;
}

export interface CreateOrderResult {
  success: boolean;
  orderId: string;
  status: string;
  payment: BankTransferDetails;
  tickets: ETicket[];
  total: number;
  discount: number;
  addonsTotal: number;
}

export const ticketingApi = {
  getMatches(): Promise<Match[]> {
    return request<Match[]>('/matches');
  },

  getMatchById(id: string): Promise<Match> {
    return request<Match>(`/matches/${encodeURIComponent(id)}`);
  },

  getSectorsByMatch(matchId: string): Promise<Sector[]> {
    return request<Sector[]>(`/matches/${encodeURIComponent(matchId)}/sectors`);
  },

  getSeats(sectorId: string): Promise<Seat[]> {
    return request<Seat[]>(`/sectors/${encodeURIComponent(sectorId)}/seats`);
  },

  getTours(): Promise<TourPackage[]> {
    return request<TourPackage[]>('/tours');
  },

  async getMyTickets(): Promise<ETicket[]> {
    if (!getStoredToken()) return [];
    return request<ETicket[]>('/tickets/my');
  },

  getResaleListings(): Promise<ResaleListing[]> {
    return request<ResaleListing[]>('/resale');
  },

  createHold(seatIds: string[]): Promise<HoldResponse> {
    return request<HoldResponse>('/holds', {
      method: 'POST',
      body: { seatIds }
    });
  },

  releaseHold(holdId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/holds/${encodeURIComponent(holdId)}`, {
      method: 'DELETE'
    });
  },

  createOrder(
    cart: CartItem[],
    addons: OrderAddons,
    paymentInfo: { cardholder: string; email: string; phone?: string },
    promoCode?: string
  ): Promise<CreateOrderResult> {
    const items = cart.map((item) => {
      if (item.tourId) {
        return {
          type: 'tour' as const,
          tourId: item.tourId,
          date: item.tourDate,
          tariff: item.tariff,
          beneficiary: item.beneficiary
        };
      }
      if (item.resaleListingId) {
        return {
          type: 'resale' as const,
          listingId: item.resaleListingId,
          tariff: item.tariff,
          beneficiary: item.beneficiary
        };
      }
      return {
        type: 'seat' as const,
        seatId: item.seatId,
        tariff: item.tariff,
        beneficiary: item.beneficiary
      };
    });

    return request<CreateOrderResult>('/orders', {
      method: 'POST',
      body: {
        items,
        addons,
        promoCode: promoCode || undefined,
        payment: paymentInfo
      }
    });
  },

  listTicketForResale(ticketId: string): Promise<ResaleListing> {
    return request<ResaleListing>('/resale/list', {
      method: 'POST',
      body: { ticketId }
    });
  },

  cancelResaleListing(listingId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(
      `/resale/${encodeURIComponent(listingId)}`,
      { method: 'DELETE' }
    );
  },

  transferTicket(ticketId: string, recipientName: string): Promise<ETicket> {
    return request<ETicket>(`/tickets/${encodeURIComponent(ticketId)}/transfer`, {
      method: 'POST',
      body: { recipientName }
    });
  },

  joinWaitlist(
    email: string,
    preferredStand: string
  ): Promise<{ success: boolean; alreadyRegistered: boolean; position: number }> {
    return request('/season/waitlist', {
      method: 'POST',
      body: { email, preferredStand }
    });
  }
};

/* ------------------------------------------------------------------ */
/* Événements & commandes invité                                       */
/* ------------------------------------------------------------------ */

export interface GuestOrderInput {
  eventId: string;
  buyer: { name: string; email: string; phone?: string };
  items: Array<{
    ticketTypeId: string;
    quantity: number;
    beneficiaries?: string[];
  }>;
}

export const eventsApi = {
  list(): Promise<TicketingEvent[]> {
    return request<TicketingEvent[]>('/events');
  },

  get(idOrSlug: string): Promise<TicketingEvent> {
    return request<TicketingEvent>(`/events/${encodeURIComponent(idOrSlug)}`);
  },

  createGuestOrder(input: GuestOrderInput): Promise<GuestOrderResult> {
    return request<GuestOrderResult>('/orders/guest', {
      method: 'POST',
      body: input
    });
  },

  verifyOrder(orderNumber: string): Promise<VerifiedOrder> {
    return request<VerifiedOrder>(
      `/orders/verify/${encodeURIComponent(orderNumber.trim())}`
    );
  },

  verifyTicket(code: string): Promise<VerifiedTicket> {
    return request<VerifiedTicket>(
      `/tickets/verify/${encodeURIComponent(code.trim())}`
    );
  }
};

/* ------------------------------------------------------------------ */
/* Administration                                                      */
/* ------------------------------------------------------------------ */

export interface AdminEventInput {
  title: string;
  description?: string;
  category?: string;
  opponent?: string | null;
  venue: string;
  eventDate: string;
  doorsOpen?: string | null;
  imageUrl?: string | null;
  status: EventStatus;
  featured?: boolean;
  slug?: string;
}

export interface AdminTicketTypeInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  maxPerOrder?: number;
  sortOrder?: number;
  active?: boolean;
}

export const adminApi = {
  login(code: string): Promise<{ authenticated: boolean }> {
    return request('/admin/login', { method: 'POST', body: { code } });
  },

  async logout(): Promise<void> {
    await request('/admin/logout', { method: 'POST' });
  },

  session(): Promise<{ authenticated: boolean }> {
    return request('/admin/session');
  },

  getBankTransferSettings(): Promise<{
    accountHolder: string;
    iban: string;
    bic: string;
  } | null> {
    return request('/admin/bank-transfer');
  },

  saveBankTransferSettings(input: {
    accountHolder: string;
    iban: string;
    bic: string;
  }): Promise<{ accountHolder: string; iban: string; bic: string }> {
    return request('/admin/bank-transfer', { method: 'PUT', body: input });
  },

  confirmOrderPayment(orderNumber: string): Promise<{ success: boolean }> {
    return request(`/admin/orders/${encodeURIComponent(orderNumber)}/confirm-payment`, {
      method: 'POST'
    });
  },

  deleteOrder(orderNumber: string): Promise<{ success: boolean }> {
    return request(`/admin/orders/${encodeURIComponent(orderNumber)}`, {
      method: 'DELETE'
    });
  },

  uploadEventImage(dataUrl: string): Promise<{ id: string; url: string }> {
    return request('/admin/images', {
      method: 'POST',
      body: { dataUrl }
    });
  },

  stats(): Promise<AdminStats> {
    return request<AdminStats>('/admin/stats');
  },

  listEvents(): Promise<AdminEvent[]> {
    return request<AdminEvent[]>('/admin/events');
  },

  createEvent(input: AdminEventInput): Promise<AdminEvent> {
    return request<AdminEvent>('/admin/events', { method: 'POST', body: input });
  },

  updateEvent(id: string, input: Partial<AdminEventInput>): Promise<AdminEvent> {
    return request<AdminEvent>(`/admin/events/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input
    });
  },

  deleteEvent(id: string): Promise<{ success: boolean }> {
    return request(`/admin/events/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  createTicketType(
    eventId: string,
    input: AdminTicketTypeInput
  ): Promise<{ id: string }> {
    return request(`/admin/events/${encodeURIComponent(eventId)}/ticket-types`, {
      method: 'POST',
      body: input
    });
  },

  updateTicketType(
    id: string,
    input: Partial<AdminTicketTypeInput>
  ): Promise<{ id: string }> {
    return request(`/admin/ticket-types/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input
    });
  },

  deleteTicketType(id: string): Promise<{ success: boolean }> {
    return request(`/admin/ticket-types/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  listOrders(params: { search?: string; eventId?: string } = {}): Promise<
    AdminOrderSummary[]
  > {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.eventId) query.set('eventId', params.eventId);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request<AdminOrderSummary[]>(`/admin/orders${suffix}`);
  },

  getOrder(orderNumber: string): Promise<AdminOrderDetail> {
    return request<AdminOrderDetail>(
      `/admin/orders/${encodeURIComponent(orderNumber)}`
    );
  },

  getTicket(code: string): Promise<{
    code: string;
    typeName: string;
    beneficiaryName: string | null;
    status: string;
    checkedInAt: string | null;
    orderNumber: string | null;
    buyerName: string | null;
    buyerEmail: string | null;
    event: { id: string; title: string; formattedDate: string } | null;
  }> {
    return request(`/admin/tickets/${encodeURIComponent(code.trim())}`);
  },

  checkIn(code: string): Promise<{
    success: boolean;
    code: string;
    typeName: string;
    beneficiaryName: string | null;
    checkedInAt: string;
  }> {
    return request(`/admin/tickets/${encodeURIComponent(code.trim())}/check-in`, {
      method: 'POST'
    });
  },

  resetCheckIn(code: string): Promise<{ success: boolean }> {
    return request(
      `/admin/tickets/${encodeURIComponent(code.trim())}/reset-check-in`,
      { method: 'POST' }
    );
  }
};

/** Message lisible pour une erreur quelconque. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) {
    return error.message.trim() ? error.message : 'Une erreur inattendue est survenue.';
  }
  return toMessage(error) ?? 'Une erreur inattendue est survenue.';
}
