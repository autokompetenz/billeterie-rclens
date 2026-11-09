import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { getRequestUser, optionalAuth, requireAuth } from './auth.ts';
import {
  addMinutes,
  centsToEuros,
  execute,
  isoNow,
  newId,
  query,
  queryOne,
  releaseExpiredHolds,
  withTransaction,
  type Queryable
} from './db.ts';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  optionalString,
  requireEmail,
  requireString,
  unauthorized,
  asyncHandler
} from './http.ts';
import { ADDON_PRICES, PROMO_CODES } from './seed-data.ts';
import { sendOrderEmails } from './mailer.ts';
import {
  createPaymentReference,
  getBankAccountSettings,
  paymentInstructions
} from './payment.ts';

export const commerceRouter = Router();

const MAX_ITEMS_PER_ORDER = 10;
const HOLD_MINUTES = 15;

function commerceOwnerId(req: import('express').Request): string {
  if (req.user) return req.user.id;
  const guestId = requireString(req.header('x-guest-id'), 'session invité', {
    min: 36,
    max: 36
  });
  if (!/^[0-9a-f-]{36}$/i.test(guestId)) {
    throw badRequest('Session invité invalide. Rechargez la page.', 'INVALID_GUEST_SESSION');
  }
  return `guest:${guestId}`;
}

type Tariff = 'full' | 'u16' | 'student';

interface SeatRow {
  id: string;
  match_id: string;
  sector_id: string;
  stand_id: string;
  row_num: number;
  seat_num: number;
  price_cents: number;
  status: string;
  held_by: string | null;
}

interface SeatContextRow extends SeatRow {
  sector_name: string;
  gate: string;
  stand_name: string;
  opponent: string;
  formatted_date: string;
  kickoff: string;
  competition: string;
  round: string;
}

interface ListingRow {
  id: string;
  ticket_id: string;
  seller_id: string;
  match_id: string;
  match_opponent: string;
  match_date: string;
  stand_name: string;
  sector_name: string;
  row_num: number;
  seat_num: number;
  original_price_cents: number;
  resale_price_cents: number;
  seller_initials: string;
  verified: boolean;
  status: string;
  created_at: string;
}

interface TicketRow {
  id: string;
  order_id: string;
  user_id: string | null;
  ticket_number: string;
  match_id: string;
  opponent: string;
  match_date: string;
  kickoff: string;
  competition: string;
  stand_name: string;
  sector_name: string;
  row_num: number;
  seat_num: number;
  gate: string;
  beneficiary_name: string;
  tariff: string;
  price_cents: number;
  qr_code_data: string;
  barcode: string;
  status: string;
}

interface TourRow {
  id: string;
  title: string;
  price_cents: number;
  dates_json: string;
}

function mapTicket(row: TicketRow) {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    matchId: row.match_id,
    opponent: row.opponent,
    date: row.match_date,
    time: row.kickoff,
    competition: row.competition,
    standName: row.stand_name,
    sectorName: row.sector_name,
    row: row.row_num,
    seatNumber: row.seat_num,
    gate: row.gate,
    beneficiaryName: row.beneficiary_name,
    tariff: row.tariff,
    price: centsToEuros(row.price_cents),
    qrCodeData: row.qr_code_data,
    barcode: row.barcode,
    status: row.status
  };
}

function mapListing(row: ListingRow) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    matchId: row.match_id,
    matchOpponent: row.match_opponent,
    matchDate: row.match_date,
    standName: row.stand_name,
    sectorName: row.sector_name,
    row: row.row_num,
    seatNumber: row.seat_num,
    originalPrice: centsToEuros(row.original_price_cents),
    resalePrice: centsToEuros(row.resale_price_cents),
    sellerInitials: row.seller_initials,
    verified: Boolean(row.verified),
    createdAt: row.created_at
  };
}

function normalizeTariff(value: unknown): Tariff {
  if (value === 'u16' || value === 'student' || value === 'full') return value;
  return 'full';
}

function applyTariff(baseCents: number, tariff: Tariff): number {
  if (tariff === 'u16') return Math.round(baseCents * 0.75);
  if (tariff === 'student') return Math.round(baseCents * 0.85);
  return baseCents;
}

function tariffLabel(tariff: Tariff): string {
  if (tariff === 'u16') return '-16 ans (-25%)';
  if (tariff === 'student') return 'Étudiant / PMR';
  return 'Plein Tarif';
}

function beneficiaryName(item: any, fallback: string): string {
  const first = optionalString(item?.beneficiary?.firstName, 60) ?? '';
  const last = optionalString(item?.beneficiary?.lastName, 60) ?? '';
  const full = `${first} ${last}`.trim();
  return full || fallback;
}

function normalizeAddons(raw: any) {
  const parkingPass =
    raw?.parkingPass === 'P1_Bollaert' || raw?.parkingPass === 'P2_Delacourt'
      ? raw.parkingPass
      : 'none';

  return {
    insurance: Boolean(raw?.insurance),
    scarf: Boolean(raw?.scarf),
    parkingPass
  };
}

async function releaseUserHolds(tx: Queryable, userId: string): Promise<void> {
  await tx.execute(
    "UPDATE seats SET status = 'available', held_by = NULL, held_until = NULL WHERE status = 'held' AND held_by = $1",
    [userId]
  );
  await tx.execute('DELETE FROM holds WHERE user_id = $1', [userId]);
}

/* ------------------------------------------------------------------ */
/* Pré-réservations (holds)                                            */
/* ------------------------------------------------------------------ */

commerceRouter.post(
  '/holds',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const ownerId = commerceOwnerId(req);
    const rawSeatIds = req.body?.seatIds;

    if (!Array.isArray(rawSeatIds) || rawSeatIds.length === 0) {
      throw badRequest('Sélectionnez au moins une place.', 'VALIDATION_ERROR');
    }
    if (rawSeatIds.length > MAX_ITEMS_PER_ORDER) {
      throw badRequest(
        `Maximum ${MAX_ITEMS_PER_ORDER} places par commande.`,
        'TOO_MANY_SEATS'
      );
    }

    const seatIds = [
      ...new Set(rawSeatIds.filter((id): id is string => typeof id === 'string'))
    ];
    if (seatIds.length === 0) {
      throw badRequest('Sélection de places invalide.', 'VALIDATION_ERROR');
    }

    const result = await withTransaction(async (tx) => {
      await releaseExpiredHolds(tx);
      await releaseUserHolds(tx, ownerId);

      const seats = await tx.query<SeatRow>(
        'SELECT * FROM seats WHERE id = ANY($1::text[]) FOR UPDATE',
        [seatIds]
      );

      if (seats.length !== seatIds.length) {
        throw notFound('Une ou plusieurs places sont introuvables.');
      }

      const matchIds = new Set(seats.map((seat) => seat.match_id));
      if (matchIds.size > 1) {
        throw badRequest(
          'Toutes les places doivent concerner le même match.',
          'MIXED_MATCHES'
        );
      }

      const unavailable = seats.filter((seat) => seat.status !== 'available');
      if (unavailable.length > 0) {
        throw conflict(
          "Certaines places viennent d'être réservées par un autre supporter.",
          'SEAT_UNAVAILABLE'
        );
      }

      const holdId = newId('hold');
      const expiresAt = addMinutes(HOLD_MINUTES);

      await tx.execute(
        'INSERT INTO holds (id, user_id, created_at, expires_at) VALUES ($1,$2,$3,$4)',
        [holdId, ownerId, isoNow(), expiresAt]
      );

      for (const seat of seats) {
        await tx.execute(
          'INSERT INTO hold_seats (hold_id, seat_id) VALUES ($1,$2)',
          [holdId, seat.id]
        );
        const changes = await tx.execute(
          "UPDATE seats SET status = 'held', held_by = $1, held_until = $2 WHERE id = $3 AND status = 'available'",
          [ownerId, expiresAt, seat.id]
        );
        if (changes !== 1) {
          throw conflict(
            "Certaines places viennent d'être réservées par un autre supporter.",
            'SEAT_UNAVAILABLE'
          );
        }
      }

      return { holdId, expiresAt };
    });

    res.status(201).json(result);
  })
);

commerceRouter.delete(
  '/holds/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const ownerId = commerceOwnerId(req);

    await withTransaction(async (tx) => {
      const hold = await tx.queryOne<{ id: string; user_id: string }>(
        'SELECT id, user_id FROM holds WHERE id = $1',
        [req.params.id]
      );

      if (!hold) return;
      if (hold.user_id !== ownerId) throw forbidden();

      await tx.execute(
        "UPDATE seats SET status = 'available', held_by = NULL, held_until = NULL WHERE status = 'held' AND held_by = $1",
        [ownerId]
      );
      await tx.execute('DELETE FROM holds WHERE id = $1', [hold.id]);
    });

    res.json({ success: true });
  })
);

/* ------------------------------------------------------------------ */
/* Commandes                                                           */
/* ------------------------------------------------------------------ */

interface TicketDraft {
  matchId: string;
  opponent: string;
  matchDate: string;
  kickoff: string;
  competition: string;
  standName: string;
  sectorName: string;
  row: number;
  seat: number;
  gate: string;
  beneficiaryName: string;
  tariff: string;
  priceCents: number;
}

commerceRouter.post(
  '/orders',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const ownerId = commerceOwnerId(req);
    const userId = req.user?.id ?? null;
    const body = req.body ?? {};
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      throw badRequest('Votre panier est vide.', 'EMPTY_CART');
    }
    if (items.length > MAX_ITEMS_PER_ORDER) {
      throw badRequest(
        `Maximum ${MAX_ITEMS_PER_ORDER} places par commande.`,
        'TOO_MANY_ITEMS'
      );
    }

    const cardholder = requireString(
      body?.payment?.cardholder,
      'titulaire de la carte',
      { min: 2, max: 120 }
    );
    const buyerEmail = requireEmail(body?.payment?.email);
    const buyerPhone = optionalString(body?.payment?.phone, 40);
    const bankAccount = await getBankAccountSettings();
    const paymentReference = await createPaymentReference();
    const promoInput = optionalString(body?.promoCode, 32);
    const promoCode = promoInput ? promoInput.toUpperCase() : undefined;

    let discountRule: { type: 'percent' | 'fixed'; value: number } | undefined;
    if (promoCode) {
      discountRule = PROMO_CODES[promoCode];
      if (!discountRule) {
        throw badRequest('Code promotionnel invalide ou expiré.', 'INVALID_PROMO');
      }
    }

    const addons = normalizeAddons(body.addons);

    const result = await withTransaction(async (tx) => {
      await releaseExpiredHolds(tx);

      const drafts: TicketDraft[] = [];
      const soldSeatIds: string[] = [];
      let tourSeatCounter = 0;

      for (const item of items) {
        const type = item?.type;

        if (type === 'seat') {
          const seatId = requireString(item.seatId, 'place', { max: 160 });
          const seat = await tx.queryOne<SeatContextRow>(
            `SELECT st.*, sec.name AS sector_name, sec.gate,
                    sd.name AS stand_name, m.opponent, m.formatted_date,
                    m.kickoff, m.competition, m.round
               FROM seats st
               JOIN sectors sec ON sec.id = st.sector_id
               JOIN stands sd ON sd.match_id = st.match_id AND sd.stand_id = st.stand_id
               JOIN matches m ON m.id = st.match_id
              WHERE st.id = $1
              FOR UPDATE OF st`,
            [seatId]
          );

          if (!seat) throw notFound('Place introuvable.');

          const heldByUser = seat.status === 'held' && seat.held_by === ownerId;
          if (seat.status !== 'available' && !heldByUser) {
            throw conflict(
              `La place ${seat.sector_name} rang ${seat.row_num} siège ${seat.seat_num} n'est plus disponible.`,
              'SEAT_UNAVAILABLE'
            );
          }

          const tariff = normalizeTariff(item.tariff);
          drafts.push({
            matchId: seat.match_id,
            opponent: seat.opponent,
            matchDate: seat.formatted_date,
            kickoff: seat.kickoff,
            competition: `${seat.competition} - ${seat.round}`,
            standName: seat.stand_name,
            sectorName: seat.sector_name,
            row: seat.row_num,
            seat: seat.seat_num,
            gate: seat.gate,
            beneficiaryName: beneficiaryName(item, cardholder),
            tariff: tariffLabel(tariff),
            priceCents: applyTariff(seat.price_cents, tariff)
          });
          soldSeatIds.push(seat.id);
        } else if (type === 'resale') {
          const listingId = requireString(item.listingId, 'annonce', { max: 160 });
          const listing = await tx.queryOne<ListingRow>(
            'SELECT * FROM resale_listings WHERE id = $1 FOR UPDATE',
            [listingId]
          );

          if (!listing || listing.status !== 'active') {
            throw conflict(
              "Cette annonce de revente n'est plus disponible.",
              'LISTING_UNAVAILABLE'
            );
          }
          if (listing.seller_id === userId) {
            throw badRequest(
              'Vous ne pouvez pas acheter votre propre billet.',
              'OWN_LISTING'
            );
          }

          const original = await tx.queryOne<TicketRow>(
            'SELECT * FROM tickets WHERE id = $1',
            [listing.ticket_id]
          );

          if (!original) throw notFound('Billet d’origine introuvable.');

          drafts.push({
            matchId: listing.match_id,
            opponent: listing.match_opponent,
            matchDate: original.match_date,
            kickoff: original.kickoff,
            competition: original.competition,
            standName: listing.stand_name,
            sectorName: listing.sector_name,
            row: listing.row_num,
            seat: listing.seat_num,
            gate: original.gate,
            beneficiaryName: beneficiaryName(item, cardholder),
            tariff: 'Plein Tarif',
            priceCents: listing.resale_price_cents
          });

          await tx.execute("UPDATE resale_listings SET status = 'sold' WHERE id = $1", [
            listing.id
          ]);
          await tx.execute("UPDATE tickets SET status = 'used' WHERE id = $1", [
            original.id
          ]);
        } else if (type === 'tour') {
          const tourId = requireString(item.tourId, 'visite', { max: 120 });
          const tour = await tx.queryOne<TourRow>(
            'SELECT * FROM tours WHERE id = $1',
            [tourId]
          );

          if (!tour) throw notFound('Visite introuvable.');

          const dates = JSON.parse(tour.dates_json) as string[];
          const requestedDate = optionalString(item.date, 160);
          const date =
            requestedDate && dates.includes(requestedDate)
              ? requestedDate
              : (dates[0] ?? 'Date à confirmer');
          const [day, slot] = date.split(' - ');

          tourSeatCounter += 1;
          drafts.push({
            matchId: tour.id,
            opponent: tour.title,
            matchDate: day ?? date,
            kickoff: slot ?? '',
            competition: 'Visites & Expériences',
            standName: 'Espaces Officiels Bollaert',
            sectorName: tour.title,
            row: 1,
            seat: tourSeatCounter,
            gate: 'Accueil VIP / Hall Bollaert',
            beneficiaryName: beneficiaryName(item, cardholder),
            tariff: 'Plein Tarif',
            priceCents: tour.price_cents
          });
        } else {
          throw badRequest('Type de billet inconnu.', 'VALIDATION_ERROR');
        }
      }

      const ticketsTotalCents = drafts.reduce((sum, draft) => sum + draft.priceCents, 0);
      const addonsTotalCents =
        (addons.insurance ? ADDON_PRICES.insurancePerTicket * drafts.length : 0) +
        (addons.scarf ? ADDON_PRICES.scarf : 0) +
        (addons.parkingPass !== 'none' ? ADDON_PRICES.parking : 0);

      const grossCents = ticketsTotalCents + addonsTotalCents;
      const discountCents = discountRule
        ? discountRule.type === 'percent'
          ? Math.round((grossCents * discountRule.value) / 100)
          : Math.min(discountRule.value, grossCents)
        : 0;
      const totalCents = Math.max(0, grossCents - discountCents);

      let orderId = `CMD-RCL-${randomInt(100000, 999999)}`;
      while (await tx.queryOne('SELECT 1 FROM orders WHERE id = $1', [orderId])) {
        orderId = `CMD-RCL-${randomInt(100000, 999999)}`;
      }
      const createdAt = isoNow();

      await tx.execute(
        `INSERT INTO orders (
           id, user_id, buyer_name, buyer_email, tickets_total_cents,
           addons_total_cents, discount_cents, total_cents, promo_code,
           payment_ref, addons_json, status, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending_payment',$12)`,
        [
          orderId,
          userId,
          cardholder,
          buyerEmail,
          ticketsTotalCents,
          addonsTotalCents,
          discountCents,
          totalCents,
          promoCode ?? null,
          paymentReference,
          JSON.stringify(addons),
          createdAt
        ]
      );

      const baseUrl = process.env.APP_URL || 'https://billetterie.rclens.fr';
      const createdTickets: TicketRow[] = [];

      for (let index = 0; index < drafts.length; index += 1) {
        const draft = drafts[index];
        const ticketNumber = `RCL-${new Date().getFullYear()}-${randomInt(
          100000,
          999999
        )}${index}`;
        const barcode = `2600${randomInt(0, 1_000_000_000_000)
          .toString()
          .padStart(12, '0')}`;

        const row: TicketRow = {
          id: newId('tkt'),
          order_id: orderId,
          user_id: userId,
          ticket_number: ticketNumber,
          match_id: draft.matchId,
          opponent: draft.opponent,
          match_date: draft.matchDate,
          kickoff: draft.kickoff,
          competition: draft.competition,
          stand_name: draft.standName,
          sector_name: draft.sectorName,
          row_num: draft.row,
          seat_num: draft.seat,
          gate: draft.gate,
          beneficiary_name: draft.beneficiaryName,
          tariff: draft.tariff,
          price_cents: draft.priceCents,
          qr_code_data: `${baseUrl}/verify/${ticketNumber}`,
          barcode,
          status: 'pending_payment'
        };

        await tx.execute(
          `INSERT INTO tickets (
             id, order_id, user_id, ticket_number, match_id, opponent,
             match_date, kickoff, competition, stand_name, sector_name, row_num,
             seat_num, gate, beneficiary_name, tariff, price_cents, qr_code_data,
             barcode, status
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'pending_payment')`,
          [
            row.id,
            row.order_id,
            row.user_id,
            row.ticket_number,
            row.match_id,
            row.opponent,
            row.match_date,
            row.kickoff,
            row.competition,
            row.stand_name,
            row.sector_name,
            row.row_num,
            row.seat_num,
            row.gate,
            row.beneficiary_name,
            row.tariff,
            row.price_cents,
            row.qr_code_data,
            row.barcode
          ]
        );

        createdTickets.push(row);
      }

      for (const seatId of soldSeatIds) {
        const changes = await tx.execute(
          "UPDATE seats SET status = 'occupied', held_by = NULL, held_until = NULL WHERE id = $1 AND (status = 'available' OR (status = 'held' AND held_by = $2))",
          [seatId, ownerId]
        );
        if (changes !== 1) {
          throw conflict(
            'Une place sélectionnée a été perdue. Veuillez recommencer.',
            'SEAT_UNAVAILABLE'
          );
        }
      }

      await tx.execute(
        "UPDATE seats SET status = 'available', held_by = NULL, held_until = NULL WHERE status = 'held' AND held_by = $1",
        [ownerId]
      );
      await tx.execute('DELETE FROM holds WHERE user_id = $1', [ownerId]);

      return {
        success: true,
        orderId,
        tickets: createdTickets.map(mapTicket),
        total: centsToEuros(totalCents),
        discount: centsToEuros(discountCents),
        addonsTotal: centsToEuros(addonsTotalCents)
      };
    });

    const firstTicket = result.tickets[0];
    if (firstTicket) {
      const transfer = paymentInstructions(
        bankAccount,
        paymentReference,
        Math.round(result.total * 100)
      );
      await sendOrderEmails({
        orderNumber: result.orderId,
        eventTitle: firstTicket.competition.includes('Visites')
          ? firstTicket.opponent
          : `RC Lens – ${firstTicket.opponent}`,
        eventDate: `${firstTicket.date} ${firstTicket.time}`.trim(),
        venue: 'Stade Bollaert-Delelis',
        buyerName: cardholder,
        buyerEmail,
        buyerPhone,
        totalCents: Math.round(result.total * 100),
        createdAt: new Date().toISOString(),
        payment: transfer,
        tickets: result.tickets.map((ticket) => ({
          code: ticket.ticketNumber,
          typeName: `${ticket.standName} · ${ticket.sectorName}`,
          beneficiaryName: ticket.beneficiaryName,
          priceCents: Math.round(ticket.price * 100)
        }))
      });
    }
    res.status(201).json({
      ...result,
      status: 'pending_payment',
      payment: paymentInstructions(bankAccount, paymentReference, Math.round(result.total * 100))
    });
  })
);

/* ------------------------------------------------------------------ */
/* Billets de l'utilisateur                                            */
/* ------------------------------------------------------------------ */

commerceRouter.get(
  '/tickets/my',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getRequestUser(req);
    await releaseExpiredHolds();
    const rows = await query<TicketRow>(
      "SELECT * FROM tickets WHERE user_id = $1 AND status != 'used' ORDER BY match_date, row_num, seat_num",
      [user.id]
    );
    res.json(rows.map(mapTicket));
  })
);

commerceRouter.post(
  '/tickets/:id/transfer',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getRequestUser(req);
    const recipient = requireString(req.body?.recipientName, 'bénéficiaire', {
      min: 2,
      max: 120
    });

    const ticket = await queryOne<TicketRow>('SELECT * FROM tickets WHERE id = $1', [
      req.params.id
    ]);

    if (!ticket) throw notFound('Billet introuvable.');
    if (ticket.user_id !== user.id) throw forbidden();
    if (ticket.status !== 'valid') {
      throw conflict(
        "Ce billet n'est pas cessible dans son état actuel.",
        'TICKET_NOT_TRANSFERABLE'
      );
    }

    await execute(
      "UPDATE tickets SET beneficiary_name = $1, status = 'transferred' WHERE id = $2",
      [recipient, ticket.id]
    );

    const updated = await queryOne<TicketRow>('SELECT * FROM tickets WHERE id = $1', [
      ticket.id
    ]);

    res.json(mapTicket(updated!));
  })
);

/* ------------------------------------------------------------------ */
/* Bourse d'échange officielle                                         */
/* ------------------------------------------------------------------ */

commerceRouter.get(
  '/resale',
  asyncHandler(async (_req, res) => {
    const rows = await query<ListingRow>(
      "SELECT * FROM resale_listings WHERE status = 'active' ORDER BY created_at DESC"
    );
    res.json(rows.map(mapListing));
  })
);

commerceRouter.post(
  '/resale/list',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getRequestUser(req);
    const ticketId = requireString(req.body?.ticketId, 'billet', { max: 160 });

    const result = await withTransaction(async (tx) => {
      const ticket = await tx.queryOne<TicketRow>(
        'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
        [ticketId]
      );

      if (!ticket) throw notFound('Billet introuvable.');
      if (ticket.user_id !== user.id) throw forbidden();
      if (ticket.status !== 'valid') {
        throw conflict(
          "Seul un billet actif peut être mis en vente.",
          'TICKET_NOT_LISTABLE'
        );
      }

      const existing = await tx.queryOne(
        "SELECT id FROM resale_listings WHERE ticket_id = $1 AND status = 'active'",
        [ticket.id]
      );
      if (existing) {
        throw conflict('Ce billet est déjà en vente.', 'ALREADY_LISTED');
      }

      const listingId = newId('resale');
      const initials = ticket.beneficiary_name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => `${part.charAt(0).toUpperCase()}.`)
        .join(' ');

      await tx.execute(
        `INSERT INTO resale_listings (
           id, ticket_id, seller_id, match_id, match_opponent, match_date,
           stand_name, sector_name, row_num, seat_num, original_price_cents,
           resale_price_cents, seller_initials, verified, status, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE,'active',$14)`,
        [
          listingId,
          ticket.id,
          user.id,
          ticket.match_id,
          ticket.opponent,
          `${ticket.match_date} ${ticket.kickoff}`.trim(),
          ticket.stand_name,
          ticket.sector_name,
          ticket.row_num,
          ticket.seat_num,
          ticket.price_cents,
          ticket.price_cents,
          initials || 'RCL',
          isoNow()
        ]
      );

      await tx.execute("UPDATE tickets SET status = 'listed_resale' WHERE id = $1", [
        ticket.id
      ]);

      return tx.queryOne<ListingRow>('SELECT * FROM resale_listings WHERE id = $1', [
        listingId
      ]);
    });

    res.status(201).json(mapListing(result!));
  })
);

commerceRouter.delete(
  '/resale/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getRequestUser(req);

    await withTransaction(async (tx) => {
      const listing = await tx.queryOne<ListingRow>(
        'SELECT * FROM resale_listings WHERE id = $1 FOR UPDATE',
        [req.params.id]
      );

      if (!listing) throw notFound('Annonce introuvable.');
      if (listing.seller_id !== user.id) throw forbidden();
      if (listing.status !== 'active') {
        throw conflict("Cette annonce n'est plus active.", 'LISTING_NOT_ACTIVE');
      }

      await tx.execute("UPDATE resale_listings SET status = 'cancelled' WHERE id = $1", [
        listing.id
      ]);
      await tx.execute("UPDATE tickets SET status = 'valid' WHERE id = $1", [
        listing.ticket_id
      ]);
    });

    res.json({ success: true });
  })
);

/* ------------------------------------------------------------------ */
/* Liste d'attente abonnements                                         */
/* ------------------------------------------------------------------ */

commerceRouter.post(
  '/season/waitlist',
  asyncHandler(async (req, res) => {
    const email = requireEmail(req.body?.email);
    const preferredStand =
      optionalString(req.body?.preferredStand, 40) ?? 'MAREK_XERCES';
    const allowed = ['MAREK_XERCES', 'LEPAGNOT', 'DELACOURT', 'TRANNIN'];
    if (!allowed.includes(preferredStand)) {
      throw badRequest('Tribune invalide.', 'VALIDATION_ERROR');
    }

    const existing = await queryOne('SELECT id FROM waitlist WHERE LOWER(email) = $1', [
      email
    ]);

    if (!existing) {
      await execute(
        'INSERT INTO waitlist (id, email, preferred_stand, created_at) VALUES ($1,$2,$3,$4)',
        [newId('wait'), email, preferredStand, isoNow()]
      );
    }

    const count = await queryOne<{ total: string }>(
      'SELECT COUNT(*)::text AS total FROM waitlist'
    );

    res.status(201).json({
      success: true,
      alreadyRegistered: Boolean(existing),
      position: Number(count?.total ?? 0)
    });
  })
);

export function assertAuthenticated(userId: string | undefined): string {
  if (!userId) throw unauthorized();
  return userId;
}
