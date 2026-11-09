import { createHash, randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { execute, isoNow, queryOne } from './db.ts';
import { type AuthUser, unauthorized } from './http.ts';

const SESSION_DAYS = 30;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface Session {
  token: string;
  expiresAt: string;
}

export async function createSession(userId: string): Promise<Session> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await execute(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES ($1,$2,$3,$4)',
    [hashToken(token), userId, isoNow(), expiresAt]
  );

  return { token, expiresAt };
}

export async function revokeSession(token: string): Promise<void> {
  await execute('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await execute('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

function extractBearer(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  const token = header.slice('Bearer '.length).trim();
  return token || undefined;
}

export async function authenticateToken(token: string): Promise<AuthUser | null> {
  const row = await queryOne<{
    id: string;
    name: string;
    email: string;
    expires_at: string;
  }>(
    `SELECT u.id, u.name, u.email, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1`,
    [hashToken(token)]
  );

  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await revokeSession(token);
    return null;
  }

  return { id: row.id, name: row.name, email: row.email };
}

/** Middleware : exige un jeton valide, sinon 401. */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearer(req);
    if (!token) return next(unauthorized());

    const user = await authenticateToken(token);
    if (!user) return next(unauthorized('Session expirée ou invalide.'));

    req.user = user;
    req.authToken = token;
    next();
  } catch (error) {
    next(error);
  }
}

/** Middleware : attache l'utilisateur si un jeton valide est présent. */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearer(req);
    if (token) {
      const user = await authenticateToken(token);
      if (user) {
        req.user = user;
        req.authToken = token;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function getRequestUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
