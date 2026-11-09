import 'dotenv/config';
import { app } from './app.ts';
import { closeDb, initDb, releaseExpiredHolds } from './db.ts';

const PORT = Number(process.env.PORT || 3001);
const NODE_ENV = process.env.NODE_ENV || 'development';

async function start(): Promise<void> {
  await initDb();

  const server = app.listen(PORT, () => {
    console.log(
      `[api] Billetterie RC Lens prête sur http://localhost:${PORT} (${NODE_ENV}, PostgreSQL)`
    );
    if (!process.env.ADMIN_CODE) {
      console.warn(
        '[api] ADMIN_CODE non défini : l’espace /admin refuse les connexions tant que la variable n’est pas configurée.'
      );
    }
  });

  // Nettoyage périodique des pré-réservations expirées (toutes les minutes).
  const holdSweeper = setInterval(() => {
    releaseExpiredHolds().catch((error) => {
      console.error('[api] Échec du nettoyage des pré-réservations :', error);
    });
  }, 60_000);
  holdSweeper.unref();

  async function shutdown(signal: string): Promise<void> {
    console.log(`[api] Signal ${signal} reçu, arrêt en cours…`);
    clearInterval(holdSweeper);
    server.close(async () => {
      await closeDb();
      console.log('[api] Serveur arrêté proprement.');
      process.exit(0);
    });

    setTimeout(() => {
      closeDb().finally(() => process.exit(1));
    }, 5_000).unref();
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('[api] Impossible de démarrer le serveur :', error);
  process.exit(1);
});
