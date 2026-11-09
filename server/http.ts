import type { NextFunction, Request, RequestHandler, Response } from 'express';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      authToken?: string;
    }
  }
}

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = 'ERROR') {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

type AsyncRoute = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown> | unknown;

/** Enveloppe une route async pour propager les erreurs au middleware Express. */
export function asyncHandler(handler: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function badRequest(message: string, code = 'BAD_REQUEST'): HttpError {
  return new HttpError(400, message, code);
}

export function unauthorized(message = 'Authentification requise.'): HttpError {
  return new HttpError(401, message, 'UNAUTHORIZED');
}

export function forbidden(message = 'Accès refusé.'): HttpError {
  return new HttpError(403, message, 'FORBIDDEN');
}

export function notFound(message = 'Ressource introuvable.'): HttpError {
  return new HttpError(404, message, 'NOT_FOUND');
}

export function conflict(message: string, code = 'CONFLICT'): HttpError {
  return new HttpError(409, message, code);
}

/** Extrait et valide une chaîne de caractères. */
export function requireString(
  value: unknown,
  field: string,
  options: { min?: number; max?: number } = {}
): string {
  if (typeof value !== 'string') {
    throw badRequest(`Le champ « ${field} » est requis.`, 'VALIDATION_ERROR');
  }
  const trimmed = value.trim();
  const { min = 1, max = 200 } = options;
  if (trimmed.length < min) {
    throw badRequest(
      `Le champ « ${field} » doit contenir au moins ${min} caractère(s).`,
      'VALIDATION_ERROR'
    );
  }
  if (trimmed.length > max) {
    throw badRequest(
      `Le champ « ${field} » ne peut pas dépasser ${max} caractères.`,
      'VALIDATION_ERROR'
    );
  }
  return trimmed;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function requireEmail(value: unknown): string {
  const email = requireString(value, 'email', { max: 190 }).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw badRequest('Adresse e-mail invalide.', 'VALIDATION_ERROR');
  }
  return email;
}

export function optionalString(value: unknown, max = 200): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}
