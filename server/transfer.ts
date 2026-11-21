import { Router } from 'express';
import { centsToEuros, execute, isoNow, queryOne } from './db.ts';
import { asyncHandler, badRequest, notFound, requireString } from './http.ts';
import { getBankAccountSettings, hashTransferToken } from './payment.ts';
import { maskName } from './events.ts';

/**
 * Déclaration de virement par le client.
 *
 * Le lien contient un jeton aléatoire envoyé par e-mail au moment de la
 * commande. Seule l'empreinte SHA-256 du jeton est stockée en base : toute
 * personne ayant reçu l'e-mail peut déclarer le virement, mais personne ne
 * peut deviner le jeton d'une autre commande.
 */

export const transferRouter = Router();

interface DeclarationOrder {
  orderNumber: string;
  status: string;
  totalCents: number;
  paymentRef: string | null;
  declaredAt: string | null;
  buyerName: string;
  eventTitle: string | null;
}

function isoOrNull(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

async function findOrderByToken(token: string): Promise<DeclarationOrder | undefined> {
  const hash = hashTransferToken(token);

  const guest = await queryOne<{
    order_number: string;
    status: string;
    total_cents: number;
    payment_ref: string | null;
    transfer_declared_at: string | Date | null;
    buyer_name: string;
    event_title: string | null;
  }>(
    `SELECT order_number, status, total_cents, payment_ref,
            transfer_declared_at, buyer_name, event_title
       FROM guest_orders WHERE transfer_token_hash = $1`,
    [hash]
  );
  if (guest) {
    return {
      orderNumber: guest.order_number,
      status: guest.status,
      totalCents: guest.total_cents,
      paymentRef: guest.payment_ref,
      declaredAt: isoOrNull(guest.transfer_declared_at),
      buyerName: maskName(guest.buyer_name),
      eventTitle: guest.event_title
    };
  }

  const legacy = await queryOne<{
    id: string;
    status: string;
    total_cents: number;
    payment_ref: string | null;
    transfer_declared_at: string | Date | null;
    buyer_name: string;
    opponent: string | null;
  }>(
    `SELECT o.id, o.status, o.total_cents, o.payment_ref,
            o.transfer_declared_at, o.buyer_name, MIN(t.opponent) AS opponent
       FROM orders o LEFT JOIN tickets t ON t.order_id = o.id
      WHERE o.transfer_token_hash = $1
      GROUP BY o.id`,
    [hash]
  );
  if (!legacy) return undefined;
  return {
    orderNumber: legacy.id,
    status: legacy.status,
    totalCents: legacy.total_cents,
    paymentRef: legacy.payment_ref,
    declaredAt: isoOrNull(legacy.transfer_declared_at),
    buyerName: maskName(legacy.buyer_name),
    eventTitle: legacy.opponent ? `RC Lens – ${legacy.opponent}` : null
  };
}

function tokenFrom(body: unknown): string {
  const token = requireString((body as { token?: unknown } | null)?.token, 'jeton', {
    min: 20,
    max: 80
  });
  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    throw badRequest('Jeton de déclaration invalide.', 'INVALID_TOKEN');
  }
  return token;
}

async function requireOrder(token: string): Promise<DeclarationOrder> {
  const order = await findOrderByToken(token);
  if (!order) {
    throw notFound('Ce lien de déclaration est invalide ou n’existe plus.');
  }
  return order;
}

async function withBankDetails(order: DeclarationOrder) {
  const bank = await getBankAccountSettings();
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    total: centsToEuros(order.totalCents),
    paymentReference: order.paymentRef,
    declaredAt: order.declaredAt,
    buyerName: order.buyerName,
    eventTitle: order.eventTitle,
    bankAccount: bank
  };
}

/** Informations minimales permettant au client de vérifier avant de déclarer. */
transferRouter.post(
  '/transfer-declaration/info',
  asyncHandler(async (req, res) => {
    const order = await requireOrder(tokenFrom(req.body));
    res.json(await withBankDetails(order));
  })
);

/** Le client confirme avoir effectué le virement. Idempotent. */
transferRouter.post(
  '/transfer-declaration/declare',
  asyncHandler(async (req, res) => {
    const token = tokenFrom(req.body);
    const order = await requireOrder(token);

    if (order.status === 'paid') {
      res.json({
        orderNumber: order.orderNumber,
        status: order.status,
        declaredAt: order.declaredAt,
        alreadyDeclared: true,
        message: 'Cette commande est déjà réglée. Merci !'
      });
      return;
    }
    if (order.declaredAt) {
      res.json({
        orderNumber: order.orderNumber,
        status: order.status,
        declaredAt: order.declaredAt,
        alreadyDeclared: true,
        message: 'Votre déclaration a déjà été enregistrée.'
      });
      return;
    }

    const hash = hashTransferToken(token);
    const declaredAt = isoNow();
    const [guestChanges, legacyChanges] = await Promise.all([
      execute(
        `UPDATE guest_orders SET transfer_declared_at = $1
          WHERE transfer_token_hash = $2 AND transfer_declared_at IS NULL`,
        [declaredAt, hash]
      ),
      execute(
        `UPDATE orders SET transfer_declared_at = $1
          WHERE transfer_token_hash = $2 AND transfer_declared_at IS NULL`,
        [declaredAt, hash]
      )
    ]);

    if (guestChanges + legacyChanges === 0) {
      // Concurrence : un autre appel a déclaré le virement entre-temps.
      const refreshed = await requireOrder(token);
      res.json({
        orderNumber: refreshed.orderNumber,
        status: refreshed.status,
        declaredAt: refreshed.declaredAt,
        alreadyDeclared: true,
        message: 'Votre déclaration a déjà été enregistrée.'
      });
      return;
    }

    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      declaredAt,
      alreadyDeclared: false,
      message: 'Virement déclaré. Le service billetterie va vérifier sa réception.'
    });
  })
);
