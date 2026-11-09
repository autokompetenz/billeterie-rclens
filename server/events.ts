import { randomInt } from 'node:crypto';
import { Router } from 'express';
import {
  centsToEuros,
  isoNow,
  newId,
  query,
  queryOne,
  withTransaction
} from './db.ts';
import { asyncHandler, badRequest, conflict, notFound, optionalString, requireEmail, requireString } from './http.ts';
import { sendOrderEmails, type MailOrder } from './mailer.ts';
import {
  createPaymentReference,
  getBankAccountSettings,
  paymentInstructions
} from './payment.ts';

/**
 * Catalogue public des événements + commandes invité + vérification.
 * Aucune donnée personnelle complète n'est exposée publiquement.
 */

export const eventsRouter = Router();

const MAX_TICKETS_PER_ORDER = 10;
const STAND_NAMES: Record<string, string> = {
  DELACOURT: 'Tribune Delacourt · Nord',
  TRANNIN: 'Tribune Trannin · Sud',
  MAREK_XERCES: 'Tribune Marek / Xercès · Est',
  LEPAGNOT: 'Tribune Lepagnot · Ouest'
};

/* Images importées depuis l'administration, servies avec un cache long. */
eventsRouter.get(
  '/images/:id',
  asyncHandler(async (req, res) => {
    const id = requireString(req.params.id, 'image', { max: 80 });
    const image = await queryOne<{ mime_type: string; data: Buffer }>(
      'SELECT mime_type, data FROM event_images WHERE id = $1',
      [id]
    );
    if (!image) {
      throw notFound('Image introuvable.');
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.type(image.mime_type).send(image.data);
  })
);

export interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  opponent: string | null;
  venue: string;
  event_date: Date | string;
  doors_open: string | null;
  image_url: string | null;
  status: string;
  featured: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface TicketTypeRow {
  id: string;
  event_id: string;
  name: string;
  stand_id: string | null;
  description: string;
  price_cents: number;
  stock: number;
  sold: number;
  max_per_order: number;
  sort_order: number;
  active: boolean;
}

export interface GuestOrderRow {
  id: string;
  order_number: string;
  event_id: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  total_cents: number;
  status: string;
  payment_ref: string | null;
  created_at: Date | string;
}

export interface GuestTicketRow {
  id: string;
  order_id: string;
  ticket_code: string;
  ticket_type_id: string | null;
  ticket_type_name: string;
  event_id: string | null;
  beneficiary_name: string | null;
  price_cents: number;
  status: string;
  checked_in_at: Date | string | null;
  created_at: Date | string;
}

/* ------------------------------------------------------------------ */
/* Utilitaires partagés                                                */
/* ------------------------------------------------------------------ */

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function formatEventDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });
}

function mapTicketType(row: TicketTypeRow) {
  const available = Math.max(0, row.stock - row.sold);
  return {
    id: row.id,
    standId: row.stand_id,
    name: row.name,
    description: row.description,
    price: centsToEuros(row.price_cents),
    priceCents: row.price_cents,
    stock: row.stock,
    sold: row.sold,
    available,
    maxPerOrder: row.max_per_order,
    active: row.active
  };
}

export function mapEvent(event: EventRow, types: TicketTypeRow[]) {
  const activeTypes = types.filter((type) => type.active);
  const prices = activeTypes.map((type) => type.price_cents);
  const availableStock = activeTypes.reduce(
    (sum, type) => sum + Math.max(0, type.stock - type.sold),
    0
  );

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    category: event.category,
    opponent: event.opponent,
    venue: event.venue,
    eventDate:
      event.event_date instanceof Date
        ? event.event_date.toISOString()
        : new Date(event.event_date).toISOString(),
    formattedDate: formatEventDate(event.event_date),
    doorsOpen: event.doors_open,
    imageUrl: event.image_url,
    status: event.status,
    featured: Boolean(event.featured),
    minPrice: prices.length ? centsToEuros(Math.min(...prices)) : 0,
    availableStock,
    ticketTypes: activeTypes.map(mapTicketType)
  };
}

async function loadTypesForEvents(eventIds: string[]): Promise<Map<string, TicketTypeRow[]>> {
  if (eventIds.length === 0) return new Map();
  const rows = await query<TicketTypeRow>(
    'SELECT * FROM event_ticket_types WHERE event_id = ANY($1::text[]) ORDER BY sort_order, name',
    [eventIds]
  );
  const map = new Map<string, TicketTypeRow[]>();
  for (const row of rows) {
    const list = map.get(row.event_id) ?? [];
    list.push(row);
    map.set(row.event_id, list);
  }
  return map;
}

export async function loadPublicEvents(): Promise<ReturnType<typeof mapEvent>[]> {
  const events = await query<EventRow>(
    "SELECT * FROM events WHERE status = 'published' ORDER BY event_date"
  );
  const types = await loadTypesForEvents(events.map((event) => event.id));
  return events.map((event) => mapEvent(event, types.get(event.id) ?? []));
}

export async function loadEvent(idOrSlug: string): Promise<{
  event: EventRow;
  types: TicketTypeRow[];
} | null> {
  const event = await queryOne<EventRow>(
    'SELECT * FROM events WHERE id = $1 OR slug = $1',
    [idOrSlug]
  );
  if (!event) return null;
  const types = await query<TicketTypeRow>(
    'SELECT * FROM event_ticket_types WHERE event_id = $1 ORDER BY sort_order, name',
    [event.id]
  );
  return { event, types };
}

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `BC-${year}-${randomInt(100000, 999999)}`;
    const exists = await queryOne('SELECT 1 FROM guest_orders WHERE order_number = $1', [
      candidate
    ]);
    if (!exists) return candidate;
  }
  return `BC-${year}-${randomInt(1000000, 9999999)}`;
}

async function generateTicketCode(tx: {
  queryOne: (text: string, params?: unknown[]) => Promise<unknown>;
}): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `RCL-${year}-${randomInt(100000, 999999)}`;
    const exists = await tx.queryOne('SELECT 1 FROM guest_tickets WHERE ticket_code = $1', [
      candidate
    ]);
    if (!exists) return candidate;
  }
  return `RCL-${year}-${randomInt(1000000, 9999999)}`;
}

export function maskName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${'*'.repeat(Math.max(2, part.length - 1))}`)
    .join(' ');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(2, local.length - 1))}@${domain}`;
}

/* ------------------------------------------------------------------ */
/* Routes publiques                                                    */
/* ------------------------------------------------------------------ */

eventsRouter.get(
  '/events',
  asyncHandler(async (_req, res) => {
    res.json(await loadPublicEvents());
  })
);

eventsRouter.get(
  '/events/:idOrSlug',
  asyncHandler(async (req, res) => {
    const loaded = await loadEvent(req.params.idOrSlug);
    if (!loaded || loaded.event.status !== 'published') {
      throw notFound('Événement introuvable.');
    }
    res.json(mapEvent(loaded.event, loaded.types));
  })
);

/* ------------------------------------------------------------------ */
/* Commande invité                                                     */
/* ------------------------------------------------------------------ */

interface GuestItemInput {
  ticketTypeId: string;
  quantity: number;
  beneficiaries?: unknown;
}

eventsRouter.post(
  '/orders/guest',
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const eventId = requireString(body.eventId, 'événement', { max: 160 });
    const buyerName = requireString(body.buyer?.name, 'nom', { min: 2, max: 120 });
    const buyerEmail = requireEmail(body.buyer?.email);
    const buyerPhone = optionalString(body.buyer?.phone, 40);

    const items: GuestItemInput[] = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      throw badRequest('Sélectionnez au moins un billet.', 'EMPTY_CART');
    }

    const totalQuantity = items.reduce(
      (sum, item) => sum + (Number.isInteger(item?.quantity) ? item.quantity : 0),
      0
    );
    if (totalQuantity <= 0) {
      throw badRequest('Sélectionnez au moins un billet.', 'EMPTY_CART');
    }
    if (totalQuantity > MAX_TICKETS_PER_ORDER) {
      throw badRequest(
        `Maximum ${MAX_TICKETS_PER_ORDER} billets par commande.`,
        'TOO_MANY_TICKETS'
      );
    }

    const orderNumber = await generateOrderNumber();
    const bankAccount = await getBankAccountSettings();
    const paymentReference = await createPaymentReference();
    const orderId = newId('gord');
    const createdAt = isoNow();

    const result = await withTransaction(async (tx) => {
      const event = await tx.queryOne<EventRow>(
        'SELECT * FROM events WHERE id = $1 FOR UPDATE',
        [eventId]
      );

      if (!event || event.status !== 'published') {
        throw notFound('Événement introuvable ou fermé à la vente.');
      }

      if (new Date(event.event_date).getTime() < Date.now()) {
        throw conflict('La billetterie de cet événement est fermée.', 'EVENT_CLOSED');
      }

      const requested = new Map<string, number>();
      for (const item of items) {
        const ticketTypeId = requireString(item?.ticketTypeId, 'catégorie de billet', {
          max: 160
        });
        const quantity = item?.quantity;
        if (!Number.isInteger(quantity) || quantity < 1) {
          throw badRequest('Quantité de billets invalide.', 'VALIDATION_ERROR');
        }
        requested.set(ticketTypeId, (requested.get(ticketTypeId) ?? 0) + quantity);
      }

      const typeIds = [...requested.keys()];
      const types = await tx.query<TicketTypeRow>(
        'SELECT * FROM event_ticket_types WHERE id = ANY($1::text[]) AND event_id = $2 FOR UPDATE',
        [typeIds, event.id]
      );

      if (types.length !== typeIds.length) {
        throw notFound('Une catégorie de billet est introuvable pour cet événement.');
      }

      const byId = new Map(types.map((type) => [type.id, type]));
      let totalCents = 0;
      const lines: Array<{
        type: TicketTypeRow;
        quantity: number;
        beneficiaries: string[];
      }> = [];

      for (const [ticketTypeId, quantity] of requested) {
        const type = byId.get(ticketTypeId)!;
        if (!type.active) {
          throw conflict(
            `La catégorie « ${type.name} » n'est plus en vente.`,
            'TICKET_TYPE_INACTIVE'
          );
        }
        if (quantity > type.max_per_order) {
          throw badRequest(
            `Maximum ${type.max_per_order} billets pour « ${type.name} ».`,
            'MAX_PER_ORDER'
          );
        }
        const available = type.stock - type.sold;
        if (quantity > available) {
          throw conflict(
            available <= 0
              ? `La catégorie « ${type.name} » est épuisée.`
              : `Il ne reste que ${available} billet(s) pour « ${type.name} ».`,
            'NOT_ENOUGH_STOCK'
          );
        }

        totalCents += type.price_cents * quantity;

        const input = items.find((item) => item?.ticketTypeId === ticketTypeId);
        const rawBeneficiaries = Array.isArray(input?.beneficiaries)
          ? input.beneficiaries
          : [];
        const beneficiaries = Array.from({ length: quantity }, (_, index) => {
          const value = rawBeneficiaries[index];
          return typeof value === 'string' && value.trim()
            ? value.trim().slice(0, 120)
            : buyerName;
        });

        lines.push({ type, quantity, beneficiaries });
      }

      await tx.execute(
        `INSERT INTO guest_orders (
           id, order_number, event_id, buyer_name, buyer_email, buyer_phone,
           total_cents, status, payment_ref, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending_payment',$8,$9)`,
        [
          orderId,
          orderNumber,
          event.id,
          buyerName,
          buyerEmail,
          buyerPhone ?? null,
          totalCents,
          paymentReference,
          createdAt
        ]
      );

      const createdTickets: GuestTicketRow[] = [];

      for (const line of lines) {
        const ticketTypeName = line.type.stand_id
          ? `${STAND_NAMES[line.type.stand_id] ?? 'Tribune'} · ${line.type.name}`
          : line.type.name;
        await tx.execute(
          `INSERT INTO guest_order_items (
             id, order_id, ticket_type_id, ticket_type_name, unit_price_cents, quantity
           ) VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            newId('gitem'),
            orderId,
            line.type.id,
            ticketTypeName,
            line.type.price_cents,
            line.quantity
          ]
        );

        for (const beneficiary of line.beneficiaries) {
          const ticketCode = await generateTicketCode(tx);
          const ticket: GuestTicketRow = {
            id: newId('gtkt'),
            order_id: orderId,
            ticket_code: ticketCode,
            ticket_type_id: line.type.id,
            ticket_type_name: ticketTypeName,
            event_id: event.id,
            beneficiary_name: beneficiary,
            price_cents: line.type.price_cents,
            status: 'pending_payment',
            checked_in_at: null,
            created_at: createdAt
          };

          await tx.execute(
            `INSERT INTO guest_tickets (
               id, order_id, ticket_code, ticket_type_id, ticket_type_name,
               event_id, beneficiary_name, price_cents, status, created_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_payment',$9)`,
            [
              ticket.id,
              ticket.order_id,
              ticket.ticket_code,
              ticket.ticket_type_id,
              ticket.ticket_type_name,
              ticket.event_id,
              ticket.beneficiary_name,
              ticket.price_cents,
              ticket.created_at
            ]
          );

          createdTickets.push(ticket);
        }

        const changes = await tx.execute(
          'UPDATE event_ticket_types SET sold = sold + $1, updated_at = NOW() WHERE id = $2 AND sold + $1 <= stock',
          [line.quantity, line.type.id]
        );
        if (changes !== 1) {
          throw conflict(
            `La catégorie « ${line.type.name} » vient d'être épuisée.`,
            'NOT_ENOUGH_STOCK'
          );
        }
      }

      return { event, createdTickets, totalCents };
    });

    const mailOrder: MailOrder = {
      orderNumber,
      eventTitle: result.event.title,
      eventDate: result.event.event_date,
      venue: result.event.venue,
      buyerName,
      buyerEmail,
      buyerPhone,
      totalCents: result.totalCents,
      createdAt,
      payment: paymentInstructions(bankAccount, paymentReference, result.totalCents),
      tickets: result.createdTickets.map((ticket) => ({
        code: ticket.ticket_code,
        typeName: ticket.ticket_type_name,
        beneficiaryName: ticket.beneficiary_name,
        priceCents: ticket.price_cents
      }))
    };

    // Les e-mails ne doivent jamais faire échouer une commande payée.
    await sendOrderEmails(mailOrder);

    res.status(201).json({
      success: true,
      orderNumber,
      status: 'pending_payment',
      total: centsToEuros(result.totalCents),
      payment: paymentInstructions(bankAccount, paymentReference, result.totalCents),
      event: {
        id: result.event.id,
        title: result.event.title,
        formattedDate: formatEventDate(result.event.event_date),
        venue: result.event.venue
      },
      buyer: { name: buyerName, email: buyerEmail },
      tickets: result.createdTickets.map((ticket) => ({
        code: ticket.ticket_code,
        typeName: ticket.ticket_type_name,
        beneficiaryName: ticket.beneficiary_name,
        price: centsToEuros(ticket.price_cents)
      })),
      verificationUrl: `/verifier?commande=${encodeURIComponent(orderNumber)}`
    });
  })
);

/* ------------------------------------------------------------------ */
/* Vérification d'une commande                                         */
/* ------------------------------------------------------------------ */

export async function findOrderByNumber(orderNumber: string) {
  return queryOne<GuestOrderRow>('SELECT * FROM guest_orders WHERE UPPER(order_number) = $1', [
    orderNumber.trim().toUpperCase()
  ]);
}

eventsRouter.get(
  '/orders/verify/:orderNumber',
  asyncHandler(async (req, res) => {
    const order = await findOrderByNumber(req.params.orderNumber);
    if (!order) {
      const legacyOrder = await queryOne<{
        id: string;
        buyer_name: string;
        buyer_email: string;
        total_cents: number;
        status: string;
        created_at: string | Date;
      }>('SELECT id, buyer_name, buyer_email, total_cents, status, created_at FROM orders WHERE UPPER(id) = $1', [
        req.params.orderNumber.trim().toUpperCase()
      ]);
      if (legacyOrder) {
        const legacyTickets = await query<{
          ticket_number: string;
          opponent: string;
          match_id: string;
          match_date: string;
          kickoff: string;
          competition: string;
          stand_name: string;
          sector_name: string;
          beneficiary_name: string;
          price_cents: number;
          status: string;
        }>(
          `SELECT ticket_number, opponent, match_id, match_date, kickoff, competition,
                  stand_name, sector_name, beneficiary_name, price_cents, status
             FROM tickets WHERE order_id = $1 ORDER BY id`,
          [legacyOrder.id]
        );
        const first = legacyTickets[0];
        res.json({
          found: true,
          orderNumber: legacyOrder.id,
          status: legacyOrder.status,
          createdAt: legacyOrder.created_at instanceof Date
            ? legacyOrder.created_at.toISOString()
            : new Date(legacyOrder.created_at).toISOString(),
          total: centsToEuros(legacyOrder.total_cents),
          event: first ? {
            id: first.match_id,
            title: first.competition.includes('Visites') ? first.opponent : `RC Lens – ${first.opponent}`,
            formattedDate: formatEventDate(`${first.match_date} ${first.kickoff}`),
            venue: 'Stade Bollaert-Delelis'
          } : null,
          buyer: {
            name: maskName(legacyOrder.buyer_name),
            email: maskEmail(legacyOrder.buyer_email)
          },
          items: legacyTickets.map((ticket) => ({
            name: `${ticket.stand_name} · ${ticket.sector_name}`,
            quantity: 1,
            unitPrice: centsToEuros(ticket.price_cents)
          })),
          tickets: legacyTickets.map((ticket) => ({
            code: ticket.ticket_number,
            typeName: `${ticket.stand_name} · ${ticket.sector_name}`,
            beneficiaryName: maskName(ticket.beneficiary_name),
            price: centsToEuros(ticket.price_cents),
            status: ticket.status,
            checkedInAt: null
          })),
          summary: {
            total: legacyTickets.length,
            valid: legacyTickets.filter((ticket) => ticket.status === 'valid').length,
            used: legacyTickets.filter((ticket) => ticket.status === 'used').length,
            cancelled: legacyTickets.filter((ticket) => ticket.status === 'cancelled').length
          }
        });
        return;
      }
      throw notFound('Aucun bon de commande ne correspond à ce numéro.');
    }

    const [event, tickets, items] = await Promise.all([
      order.event_id
        ? queryOne<EventRow>('SELECT * FROM events WHERE id = $1', [order.event_id])
        : Promise.resolve(undefined),
      query<GuestTicketRow>(
        'SELECT * FROM guest_tickets WHERE order_id = $1 ORDER BY created_at, ticket_code',
        [order.id]
      ),
      query<{
        ticket_type_name: string;
        unit_price_cents: number;
        quantity: number;
      }>('SELECT ticket_type_name, unit_price_cents, quantity FROM guest_order_items WHERE order_id = $1', [
        order.id
      ])
    ]);

    res.json({
      found: true,
      orderNumber: order.order_number,
      status: order.status,
      createdAt:
        order.created_at instanceof Date
          ? order.created_at.toISOString()
          : new Date(order.created_at).toISOString(),
      total: centsToEuros(order.total_cents),
      event: event
        ? {
            id: event.id,
            title: event.title,
            formattedDate: formatEventDate(event.event_date),
            venue: event.venue
          }
        : null,
      buyer: {
        name: maskName(order.buyer_name),
        email: maskEmail(order.buyer_email)
      },
      items: items.map((item) => ({
        name: item.ticket_type_name,
        quantity: item.quantity,
        unitPrice: centsToEuros(item.unit_price_cents)
      })),
      tickets: tickets.map((ticket) => ({
        code: ticket.ticket_code,
        typeName: ticket.ticket_type_name,
        beneficiaryName: maskName(ticket.beneficiary_name || order.buyer_name),
        price: centsToEuros(ticket.price_cents),
        status: ticket.status,
        checkedInAt:
          ticket.checked_in_at instanceof Date
            ? ticket.checked_in_at.toISOString()
            : ticket.checked_in_at
      })),
      summary: {
        total: tickets.length,
        valid: tickets.filter((ticket) => ticket.status === 'valid').length,
        used: tickets.filter((ticket) => ticket.status === 'used').length,
        cancelled: tickets.filter((ticket) => ticket.status === 'cancelled').length
      }
    });
  })
);

/* ------------------------------------------------------------------ */
/* Vérification d'un billet                                            */
/* ------------------------------------------------------------------ */

eventsRouter.get(
  '/tickets/verify/:code',
  asyncHandler(async (req, res) => {
    const ticket = await queryOne<GuestTicketRow>(
      'SELECT * FROM guest_tickets WHERE UPPER(ticket_code) = $1',
      [req.params.code.trim().toUpperCase()]
    );

    if (!ticket) {
      throw notFound('Billet introuvable.');
    }

    const event = ticket.event_id
      ? await queryOne<EventRow>('SELECT * FROM events WHERE id = $1', [ticket.event_id])
      : undefined;

    res.json({
      found: true,
      code: ticket.ticket_code,
      typeName: ticket.ticket_type_name,
      beneficiaryName: maskName(ticket.beneficiary_name || ''),
      price: centsToEuros(ticket.price_cents),
      status: ticket.status,
      checkedInAt:
        ticket.checked_in_at instanceof Date
          ? ticket.checked_in_at.toISOString()
          : ticket.checked_in_at,
      event: event
        ? {
            id: event.id,
            title: event.title,
            formattedDate: formatEventDate(event.event_date),
            venue: event.venue
          }
        : null
    });
  })
);
