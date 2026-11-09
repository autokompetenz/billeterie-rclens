import { Router } from 'express';
import { createSession, getRequestUser, requireAuth, revokeSession } from './auth.ts';
import { execute, hashPassword, isoNow, newId, queryOne, verifyPassword } from './db.ts';
import {
  HttpError,
  asyncHandler,
  badRequest,
  conflict,
  requireEmail,
  requireString,
  unauthorized
} from './http.ts';

export const accountRouter = Router();

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

const MIN_PASSWORD_LENGTH = 8;

/* ------------------------------------------------------------------ */
/* Limitation basique des tentatives de connexion (en mémoire)         */
/* ------------------------------------------------------------------ */

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 10;

interface AttemptRecord {
  count: number;
  firstAttempt: number;
}

const loginAttempts = new Map<string, AttemptRecord>();

function attemptKey(req: { ip?: string; body?: any }): string {
  const email =
    typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'unknown';
  return `${req.ip ?? 'local'}|${email}`;
}

function checkRateLimit(key: string): void {
  const record = loginAttempts.get(key);
  if (!record) return;

  if (Date.now() - record.firstAttempt > RATE_WINDOW_MS) {
    loginAttempts.delete(key);
    return;
  }

  if (record.count >= RATE_MAX_ATTEMPTS) {
    throw new HttpError(
      429,
      'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
      'TOO_MANY_ATTEMPTS'
    );
  }
}

function registerFailure(key: string): void {
  const record = loginAttempts.get(key);
  if (!record || Date.now() - record.firstAttempt > RATE_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: Date.now() });
    return;
  }
  record.count += 1;
}

function clearFailures(key: string): void {
  loginAttempts.delete(key);
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

function publicUser(row: UserRow) {
  return { id: row.id, name: row.name, email: row.email };
}

accountRouter.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const name = requireString(req.body?.name, 'nom', { min: 2, max: 120 });
    const email = requireEmail(req.body?.email);
    const password = requireString(req.body?.password, 'mot de passe', {
      min: MIN_PASSWORD_LENGTH,
      max: 200
    });

    const existing = await queryOne('SELECT id FROM users WHERE LOWER(email) = $1', [
      email
    ]);

    if (existing) {
      throw conflict(
        'Un compte existe déjà avec cette adresse e-mail.',
        'EMAIL_ALREADY_USED'
      );
    }

    const userId = newId('usr');
    await execute(
      'INSERT INTO users (id, name, email, password_hash, created_at) VALUES ($1,$2,$3,$4,$5)',
      [userId, name, email, hashPassword(password), isoNow()]
    );

    const session = await createSession(userId);

    res.status(201).json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: { id: userId, name, email }
    });
  })
);

accountRouter.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const key = attemptKey(req);
    checkRateLimit(key);

    const email = requireEmail(req.body?.email);
    const password = requireString(req.body?.password, 'mot de passe', {
      min: 1,
      max: 200
    });

    const row = await queryOne<UserRow>(
      'SELECT * FROM users WHERE LOWER(email) = $1',
      [email]
    );

    if (!row || !verifyPassword(password, row.password_hash)) {
      registerFailure(key);
      throw unauthorized('Adresse e-mail ou mot de passe incorrect.');
    }

    clearFailures(key);
    const session = await createSession(row.id);

    res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: publicUser(row)
    });
  })
);

accountRouter.get(
  '/auth/me',
  requireAuth,
  asyncHandler((req, res) => {
    const user = getRequestUser(req);
    res.json(user);
  })
);

accountRouter.post(
  '/auth/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.authToken) await revokeSession(req.authToken);
    res.json({ success: true });
  })
);

accountRouter.patch(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getRequestUser(req);
    const name = requireString(req.body?.name, 'nom', { min: 2, max: 120 });

    await execute('UPDATE users SET name = $1 WHERE id = $2', [name, user.id]);

    res.json({ ...user, name });
  })
);

/** Réinitialise les compteurs de limitation (utile pour les tests). */
export function resetLoginRateLimit(): void {
  loginAttempts.clear();
}

/** Vérifie qu'un mot de passe respecte la politique minimale. */
export function assertPasswordPolicy(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(
      `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
      'VALIDATION_ERROR'
    );
  }
}
