import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response
} from 'express';
import { accountRouter } from './account.ts';
import { adminRouter } from './admin.ts';
import { catalogRouter } from './catalog.ts';
import { commerceRouter } from './commerce.ts';
import { initDb } from './db.ts';
import { eventsRouter } from './events.ts';
import { HttpError } from './http.ts';

/**
 * Application Express partagée entre le serveur local (server/index.ts)
 * et la fonction serverless Vercel (api/[...path].ts).
 */

const NODE_ENV = process.env.NODE_ENV || 'development';
const DIST_DIR = resolve(process.cwd(), 'dist');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  /* ------------------------------------------------------------------ */
  /* Middlewares globaux                                                 */
  /* ------------------------------------------------------------------ */

  app.use(express.json({ limit: '1mb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE, OPTIONS'
      );
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) return next();
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const level =
        res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      console[level](
        `[api] ${req.method} ${req.originalUrl} → ${res.statusCode} (${durationMs.toFixed(1)} ms)`
      );
    });
    next();
  });

  /* ------------------------------------------------------------------ */
  /* Initialisation de la base (mémoïsée)                                */
  /* ------------------------------------------------------------------ */

  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) return next();
    initDb()
      .then(() => next())
      .catch(next);
  });

  /* ------------------------------------------------------------------ */
  /* Routes API                                                          */
  /* ------------------------------------------------------------------ */

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      env: NODE_ENV,
      database: 'postgres',
      time: new Date().toISOString()
    });
  });

  app.use('/api', catalogRouter);
  app.use('/api', commerceRouter);
  app.use('/api', accountRouter);
  app.use('/api', eventsRouter);
  app.use('/api', adminRouter);

  app.use('/api', (_req, _res, next) => {
    next(new HttpError(404, "Cette route de l'API n'existe pas.", 'NOT_FOUND'));
  });

  /* ------------------------------------------------------------------ */
  /* Frontend (build de production, serveur local uniquement)            */
  /* ------------------------------------------------------------------ */

  if (existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(resolve(DIST_DIR, 'index.html'), (error) => {
        if (error) next(error);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Gestion des erreurs                                                 */
  /* ------------------------------------------------------------------ */

  const errorHandler: ErrorRequestHandler = (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({
        error: error.message,
        code: error.code
      });
      return;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { type?: string }).type === 'entity.parse.failed'
    ) {
      res.status(400).json({
        error: 'Le corps de la requête contient un JSON invalide.',
        code: 'INVALID_JSON'
      });
      return;
    }

    console.error('[api] Erreur inattendue :', error);
    res.status(500).json({
      error: 'Une erreur interne est survenue. Merci de réessayer.',
      code: 'INTERNAL_ERROR'
    });
  };

  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
