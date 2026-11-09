import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import {
  clearAdminFailures,
  clearAdminCookie,
  checkAdminRateLimit,
  createAdminToken,
  getAdminCode,
  isAdminConfigured,
  isAdminRequest,
  registerAdminFailure,
  requireAdmin,
  setAdminCookie
} from './admin-auth.ts';
import {
  centsToEuros,
  execute,
  isoNow,
  newId,
  query,
  queryOne,
  withTransaction
} from './db.ts';
import {
  HttpError,
  asyncHandler,
  badRequest,
  conflict,
  notFound,
  optionalString,
  requireString
} from './http.ts';
import {
  formatEventDate,
  mapEvent,
  maskEmail,
  maskName,
  slugify,
  type EventRow,
  type GuestOrderRow,
  type GuestTicketRow,
  type TicketTypeRow
} from './events.ts';
import { validateBankAccount } from './payment.ts';

export const adminRouter = Router();

/* ------------------------------------------------------------------ */
/* Images d'événements                                                 */
/* ------------------------------------------------------------------ */

const IMAGE_DATA_URL_PATTERN =
  /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;
const MAX_IMAGE_BYTES = 2_500_000;
const EVENT_STAND_IDS = ['MAREK_XERCES', 'LEPAGNOT', 'DELACOURT', 'TRANNIN'] as const;

function parseEventStand(value: unknown): (typeof EVENT_STAND_IDS)[number] {
  if (typeof value !== 'string' || !EVENT_STAND_IDS.includes(value as (typeof EVENT_STAND_IDS)[number])) {
    throw badRequest('Choisissez une tribune valide.');
  }
  return value as (typeof EVENT_STAND_IDS)[number];
}

/** Vérifie la signature binaire pour éviter un fichier déguisé en image. */
function hasValidImageSignature(data: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      data.length > 8 &&
      data
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  if (mimeType === 'image/webp') {
    return (
      data.length > 12 &&
      data.toString('ascii', 0, 4) === 'RIFF' &&
      data.toString('ascii', 8, 12) === 'WEBP'
    );
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Connexion / session                                                 */
/* ------------------------------------------------------------------ */

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

adminRouter.post(
  '/admin/login',
  asyncHandler(async (req, res) => {
    if (!isAdminConfigured()) {
      throw new HttpError(
        503,
        "L'espace administrateur n'est pas configuré (ADMIN_CODE manquant).",
        'ADMIN_NOT_CONFIGURED'
      );
    }

    const ip = req.ip ?? 'local';
    checkAdminRateLimit(ip);

    const code = requireString(req.body?.code, 'code', { min: 1, max: 200 });
    if (!safeEqual(code, getAdminCode()!)) {
      registerAdminFailure(ip);
      throw new HttpError(401, 'Code administrateur incorrect.', 'INVALID_ADMIN_CODE');
    }

    clearAdminFailures(ip);
    const token = createAdminToken();
    setAdminCookie(res, token);
    res.json({ authenticated: true, expiresAt: new Date(Date.now() + 12 * 3600_000).toISOString() });
  })
);

adminRouter.post(
  '/admin/logout',
  asyncHandler((_req, res) => {
    clearAdminCookie(res);
    res.json({ success: true });
  })
);

adminRouter.get(
  '/admin/session',
  asyncHandler((req, res) => {
    res.json({ authenticated: isAdminRequest(req) });
  })
);

/* Toutes les routes suivantes exigent le cookie admin. */
adminRouter.use('/admin', requireAdmin);

adminRouter.get(
  '/admin/bank-transfer',
  asyncHandler(async (_req, res) => {
    const row = await queryOne<{
      account_holder: string;
      iban: string;
      bic: string;
    }>("SELECT account_holder, iban, bic FROM bank_transfer_settings WHERE id = 'default'");
    res.json(row ? {
      accountHolder: row.account_holder,
      iban: row.iban,
      bic: row.bic
    } : null);
  })
);

adminRouter.put(
  '/admin/bank-transfer',
  asyncHandler(async (req, res) => {
    const account = validateBankAccount(req.body);
    await execute(
      `INSERT INTO bank_transfer_settings (id, account_holder, iban, bic, updated_at)
       VALUES ('default', $1, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET account_holder = EXCLUDED.account_holder,
         iban = EXCLUDED.iban, bic = EXCLUDED.bic, updated_at = NOW()`,
      [account.accountHolder, account.iban, account.bic]
    );
    res.json(account);
  })
);

adminRouter.post(
  '/admin/orders/:orderNumber/confirm-payment',
  asyncHandler(async (req, res) => {
    const orderNumber = req.params.orderNumber.trim().toUpperCase();
    const guestOrder = await queryOne<{ id: string; status: string }>(
      'SELECT id, status FROM guest_orders WHERE UPPER(order_number) = $1',
      [orderNumber]
    );
    if (guestOrder) {
      if (guestOrder.status !== 'paid') {
        await withTransaction(async (tx) => {
          await tx.execute("UPDATE guest_orders SET status = 'paid' WHERE id = $1", [guestOrder.id]);
          await tx.execute(
            "UPDATE guest_tickets SET status = 'valid' WHERE order_id = $1 AND status = 'pending_payment'",
            [guestOrder.id]
          );
        });
      }
      res.json({ success: true, status: 'paid' });
      return;
    }

    const legacyOrder = await queryOne<{ id: string; status: string }>(
      'SELECT id, status FROM orders WHERE UPPER(id) = $1',
      [orderNumber]
    );
    if (!legacyOrder) throw notFound('Commande introuvable.');
    if (legacyOrder.status !== 'paid') {
      await withTransaction(async (tx) => {
        await tx.execute("UPDATE orders SET status = 'paid' WHERE id = $1", [legacyOrder.id]);
        await tx.execute(
          "UPDATE tickets SET status = 'valid' WHERE order_id = $1 AND status = 'pending_payment'",
          [legacyOrder.id]
        );
      });
    }
    res.json({ success: true, status: 'paid' });
  })
);

adminRouter.post(
  '/admin/images',
  asyncHandler(async (req, res) => {
    const dataUrl = requireString(req.body?.dataUrl, 'image', {
      min: 30,
      max: 3_500_000
    });
    const match = IMAGE_DATA_URL_PATTERN.exec(dataUrl);
    if (!match) {
      throw badRequest(
        'Format d’image invalide. Utilisez un fichier JPG, PNG ou WebP.',
        'INVALID_IMAGE'
      );
    }

    const mimeType = match[1];
    const data = Buffer.from(match[2], 'base64');
    if (!data.length) {
      throw badRequest('L’image est vide.', 'INVALID_IMAGE');
    }
    if (data.length > MAX_IMAGE_BYTES) {
      throw badRequest('Image trop lourde (2,5 Mo maximum).', 'IMAGE_TOO_LARGE');
    }
    if (!hasValidImageSignature(data, mimeType)) {
      throw badRequest(
        'Le fichier ne correspond pas à une image valide.',
        'INVALID_IMAGE'
      );
    }

    const id = newId('img');
    await execute(
      'INSERT INTO event_images (id, mime_type, data) VALUES ($1, $2, $3)',
      [id, mimeType, data]
    );

    res.status(201).json({ id, url: `/api/images/${id}` });
  })
);

/* ------------------------------------------------------------------ */
/* Événements                                                          */
/* ------------------------------------------------------------------ */

interface EventInput {
  title: string;
  description: string;
  category: string;
  opponent: string | null;
  venue: string;
  eventDate: string;
  doorsOpen: string | null;
  imageUrl: string | null;
  status: string;
  featured: boolean;
  slug: string;
}

const EVENT_STATUSES = new Set(['draft', 'published', 'sold_out', 'cancelled']);

function parseEventInput(body: any, existing?: EventRow): EventInput {
  const title = body.title !== undefined
    ? requireString(body.title, 'titre', { min: 2, max: 180 })
    : existing?.title ?? '';
  if (!title) throw badRequest('Le titre est requis.', 'VALIDATION_ERROR');

  const rawDate = body.eventDate !== undefined ? body.eventDate : existing?.event_date;
  const date = rawDate ? new Date(rawDate as string) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw badRequest('Date et heure de l’événement invalides.', 'VALIDATION_ERROR');
  }

  const status = body.status !== undefined ? String(body.status) : existing?.status ?? 'draft';
  if (!EVENT_STATUSES.has(status)) {
    throw badRequest('Statut d’événement invalide.', 'VALIDATION_ERROR');
  }

  return {
    title,
    description:
      body.description !== undefined
        ? optionalString(body.description, 5000) ?? ''
        : existing?.description ?? '',
    category:
      body.category !== undefined
        ? optionalString(body.category, 60) ?? 'Match'
        : existing?.category ?? 'Match',
    opponent:
      body.opponent !== undefined
        ? optionalString(body.opponent, 120) ?? null
        : existing?.opponent ?? null,
    venue:
      body.venue !== undefined
        ? requireString(body.venue, 'lieu', { min: 2, max: 180 })
        : existing?.venue ?? 'Stade Bollaert-Delelis, Lens',
    eventDate: date.toISOString(),
    doorsOpen:
      body.doorsOpen !== undefined
        ? optionalString(body.doorsOpen, 40) ?? null
        : existing?.doors_open ?? null,
    imageUrl:
      body.imageUrl !== undefined
        ? optionalString(body.imageUrl, 500) ?? null
        : existing?.image_url ?? null,
    status,
    featured:
      body.featured !== undefined ? Boolean(body.featured) : Boolean(existing?.featured),
    slug:
      body.slug !== undefined
        ? slugify(String(body.slug)) || slugify(title)
        : existing?.slug ?? slugify(title)
  };
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || `evenement-${Date.now()}`;
  let candidate = root;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM events WHERE slug = $1 AND id <> $2',
      [candidate, excludeId ?? '']
    );
    if (!existing) return candidate;
    candidate = `${root}-${suffix}`;
  }
  return `${root}-${Date.now()}`;
}

async function adminEventPayload(event: EventRow) {
  const types = await query<TicketTypeRow>(
    'SELECT * FROM event_ticket_types WHERE event_id = $1 ORDER BY sort_order, name',
    [event.id]
  );
  const [orderStats, ticketStats] = await Promise.all([
    queryOne<{ orders: string; revenue: string }>(
      `SELECT COUNT(*)::text AS orders,
              COALESCE(SUM(total_cents) FILTER (WHERE status = 'paid'), 0)::text AS revenue
         FROM guest_orders
        WHERE event_id = $1`,
      [event.id]
    ),
    queryOne<{ tickets: string }>(
      `SELECT COUNT(*)::text AS tickets
         FROM guest_tickets
        WHERE event_id = $1`,
      [event.id]
    )
  ]);

  return {
    ...mapEvent(event, types),
    slug: event.slug,
    doorsOpen: event.doors_open,
    imageUrl: event.image_url,
    ticketTypes: types.map((type) => ({
      id: type.id,
      standId: type.stand_id,
      name: type.name,
      description: type.description,
      price: centsToEuros(type.price_cents),
      priceCents: type.price_cents,
      stock: type.stock,
      sold: type.sold,
      available: Math.max(0, type.stock - type.sold),
      maxPerOrder: type.max_per_order,
      sortOrder: type.sort_order,
      active: Boolean(type.active)
    })),
    stats: {
      orders: Number(orderStats?.orders ?? 0),
      ticketsSold: Number(ticketStats?.tickets ?? 0),
      revenue: centsToEuros(Number(orderStats?.revenue ?? 0))
    }
  };
}

adminRouter.get(
  '/admin/events',
  asyncHandler(async (_req, res) => {
    const events = await query<EventRow>('SELECT * FROM events ORDER BY event_date DESC');
    res.json(await Promise.all(events.map(adminEventPayload)));
  })
);

adminRouter.get(
  '/admin/events/:id',
  asyncHandler(async (req, res) => {
    const event = await queryOne<EventRow>('SELECT * FROM events WHERE id = $1', [
      req.params.id
    ]);
    if (!event) throw notFound('Événement introuvable.');
    res.json(await adminEventPayload(event));
  })
);

adminRouter.post(
  '/admin/events',
  asyncHandler(async (req, res) => {
    const input = parseEventInput(req.body ?? {});
    const slug = await uniqueSlug(input.slug || input.title);
    const id = newId('evt');

    await execute(
      `INSERT INTO events (
         id, slug, title, description, category, opponent, venue, event_date,
         doors_open, image_url, status, featured, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
      [
        id,
        slug,
        input.title,
        input.description,
        input.category,
        input.opponent,
        input.venue,
        input.eventDate,
        input.doorsOpen,
        input.imageUrl,
        input.status,
        input.featured
      ]
    );

    const event = await queryOne<EventRow>('SELECT * FROM events WHERE id = $1', [id]);
    res.status(201).json(await adminEventPayload(event!));
  })
);

adminRouter.patch(
  '/admin/events/:id',
  asyncHandler(async (req, res) => {
    const existing = await queryOne<EventRow>('SELECT * FROM events WHERE id = $1', [
      req.params.id
    ]);
    if (!existing) throw notFound('Événement introuvable.');

    const input = parseEventInput(req.body ?? {}, existing);
    const slug = await uniqueSlug(input.slug, existing.id);

    await execute(
      `UPDATE events SET
         slug = $1, title = $2, description = $3, category = $4, opponent = $5,
         venue = $6, event_date = $7, doors_open = $8, image_url = $9,
         status = $10, featured = $11, updated_at = NOW()
       WHERE id = $12`,
      [
        slug,
        input.title,
        input.description,
        input.category,
        input.opponent,
        input.venue,
        input.eventDate,
        input.doorsOpen,
        input.imageUrl,
        input.status,
        input.featured,
        existing.id
      ]
    );

    const event = await queryOne<EventRow>('SELECT * FROM events WHERE id = $1', [
      existing.id
    ]);
    res.json(await adminEventPayload(event!));
  })
);

adminRouter.delete(
  '/admin/events/:id',
  asyncHandler(async (req, res) => {
    const existing = await queryOne<EventRow>('SELECT * FROM events WHERE id = $1', [
      req.params.id
    ]);
    if (!existing) throw notFound('Événement introuvable.');

    await withTransaction(async (tx) => {
      // Les commandes et billets gardent leur historique après suppression de l'événement.
      await tx.execute(
        `UPDATE guest_orders SET
           event_snapshot_id = COALESCE(event_snapshot_id, $2),
           event_title = COALESCE(event_title, $3),
           event_date = COALESCE(event_date, $4),
           event_venue = COALESCE(event_venue, $5)
         WHERE event_id = $1`,
        [existing.id, existing.id, existing.title, existing.event_date, existing.venue]
      );
      await tx.execute('DELETE FROM events WHERE id = $1', [existing.id]);
    });
    res.json({ success: true });
  })
);

/* ------------------------------------------------------------------ */
/* Catégories de billets                                               */
/* ------------------------------------------------------------------ */

function parsePriceCents(body: any): number {
  if (Number.isInteger(body?.priceCents) && body.priceCents >= 0) {
    return body.priceCents;
  }
  const price = Number(body?.price);
  if (!Number.isFinite(price) || price < 0) {
    throw badRequest('Prix du billet invalide.', 'VALIDATION_ERROR');
  }
  return Math.round(price * 100);
}

function parseStock(value: unknown, fallback?: number): number {
  if (value === undefined) {
    if (fallback !== undefined) return fallback;
    throw badRequest('Stock du billet requis.', 'VALIDATION_ERROR');
  }
  const stock = Number(value);
  if (!Number.isInteger(stock) || stock < 0) {
    throw badRequest('Stock du billet invalide.', 'VALIDATION_ERROR');
  }
  return stock;
}

adminRouter.post(
  '/admin/events/:id/ticket-types',
  asyncHandler(async (req, res) => {
    const event = await queryOne<EventRow>('SELECT * FROM events WHERE id = $1', [
      req.params.id
    ]);
    if (!event) throw notFound('Événement introuvable.');

    const name = requireString(req.body?.name, 'nom de la catégorie', {
      min: 2,
      max: 120
    });
    const standId = parseEventStand(req.body?.standId);
    const priceCents = parsePriceCents(req.body);
    const stock = parseStock(req.body?.stock);
    const maxPerOrder = req.body?.maxPerOrder === undefined
      ? Math.min(10, Math.max(1, stock))
      : Math.min(20, Math.max(1, Number(req.body.maxPerOrder)));
    const sortOrder = req.body?.sortOrder === undefined
      ? 0
      : Number(req.body.sortOrder) || 0;

    const id = newId('ett');
    await execute(
      `INSERT INTO event_ticket_types (
         id, event_id, name, stand_id, description, price_cents, stock, max_per_order,
         sort_order, active, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
      [
        id,
        event.id,
        name,
        standId,
        optionalString(req.body?.description, 1000) ?? '',
        priceCents,
        stock,
        maxPerOrder,
        sortOrder,
        req.body?.active === undefined ? true : Boolean(req.body.active)
      ]
    );

    const type = await queryOne<TicketTypeRow>(
      'SELECT * FROM event_ticket_types WHERE id = $1',
      [id]
    );
    res.status(201).json(type);
  })
);

adminRouter.patch(
  '/admin/ticket-types/:id',
  asyncHandler(async (req, res) => {
    const existing = await queryOne<TicketTypeRow>(
      'SELECT * FROM event_ticket_types WHERE id = $1',
      [req.params.id]
    );
    if (!existing) throw notFound('Catégorie de billet introuvable.');

    const name = req.body?.name !== undefined
      ? requireString(req.body.name, 'nom de la catégorie', { min: 2, max: 120 })
      : existing.name;
    const standId = req.body?.standId !== undefined
      ? parseEventStand(req.body.standId)
      : existing.stand_id;
    const priceCents = req.body?.price !== undefined || req.body?.priceCents !== undefined
      ? parsePriceCents(req.body)
      : existing.price_cents;
    const stock = parseStock(req.body?.stock, existing.stock);
    if (stock < existing.sold) {
      throw badRequest(
        `Le stock ne peut pas être inférieur aux ${existing.sold} billets déjà vendus.`,
        'STOCK_TOO_LOW'
      );
    }
    const maxPerOrder = req.body?.maxPerOrder === undefined
      ? existing.max_per_order
      : Math.min(20, Math.max(1, Number(req.body.maxPerOrder)));
    const sortOrder = req.body?.sortOrder === undefined
      ? existing.sort_order
      : Number(req.body.sortOrder) || 0;

    await execute(
      `UPDATE event_ticket_types SET
         name = $1, stand_id = $2, description = $3, price_cents = $4, stock = $5,
         max_per_order = $6, sort_order = $7, active = $8, updated_at = NOW()
       WHERE id = $9`,
      [
        name,
        standId,
        req.body?.description !== undefined
          ? optionalString(req.body.description, 1000) ?? ''
          : existing.description,
        priceCents,
        stock,
        maxPerOrder,
        sortOrder,
        req.body?.active === undefined ? existing.active : Boolean(req.body.active),
        existing.id
      ]
    );

    const type = await queryOne<TicketTypeRow>(
      'SELECT * FROM event_ticket_types WHERE id = $1',
      [existing.id]
    );
    res.json(type);
  })
);

adminRouter.delete(
  '/admin/ticket-types/:id',
  asyncHandler(async (req, res) => {
    const existing = await queryOne<TicketTypeRow>(
      'SELECT * FROM event_ticket_types WHERE id = $1',
      [req.params.id]
    );
    if (!existing) throw notFound('Catégorie de billet introuvable.');
    if (existing.sold > 0) {
      throw conflict(
        'Des billets ont déjà été vendus dans cette catégorie : désactivez-la plutôt que de la supprimer.',
        'TICKET_TYPE_HAS_SALES'
      );
    }

    await execute('DELETE FROM event_ticket_types WHERE id = $1', [existing.id]);
    res.json({ success: true });
  })
);

/* ------------------------------------------------------------------ */
/* Commandes                                                           */
/* ------------------------------------------------------------------ */

adminRouter.get(
  '/admin/orders',
  asyncHandler(async (req, res) => {
    const search = optionalString(req.query.search, 120);
    const eventId = optionalString(req.query.eventId, 160);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(o.order_number ILIKE $${params.length} OR o.buyer_email ILIKE $${params.length} OR o.buyer_name ILIKE $${params.length})`
      );
    }
    if (eventId) {
      params.push(eventId);
      conditions.push(`o.event_id = $${params.length}`);
    }
    params.push(limit);

    const rows = await query<
      GuestOrderRow & {
        display_event_title: string | null;
        display_event_date: Date | string | null;
        ticket_count: string;
        checked_in_count: string;
      }
    >(
      `SELECT o.*, COALESCE(e.title, o.event_title) AS display_event_title,
              COALESCE(e.event_date, o.event_date) AS display_event_date,
              COUNT(t.id)::text AS ticket_count,
              COUNT(t.id) FILTER (WHERE t.status = 'used')::text AS checked_in_count
         FROM guest_orders o
         LEFT JOIN events e ON e.id = o.event_id
         LEFT JOIN guest_tickets t ON t.order_id = o.id
        ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
        GROUP BY o.id, e.title, e.event_date
        ORDER BY o.created_at DESC
        LIMIT $${params.length}`,
      params
    );

    const legacyConditions: string[] = [];
    const legacyParams: unknown[] = [];
    if (search) {
      legacyParams.push(`%${search}%`);
      legacyConditions.push(
        `(o.id ILIKE $1 OR o.buyer_email ILIKE $1 OR o.buyer_name ILIKE $1)`
      );
    }
    const legacyRows = eventId ? [] : await query<{
      id: string;
      buyer_name: string;
      buyer_email: string;
      total_cents: number;
      status: string;
      payment_ref: string | null;
      created_at: Date | string;
      event_title: string | null;
      ticket_count: string;
      checked_in_count: string;
    }>(
      `SELECT o.id, o.buyer_name, o.buyer_email, o.total_cents, o.status,
              o.payment_ref, o.created_at, MIN(t.opponent) AS event_title,
              COUNT(t.id)::text AS ticket_count,
              COUNT(t.id) FILTER (WHERE t.status = 'used')::text AS checked_in_count
         FROM orders o LEFT JOIN tickets t ON t.order_id = o.id
        ${legacyConditions.length ? `WHERE ${legacyConditions.join(' AND ')}` : ''}
        GROUP BY o.id ORDER BY o.created_at DESC LIMIT ${limit}`,
      legacyParams
    );

    const guestResults = rows.map((row) => ({
        orderNumber: row.order_number,
        eventId: row.event_id,
        eventTitle: row.display_event_title,
        eventDate: row.display_event_date ? formatEventDate(row.display_event_date) : null,
        buyerName: row.buyer_name,
        buyerEmail: row.buyer_email,
        buyerPhone: row.buyer_phone,
        paymentRef: row.payment_ref,
        total: centsToEuros(row.total_cents),
        status: row.status,
        createdAt:
          row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        ticketCount: Number(row.ticket_count),
        checkedInCount: Number(row.checked_in_count)
      }));
    const legacyResults = legacyRows.map((row) => ({
      orderNumber: row.id,
      eventId: null,
      eventTitle: row.event_title,
      eventDate: null,
      buyerName: row.buyer_name,
      buyerEmail: row.buyer_email,
      buyerPhone: null,
      paymentRef: row.payment_ref,
      total: centsToEuros(row.total_cents),
      status: row.status,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      ticketCount: Number(row.ticket_count),
      checkedInCount: Number(row.checked_in_count)
    }));
    res.json(
      [...guestResults, ...legacyResults]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
    );
  })
);

adminRouter.get(
  '/admin/orders/:orderNumber',
  asyncHandler(async (req, res) => {
    const order = await queryOne<GuestOrderRow>(
      'SELECT * FROM guest_orders WHERE UPPER(order_number) = $1',
      [req.params.orderNumber.trim().toUpperCase()]
    );
    if (!order) {
      const legacyOrder = await queryOne<{
        id: string;
        buyer_name: string;
        buyer_email: string;
        total_cents: number;
        status: string;
        payment_ref: string | null;
        created_at: Date | string;
      }>('SELECT * FROM orders WHERE UPPER(id) = $1', [req.params.orderNumber.trim().toUpperCase()]);
      if (!legacyOrder) throw notFound('Commande introuvable.');
      const tickets = await query<{
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
      }>('SELECT * FROM tickets WHERE order_id = $1 ORDER BY id', [legacyOrder.id]);
      const first = tickets[0];
      res.json({
        orderNumber: legacyOrder.id,
        status: legacyOrder.status,
        createdAt: legacyOrder.created_at instanceof Date ? legacyOrder.created_at.toISOString() : legacyOrder.created_at,
        total: centsToEuros(legacyOrder.total_cents),
        paymentRef: legacyOrder.payment_ref,
        event: first ? {
          id: first.match_id,
          title: first.competition.includes('Visites') ? first.opponent : `RC Lens – ${first.opponent}`,
          formattedDate: formatEventDate(`${first.match_date} ${first.kickoff}`),
          venue: 'Stade Bollaert-Delelis'
        } : null,
        buyer: { name: legacyOrder.buyer_name, email: legacyOrder.buyer_email, phone: null },
        items: tickets.map((ticket) => ({
          name: `${ticket.stand_name} · ${ticket.sector_name}`,
          quantity: 1,
          unitPrice: centsToEuros(ticket.price_cents)
        })),
        tickets: tickets.map((ticket) => ({
          code: ticket.ticket_number,
          typeName: `${ticket.stand_name} · ${ticket.sector_name}`,
          beneficiaryName: ticket.beneficiary_name,
          price: centsToEuros(ticket.price_cents),
          status: ticket.status,
          checkedInAt: null
        }))
      });
      return;
    }

    const [event, items, tickets] = await Promise.all([
      order.event_id
        ? queryOne<EventRow>('SELECT * FROM events WHERE id = $1', [order.event_id])
        : Promise.resolve(undefined),
      query<{ ticket_type_name: string; unit_price_cents: number; quantity: number }>(
        'SELECT ticket_type_name, unit_price_cents, quantity FROM guest_order_items WHERE order_id = $1',
        [order.id]
      ),
      query<GuestTicketRow>(
        'SELECT * FROM guest_tickets WHERE order_id = $1 ORDER BY created_at, ticket_code',
        [order.id]
      )
    ]);

    const historicalEvent = event ?? (
      order.event_title && order.event_date && order.event_venue
        ? {
            id: order.event_snapshot_id ?? 'deleted-event',
            title: order.event_title,
            event_date: order.event_date,
            venue: order.event_venue
          }
        : undefined
    );

    res.json({
      orderNumber: order.order_number,
      status: order.status,
      createdAt:
        order.created_at instanceof Date ? order.created_at.toISOString() : order.created_at,
      total: centsToEuros(order.total_cents),
      paymentRef: order.payment_ref,
      event: historicalEvent
        ? {
            id: historicalEvent.id,
            title: historicalEvent.title,
            formattedDate: formatEventDate(historicalEvent.event_date),
            venue: historicalEvent.venue
          }
        : null,
      buyer: {
        name: order.buyer_name,
        email: order.buyer_email,
        phone: order.buyer_phone
      },
      items: items.map((item) => ({
        name: item.ticket_type_name,
        quantity: item.quantity,
        unitPrice: centsToEuros(item.unit_price_cents)
      })),
      tickets: tickets.map((ticket) => ({
        code: ticket.ticket_code,
        typeName: ticket.ticket_type_name,
        beneficiaryName: ticket.beneficiary_name,
        price: centsToEuros(ticket.price_cents),
        status: ticket.status,
        checkedInAt:
          ticket.checked_in_at instanceof Date
            ? ticket.checked_in_at.toISOString()
            : ticket.checked_in_at
      }))
    });
  })
);

adminRouter.delete(
  '/admin/orders/:orderNumber',
  asyncHandler(async (req, res) => {
    const orderNumber = req.params.orderNumber.trim().toUpperCase();
    const guestOrder = await queryOne<{ id: string }>(
      'SELECT id FROM guest_orders WHERE UPPER(order_number) = $1',
      [orderNumber]
    );
    if (guestOrder) {
      await withTransaction(async (tx) => {
        await tx.execute('DELETE FROM guest_orders WHERE id = $1', [guestOrder.id]);
      });
      res.json({ success: true });
      return;
    }

    const legacyOrder = await queryOne<{ id: string }>(
      'SELECT id FROM orders WHERE UPPER(id) = $1',
      [orderNumber]
    );
    if (!legacyOrder) throw notFound('Commande introuvable.');
    await withTransaction(async (tx) => {
      await tx.execute('DELETE FROM orders WHERE id = $1', [legacyOrder.id]);
    });
    res.json({ success: true });
  })
);

/* ------------------------------------------------------------------ */
/* Contrôle d'accès (check-in)                                         */
/* ------------------------------------------------------------------ */

adminRouter.post(
  '/admin/tickets/:code/check-in',
  asyncHandler(async (req, res) => {
    const ticket = await queryOne<GuestTicketRow>(
      'SELECT * FROM guest_tickets WHERE UPPER(ticket_code) = $1',
      [req.params.code.trim().toUpperCase()]
    );
    if (!ticket) throw notFound('Billet introuvable.');
    if (ticket.status === 'pending_payment') {
      throw conflict('Le paiement de cette commande n’a pas encore été confirmé.', 'PAYMENT_PENDING');
    }
    if (ticket.status === 'cancelled') {
      throw conflict('Ce billet a été annulé.', 'TICKET_CANCELLED');
    }
    if (ticket.status === 'used') {
      throw conflict('Ce billet a déjà été scanné.', 'TICKET_ALREADY_USED');
    }

    const checkedInAt = isoNow();
    await execute(
      "UPDATE guest_tickets SET status = 'used', checked_in_at = $1 WHERE id = $2",
      [checkedInAt, ticket.id]
    );

    const event = ticket.event_id
      ? await queryOne<EventRow>('SELECT * FROM events WHERE id = $1', [ticket.event_id])
      : undefined;

    res.json({
      success: true,
      code: ticket.ticket_code,
      typeName: ticket.ticket_type_name,
      beneficiaryName: ticket.beneficiary_name,
      checkedInAt,
      event: event
        ? {
            id: event.id,
            title: event.title,
            formattedDate: formatEventDate(event.event_date)
          }
        : null
    });
  })
);

adminRouter.post(
  '/admin/tickets/:code/reset-check-in',
  asyncHandler(async (req, res) => {
    const ticket = await queryOne<GuestTicketRow>(
      'SELECT * FROM guest_tickets WHERE UPPER(ticket_code) = $1',
      [req.params.code.trim().toUpperCase()]
    );
    if (!ticket) throw notFound('Billet introuvable.');
    if (ticket.status !== 'used') {
      throw conflict('Seul un billet déjà scanné peut être réinitialisé.', 'TICKET_NOT_USED');
    }

    await execute(
      "UPDATE guest_tickets SET status = 'valid', checked_in_at = NULL WHERE id = $1",
      [ticket.id]
    );
    res.json({ success: true, code: ticket.ticket_code, status: 'valid' });
  })
);

/* ------------------------------------------------------------------ */
/* Tableau de bord                                                     */
/* ------------------------------------------------------------------ */

adminRouter.get(
  '/admin/stats',
  asyncHandler(async (_req, res) => {
    const [events, orders, tickets, revenue, checkins] = await Promise.all([
      queryOne<{ total: string; published: string }>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE status = 'published')::text AS published
           FROM events`
      ),
      queryOne<{ total: string }>(
        'SELECT ((SELECT COUNT(*) FROM guest_orders) + (SELECT COUNT(*) FROM orders))::text AS total'
      ),
      queryOne<{ total: string }>(
        'SELECT ((SELECT COUNT(*) FROM guest_tickets) + (SELECT COUNT(*) FROM tickets))::text AS total'
      ),
      queryOne<{ total: string }>(
        `SELECT ((SELECT COALESCE(SUM(total_cents), 0) FROM guest_orders WHERE status = 'paid') +
                 (SELECT COALESCE(SUM(total_cents), 0) FROM orders WHERE status = 'paid'))::text AS total`
      ),
      queryOne<{ total: string }>(
        "SELECT COUNT(*)::text AS total FROM guest_tickets WHERE status = 'used'"
      )
    ]);

    res.json({
      events: Number(events?.total ?? 0),
      publishedEvents: Number(events?.published ?? 0),
      orders: Number(orders?.total ?? 0),
      tickets: Number(tickets?.total ?? 0),
      checkedIn: Number(checkins?.total ?? 0),
      revenue: centsToEuros(Number(revenue?.total ?? 0))
    });
  })
);

/* ------------------------------------------------------------------ */
/* Recherche rapide d'un billet                                        */
/* ------------------------------------------------------------------ */

adminRouter.get(
  '/admin/tickets/:code',
  asyncHandler(async (req, res) => {
    const ticket = await queryOne<GuestTicketRow>(
      'SELECT * FROM guest_tickets WHERE UPPER(ticket_code) = $1',
      [req.params.code.trim().toUpperCase()]
    );
    if (!ticket) throw notFound('Billet introuvable.');

    const [order, event] = await Promise.all([
      queryOne<GuestOrderRow>('SELECT * FROM guest_orders WHERE id = $1', [ticket.order_id]),
      ticket.event_id
        ? queryOne<EventRow>('SELECT * FROM events WHERE id = $1', [ticket.event_id])
        : Promise.resolve(undefined)
    ]);

    res.json({
      code: ticket.ticket_code,
      typeName: ticket.ticket_type_name,
      beneficiaryName: ticket.beneficiary_name,
      status: ticket.status,
      checkedInAt:
        ticket.checked_in_at instanceof Date
          ? ticket.checked_in_at.toISOString()
          : ticket.checked_in_at,
      orderNumber: order?.order_number ?? null,
      buyerName: order?.buyer_name ?? null,
      buyerEmail: order?.buyer_email ? maskEmail(order.buyer_email) : null,
      buyerNameMasked: order?.buyer_name ? maskName(order.buyer_name) : null,
      event: event
        ? {
            id: event.id,
            title: event.title,
            formattedDate: formatEventDate(event.event_date)
          }
        : null
    });
  })
);
