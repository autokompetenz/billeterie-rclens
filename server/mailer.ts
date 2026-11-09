import nodemailer, { type Transporter } from 'nodemailer';
import { execute, newId } from './db.ts';

/**
 * Envoi des e-mails transactionnels via le SMTP Hostinger.
 *
 * Variables d'environnement attendues :
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS,
 *   MAIL_FROM, ADMIN_EMAIL, APP_URL
 *
 * Si le SMTP n'est pas configuré, les e-mails sont écrits dans les logs et
 * journalisés dans la table email_log (aucune commande n'est bloquée).
 */

let transporter: Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter | null {
  if (!isMailConfigured()) return null;
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT || 465);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!
    }
  });

  return transporter;
}

function mailFrom(): string {
  return (
    process.env.MAIL_FROM ||
    `Billetterie RC Lens <${process.env.SMTP_USER || 'billetterie@rclens.fr'}>`
  );
}

function adminEmail(): string | undefined {
  return process.env.ADMIN_EMAIL || process.env.SMTP_USER || undefined;
}

function appUrl(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDate(value: string | Date): string {
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

export interface MailTicket {
  code: string;
  typeName: string;
  beneficiaryName?: string | null;
  priceCents: number;
}

export interface MailOrder {
  orderNumber: string;
  eventTitle: string;
  eventDate: string | Date;
  venue: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  totalCents: number;
  createdAt: string | Date;
  payment: {
    accountHolder: string;
    iban: string;
    bic: string;
    method: string;
    reference: string;
    amount: number;
  };
  tickets: MailTicket[];
}

interface SendResult {
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}

async function logEmail(
  orderNumber: string,
  recipient: string,
  kind: string,
  subject: string,
  result: SendResult
): Promise<void> {
  try {
    await execute(
      `INSERT INTO email_log (id, order_id, recipient, kind, subject, status, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        newId('mail'),
        orderNumber,
        recipient,
        kind,
        subject,
        result.status,
        result.error ?? null
      ]
    );
  } catch (error) {
    console.error('[mail] Impossible de journaliser l’e-mail :', error);
  }
}

async function sendMail(
  to: string,
  subject: string,
  html: string,
  text: string,
  kind: string,
  orderNumber: string
): Promise<SendResult> {
  const client = getTransporter();

  if (!client) {
    console.log(
      `[mail] SMTP non configuré — e-mail « ${subject} » pour ${to} non envoyé.\n${text}`
    );
    const result: SendResult = { status: 'skipped' };
    await logEmail(orderNumber, to, kind, subject, result);
    return result;
  }

  try {
    await client.sendMail({
      from: mailFrom(),
      to,
      subject,
      html,
      text
    });
    await logEmail(orderNumber, to, kind, subject, { status: 'sent' });
    return { status: 'sent' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mail] Échec de l’envoi à ${to} :`, message);
    await logEmail(orderNumber, to, kind, subject, {
      status: 'failed',
      error: message
    });
    return { status: 'failed', error: message };
  }
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

function ticketRowsHtml(order: MailOrder): string {
  return order.tickets
    .map(
      (ticket) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace">${escapeHtml(
          ticket.code
        )}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(
          ticket.typeName
        )}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(
          ticket.beneficiaryName || order.buyerName
        )}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${euros(
          ticket.priceCents
        )}</td>
      </tr>`
    )
    .join('');
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f6f2e8;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
    <div style="max-width:640px;margin:0 auto;padding:24px">
      <div style="background:#C8102E;color:#FED100;padding:20px 24px;border-radius:12px 12px 0 0">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold">RC Lens · Billetterie</div>
        <h1 style="margin:6px 0 0;font-size:22px;color:#fff">${escapeHtml(title)}</h1>
      </div>
      <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px">
        ${body}
      </div>
      <p style="font-size:12px;color:#6b7280;text-align:center;margin-top:16px">
        Billetterie officielle RC Lens — Stade Bollaert-Delelis, Lens
      </p>
    </div>
  </body>
</html>`;
}

export async function sendOrderEmails(order: MailOrder): Promise<void> {
  const dateLabel = formatDate(order.eventDate);
  const verifyUrl = `${appUrl()}/verifier?commande=${encodeURIComponent(
    order.orderNumber
  )}`;

  const clientSubject = `Votre commande ${order.orderNumber} — ${order.eventTitle}`;
  const clientText = [
    `Bonjour ${order.buyerName},`,
    '',
    `Merci pour votre commande sur la billetterie officielle du RC Lens.`,
    '',
    `Numéro de bon de commande : ${order.orderNumber}`,
    `Événement : ${order.eventTitle}`,
    `Date : ${dateLabel}`,
    `Lieu : ${order.venue}`,
    '',
    'Vos billets :',
    ...order.tickets.map(
      (t) =>
        `- ${t.code} · ${t.typeName} · ${t.beneficiaryName || order.buyerName} · ${euros(
          t.priceCents
        )}`
    ),
    '',
    `Total : ${euros(order.totalCents)}`,
    'Statut : virement en attente — les billets ne sont pas encore activés.',
    '',
    'Paiement par virement instantané SEPA :',
    `Titulaire : ${order.payment.accountHolder}`,
    `IBAN : ${order.payment.iban}`,
    `BIC : ${order.payment.bic}`,
    `Montant exact : ${euros(order.totalCents)}`,
    `Motif obligatoire : ${order.payment.reference}`,
    'Les billets seront validés après réception du virement.',
    '',
    `Vérifiez votre commande à tout moment : ${verifyUrl}`,
    '',
    'Conservez ce numéro de commande : il vous permet de retrouver vos billets.',
    '',
    'Allez Lens !'
  ].join('\n');

  const clientHtml = layout(
    'Confirmation de commande',
    `<p>Bonjour <strong>${escapeHtml(order.buyerName)}</strong>,</p>
     <p>Votre commande est enregistrée. Les billets seront activés après réception du virement.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#faf7ef;border-radius:8px">
       <tr><td style="padding:8px 12px;color:#6b7280">Bon de commande</td><td style="padding:8px 12px;font-weight:bold;font-family:monospace">${escapeHtml(
         order.orderNumber
       )}</td></tr>
       <tr><td style="padding:8px 12px;color:#6b7280">Événement</td><td style="padding:8px 12px;font-weight:bold">${escapeHtml(
         order.eventTitle
       )}</td></tr>
       <tr><td style="padding:8px 12px;color:#6b7280">Date</td><td style="padding:8px 12px">${escapeHtml(
         dateLabel
       )}</td></tr>
       <tr><td style="padding:8px 12px;color:#6b7280">Lieu</td><td style="padding:8px 12px">${escapeHtml(
         order.venue
       )}</td></tr>
     </table>
     <table style="width:100%;border-collapse:collapse;margin:16px 0">
       <thead><tr style="background:#FED100;color:#1f2937;text-align:left">
         <th style="padding:8px 12px">Code billet</th>
         <th style="padding:8px 12px">Catégorie</th>
         <th style="padding:8px 12px">Bénéficiaire</th>
         <th style="padding:8px 12px;text-align:right">Prix</th>
       </tr></thead>
       <tbody>${ticketRowsHtml(order)}</tbody>
     </table>
     <p style="font-size:18px;font-weight:bold;text-align:right">Total : ${euros(
       order.totalCents
     )}</p>
     <div style="margin-top:20px;padding:16px;background:#fff8db;border:1px solid #f2d675;border-radius:8px">
       <h2 style="margin:0 0 8px;font-size:16px">Paiement par virement instantané SEPA</h2>
       <p style="margin:4px 0">Titulaire : <strong>${escapeHtml(order.payment.accountHolder)}</strong></p>
       <p style="margin:4px 0">IBAN : <strong style="font-family:monospace">${escapeHtml(order.payment.iban)}</strong></p>
       <p style="margin:4px 0">BIC : <strong style="font-family:monospace">${escapeHtml(order.payment.bic)}</strong></p>
       <p style="margin:4px 0">Montant exact : <strong>${euros(order.totalCents)}</strong></p>
       <p style="margin:4px 0">Motif obligatoire : <strong style="font-family:monospace">${escapeHtml(order.payment.reference)}</strong></p>
       <p style="margin:8px 0 0;font-size:12px">Les billets seront validés après réception du virement.</p>
     </div>
     <p style="margin-top:24px">
       <a href="${verifyUrl}" style="display:inline-block;background:#C8102E;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Vérifier ma commande</a>
     </p>
     <p style="font-size:13px;color:#6b7280">Conservez votre numéro de bon de commande : il vous permet de retrouver vos billets et de les faire vérifier à l'entrée.</p>`
  );

  await sendMail(
    order.buyerEmail,
    clientSubject,
    clientHtml,
    clientText,
    'client_order',
    order.orderNumber
  );

  const admin = adminEmail();
  if (!admin) return;

  const adminSubject = `Nouvelle commande ${order.orderNumber} — ${order.eventTitle}`;
  const adminText = [
    `Nouvelle commande sur la billetterie.`,
    '',
    `Bon de commande : ${order.orderNumber}`,
    `Événement : ${order.eventTitle}`,
    `Date : ${dateLabel}`,
    `Client : ${order.buyerName} <${order.buyerEmail}>${
      order.buyerPhone ? ` · ${order.buyerPhone}` : ''
    }`,
    `Total : ${euros(order.totalCents)}`,
    `Statut : en attente du virement (${order.payment.reference})`,
    '',
    'Billets :',
    ...order.tickets.map(
      (t) =>
        `- ${t.code} · ${t.typeName} · ${t.beneficiaryName || order.buyerName} · ${euros(
          t.priceCents
        )}`
    )
  ].join('\n');

  const adminHtml = layout(
    'Nouvelle commande',
    `<p>Une nouvelle commande vient d'être enregistrée.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#faf7ef;border-radius:8px">
       <tr><td style="padding:8px 12px;color:#6b7280">Bon de commande</td><td style="padding:8px 12px;font-weight:bold;font-family:monospace">${escapeHtml(
         order.orderNumber
       )}</td></tr>
       <tr><td style="padding:8px 12px;color:#6b7280">Événement</td><td style="padding:8px 12px;font-weight:bold">${escapeHtml(
         order.eventTitle
       )}</td></tr>
       <tr><td style="padding:8px 12px;color:#6b7280">Client</td><td style="padding:8px 12px">${escapeHtml(
         order.buyerName
       )} &lt;${escapeHtml(order.buyerEmail)}&gt;${
         order.buyerPhone ? ` · ${escapeHtml(order.buyerPhone)}` : ''
       }</td></tr>
       <tr><td style="padding:8px 12px;color:#6b7280">Total</td><td style="padding:8px 12px;font-weight:bold">${euros(
         order.totalCents
       )}</td></tr>
     </table>
     <table style="width:100%;border-collapse:collapse;margin:16px 0">
       <thead><tr style="background:#FED100;color:#1f2937;text-align:left">
         <th style="padding:8px 12px">Code billet</th>
         <th style="padding:8px 12px">Catégorie</th>
         <th style="padding:8px 12px">Bénéficiaire</th>
         <th style="padding:8px 12px;text-align:right">Prix</th>
       </tr></thead>
       <tbody>${ticketRowsHtml(order)}</tbody>
     </table>`
  );

  await sendMail(admin, adminSubject, adminHtml, adminText, 'admin_order', order.orderNumber);
}
