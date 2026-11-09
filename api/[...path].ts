import { app } from '../server/app.ts';

/**
 * Point d'entrée serverless Vercel.
 * Toutes les requêtes /api/* sont traitées par l'application Express.
 */
export default app;
