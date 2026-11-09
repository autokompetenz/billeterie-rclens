import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { HttpError, unauthorized } from './http.ts';

/**
 * Authentification de l'espace administrateur.
 *
 * Pas de compte en base : le code est fourni par la variable ADMIN_CODE.
 * Un cookie HttpOnly signé (HMAC) porte la session pendant 12 heures.
 */

export const ADMIN_COOKIE = 'rcl_admin';
const SESSION_MS = 12 * 60 * 60 * 1000;

export function getAdminCode(): string | undefined {
  return process.env.ADMIN_CODE?.trim() || undefined;
}

function getSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    getAdminCode() ||
    'rclens-admin-dev-secret'
  );
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function isAdminConfigured(): boolean {
  return Boolean(getAdminCode());
}

export function createAdminToken(): string {
  const expires = Date.now() + SESSION_MS;
  const payload = `admin.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [scope, expiresRaw, signature] = parts;
  if (scope !== 'admin') return false;

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  const expected = Buffer.from(sign(`${scope}.${expiresRaw}`), 'hex');
  const actual = Buffer.from(signature, 'hex');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};

  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(value);
      } catch {
        result[key] = value;
      }
    }
  }
  return result;
}

export function setAdminCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production';
  const attributes = [
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_MS / 1000)}`
  ];
  if (secure) attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
}

export function clearAdminCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production';
  const attributes = [
    `${ADMIN_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ];
  if (secure) attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
}

export function isAdminRequest(req: Request): boolean {
  return verifyAdminToken(parseCookies(req)[ADMIN_COOKIE]);
}

/** Middleware : protège toutes les routes /api/admin (sauf login). */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!isAdminRequest(req)) {
    return next(unauthorized('Accès administrateur requis.'));
  }
  next();
}

/* ------------------------------------------------------------------ */
/* Limitation des tentatives de connexion admin                        */
/* ------------------------------------------------------------------ */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; first: number }>();

export function checkAdminRateLimit(ip: string): void {
  const record = attempts.get(ip);
  if (!record) return;
  if (Date.now() - record.first > WINDOW_MS) {
    attempts.delete(ip);
    return;
  }
  if (record.count >= MAX_ATTEMPTS) {
    throw new HttpError(
      429,
      'Trop de tentatives. Réessayez dans quelques minutes.',
      'TOO_MANY_ATTEMPTS'
    );
  }
}

export function registerAdminFailure(ip: string): void {
  const record = attempts.get(ip);
  if (!record || Date.now() - record.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: Date.now() });
    return;
  }
  record.count += 1;
}

export function clearAdminFailures(ip: string): void {
  attempts.delete(ip);
}
