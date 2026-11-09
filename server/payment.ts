import { randomBytes } from 'node:crypto';
import { badRequest, notFound, requireString } from './http.ts';
import { queryOne } from './db.ts';

export interface BankTransferDetails {
  accountHolder: string;
  iban: string;
  bic: string;
  method: 'Virement instantané SEPA';
  reference: string;
  amount: number;
}

export interface BankAccountSettings {
  accountHolder: string;
  iban: string;
  bic: string;
}

export function validateBankAccount(input: unknown): BankAccountSettings {
  const value = input as Record<string, unknown> | null;
  const accountHolder = requireString(value?.accountHolder, 'titulaire du compte', {
    min: 2,
    max: 120
  });
  const iban = requireString(value?.iban, 'IBAN', { min: 15, max: 34 })
    .replace(/\s+/g, '')
    .toUpperCase();
  const bic = requireString(value?.bic, 'BIC', { min: 8, max: 11 })
    .replace(/\s+/g, '')
    .toUpperCase();

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) {
    throw badRequest('Format IBAN invalide.', 'INVALID_IBAN');
  }
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/.test(bic)) {
    throw badRequest('Format BIC invalide.', 'INVALID_BIC');
  }

  return { accountHolder, iban, bic };
}

export async function getBankAccountSettings(): Promise<BankAccountSettings> {
  const row = await queryOne<{
    account_holder: string;
    iban: string;
    bic: string;
  }>(
    "SELECT account_holder, iban, bic FROM bank_transfer_settings WHERE id = 'default'"
  );
  if (!row) {
    throw notFound(
      "Les coordonnées bancaires ne sont pas encore configurées par l'administration."
    );
  }
  return { accountHolder: row.account_holder, iban: row.iban, bic: row.bic };
}

export async function createPaymentReference(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const reference = `RCL-${new Date().getFullYear()}-${randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;
    const [legacy, events] = await Promise.all([
      queryOne('SELECT 1 FROM orders WHERE payment_ref = $1', [reference]),
      queryOne('SELECT 1 FROM guest_orders WHERE payment_ref = $1', [reference])
    ]);
    if (!legacy && !events) return reference;
  }
  throw new Error('Impossible de générer une référence de virement unique.');
}

export function paymentInstructions(
  account: BankAccountSettings,
  reference: string,
  amountCents: number
): BankTransferDetails {
  return {
    ...account,
    method: 'Virement instantané SEPA',
    reference,
    amount: Math.round(amountCents) / 100
  };
}
