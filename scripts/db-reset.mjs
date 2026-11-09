#!/usr/bin/env node
/**
 * Réinitialise la base PostgreSQL locale (ou distante) en supprimant toutes
 * les tables du schéma public. À utiliser uniquement en développement.
 *
 * Usage : npm run db:reset
 */
import 'dotenv/config';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[db:reset] DATABASE_URL n'est pas défini.");
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && process.env.FORCE_RESET !== 'true') {
  console.error(
    '[db:reset] Refus en production. Définissez FORCE_RESET=true pour confirmer.'
  );
  process.exit(1);
}

const ssl = /neon\.tech|sslmode=require/i.test(connectionString)
  ? { rejectUnauthorized: false }
  : undefined;

const client = new pg.Client({ connectionString, ssl });

try {
  await client.connect();
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  if (rows.length === 0) {
    console.log('[db:reset] Aucune table à supprimer.');
  } else {
    const names = rows.map((row) => `"${row.tablename}"`).join(', ');
    await client.query(`DROP TABLE IF EXISTS ${names} CASCADE`);
    console.log(`[db:reset] ${rows.length} table(s) supprimée(s).`);
  }
  console.log(
    '[db:reset] La base sera recréée et réamorcée au prochain démarrage du serveur.'
  );
} catch (error) {
  console.error('[db:reset] Échec :', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
