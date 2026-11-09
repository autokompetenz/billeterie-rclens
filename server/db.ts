import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import {
  SEED_MATCHES,
  SEED_SECTORS,
  SEED_STANDS,
  SEED_TOURS,
  type SeedMatch
} from './seed-data.ts';

/**
 * Couche d'accès PostgreSQL (Neon en production).
 * Toutes les fonctions sont asynchrones : les routes doivent les attendre.
 */

let pool: Pool | null = null;
let initPromise: Promise<void> | null = null;

/* ------------------------------------------------------------------ */
/* Connexion                                                           */
/* ------------------------------------------------------------------ */

function needsSsl(connectionString: string): boolean {
  if (process.env.PGSSL === 'true') return true;
  if (process.env.PGSSL === 'false') return false;
  return /neon\.tech|sslmode=require|sslmode=verify/i.test(connectionString);
}

/**
 * Retire `sslmode` et `channel_binding` de l'URL avant de la confier à `pg`.
 *
 * `pg-connection-string` émet un avertissement pour `sslmode=require` et
 * changera son interprétation dans pg 9. Comme le SSL est configuré
 * explicitement ci-dessous (`ssl`), ces paramètres sont inutiles et peuvent
 * entrer en conflit avec notre configuration.
 */
function normalizeConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('channel_binding');
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL n'est pas défini. Configurez la chaîne de connexion PostgreSQL/Neon dans .env."
    );
  }

  const useSsl = needsSsl(connectionString);

  pool = new Pool({
    connectionString: normalizeConnectionString(connectionString),
    ssl: useSsl
      ? {
          // Neon utilise un certificat public : la vérification est active par
          // défaut. PGSSL_REJECT_UNAUTHORIZED=false permet de la désactiver
          // pour un serveur local à certificat auto-signé.
          rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false'
        }
      : undefined,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });

  pool.on('error', (error) => {
    console.error('[db] Erreur inattendue du pool PostgreSQL :', error);
  });

  return pool;
}

/* ------------------------------------------------------------------ */
/* Requêtes                                                            */
/* ------------------------------------------------------------------ */

export interface Queryable {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<T | undefined>;
  execute(text: string, params?: unknown[]): Promise<number>;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

export async function execute(
  text: string,
  params: unknown[] = []
): Promise<number> {
  const result = await getPool().query(text, params);
  return result.rowCount ?? 0;
}

function makeQueryable(client: PoolClient): Queryable {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const result = await client.query(text, params);
      return result.rows as T[];
    },
    async queryOne<T>(text: string, params: unknown[] = []) {
      const result = await client.query(text, params);
      return result.rows[0] as T | undefined;
    },
    async execute(text: string, params: unknown[] = []) {
      const result = await client.query(text, params);
      return result.rowCount ?? 0;
    }
  };
}

/** Exécute une fonction dans une transaction (BEGIN / COMMIT / ROLLBACK). */
export async function withTransaction<T>(
  fn: (tx: Queryable) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  const tx = makeQueryable(client);
  try {
    await client.query('BEGIN');
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[db] Échec du rollback :', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

/* ------------------------------------------------------------------ */
/* Mots de passe                                                       */
/* ------------------------------------------------------------------ */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* ------------------------------------------------------------------ */
/* Schéma                                                              */
/* ------------------------------------------------------------------ */

async function createSchema(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS matches (
      id             TEXT PRIMARY KEY,
      opponent       TEXT NOT NULL,
      opponent_short TEXT NOT NULL,
      opponent_logo  TEXT NOT NULL DEFAULT '',
      opponent_color TEXT NOT NULL DEFAULT '#334155',
      home_team      TEXT NOT NULL DEFAULT 'RC Lens',
      competition    TEXT NOT NULL,
      round          TEXT NOT NULL,
      match_date     TEXT NOT NULL,
      formatted_date TEXT NOT NULL,
      kickoff        TEXT NOT NULL,
      venue          TEXT NOT NULL,
      status         TEXT NOT NULL,
      featured       BOOLEAN NOT NULL DEFAULT FALSE,
      banner_image   TEXT
    );

    CREATE TABLE IF NOT EXISTS stands (
      match_id     TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      stand_id     TEXT NOT NULL,
      name         TEXT NOT NULL,
      category     TEXT NOT NULL,
      accent_color TEXT NOT NULL,
      sort_order   INTEGER NOT NULL,
      PRIMARY KEY (match_id, stand_id)
    );

    CREATE TABLE IF NOT EXISTS sectors (
      id                     TEXT PRIMARY KEY,
      match_id               TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      stand_id               TEXT NOT NULL,
      name                   TEXT NOT NULL,
      code                   TEXT NOT NULL,
      category               INTEGER NOT NULL,
      category_name          TEXT NOT NULL,
      price_cents            INTEGER NOT NULL,
      reduced_price_cents    INTEGER NOT NULL,
      total_seats            INTEGER NOT NULL,
      gate                   TEXT NOT NULL,
      view_angle_description TEXT NOT NULL,
      sort_order             INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sectors_match ON sectors(match_id);

    CREATE TABLE IF NOT EXISTS seats (
      id          TEXT PRIMARY KEY,
      match_id    TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      sector_id   TEXT NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
      stand_id    TEXT NOT NULL,
      row_num     INTEGER NOT NULL,
      seat_num    INTEGER NOT NULL,
      price_cents INTEGER NOT NULL,
      status      TEXT NOT NULL DEFAULT 'available',
      held_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
      held_until  TEXT,
      UNIQUE (sector_id, row_num, seat_num)
    );
    CREATE INDEX IF NOT EXISTS idx_seats_sector ON seats(sector_id);
    CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(status, held_until);

    CREATE TABLE IF NOT EXISTS holds (
      id         TEXT PRIMARY KEY,
      user_id    TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_holds_user ON holds(user_id);

    CREATE TABLE IF NOT EXISTS hold_seats (
      hold_id TEXT NOT NULL REFERENCES holds(id) ON DELETE CASCADE,
      seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
      PRIMARY KEY (hold_id, seat_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT REFERENCES users(id),
      buyer_name          TEXT NOT NULL,
      buyer_email         TEXT NOT NULL,
      tickets_total_cents INTEGER NOT NULL,
      addons_total_cents  INTEGER NOT NULL,
      discount_cents      INTEGER NOT NULL,
      total_cents         INTEGER NOT NULL,
      promo_code          TEXT,
      payment_ref         TEXT,
      addons_json         TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'paid',
      created_at          TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id               TEXT PRIMARY KEY,
      order_id         TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id          TEXT REFERENCES users(id),
      ticket_number    TEXT NOT NULL UNIQUE,
      match_id         TEXT NOT NULL,
      opponent         TEXT NOT NULL,
      match_date       TEXT NOT NULL,
      kickoff          TEXT NOT NULL,
      competition      TEXT NOT NULL,
      stand_name       TEXT NOT NULL,
      sector_name      TEXT NOT NULL,
      row_num          INTEGER NOT NULL,
      seat_num         INTEGER NOT NULL,
      gate             TEXT NOT NULL,
      beneficiary_name TEXT NOT NULL,
      tariff           TEXT NOT NULL,
      price_cents      INTEGER NOT NULL,
      qr_code_data     TEXT NOT NULL,
      barcode          TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'valid'
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);

    CREATE TABLE IF NOT EXISTS resale_listings (
      id                   TEXT PRIMARY KEY,
      ticket_id            TEXT NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
      seller_id            TEXT NOT NULL REFERENCES users(id),
      match_id             TEXT NOT NULL,
      match_opponent       TEXT NOT NULL,
      match_date           TEXT NOT NULL,
      stand_name           TEXT NOT NULL,
      sector_name          TEXT NOT NULL,
      row_num              INTEGER NOT NULL,
      seat_num             INTEGER NOT NULL,
      original_price_cents INTEGER NOT NULL,
      resale_price_cents   INTEGER NOT NULL,
      seller_initials      TEXT NOT NULL,
      verified             BOOLEAN NOT NULL DEFAULT TRUE,
      status               TEXT NOT NULL DEFAULT 'active',
      created_at           TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_resale_status ON resale_listings(status, match_id);

    CREATE TABLE IF NOT EXISTS waitlist (
      id              TEXT PRIMARY KEY,
      email           TEXT NOT NULL,
      preferred_stand TEXT NOT NULL,
      created_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tours (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      subtitle        TEXT NOT NULL,
      price_cents     INTEGER NOT NULL,
      duration        TEXT NOT NULL,
      badge           TEXT NOT NULL,
      image           TEXT NOT NULL,
      highlights_json TEXT NOT NULL,
      description     TEXT NOT NULL,
      dates_json      TEXT NOT NULL
    );

    /* ------------------------------------------------------------------ */
    /* Événements gérés par l'administration                              */
    /* ------------------------------------------------------------------ */

    CREATE TABLE IF NOT EXISTS events (
      id          TEXT PRIMARY KEY,
      slug        TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category    TEXT NOT NULL DEFAULT 'Match',
      opponent    TEXT,
      venue       TEXT NOT NULL DEFAULT 'Stade Bollaert-Delelis, Lens',
      event_date  TIMESTAMPTZ NOT NULL,
      doors_open  TEXT,
      image_url   TEXT,
      status      TEXT NOT NULL DEFAULT 'draft',
      featured    BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status, event_date);

    /* Images importées depuis l'ordinateur (stockées en base, servies par
       /api/images/:id). Évite de gonfler la colonne events.image_url et les
       réponses de liste avec de longues data-URL. */
    CREATE TABLE IF NOT EXISTS event_images (
      id          TEXT PRIMARY KEY,
      mime_type   TEXT NOT NULL,
      data        BYTEA NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS event_ticket_types (
      id            TEXT PRIMARY KEY,
      event_id      TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      stand_id      TEXT,
      description   TEXT NOT NULL DEFAULT '',
      price_cents   INTEGER NOT NULL,
      stock         INTEGER NOT NULL DEFAULT 0,
      sold          INTEGER NOT NULL DEFAULT 0,
      max_per_order INTEGER NOT NULL DEFAULT 10,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      active        BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ticket_types_event ON event_ticket_types(event_id);

    CREATE TABLE IF NOT EXISTS guest_orders (
      id            TEXT PRIMARY KEY,
      order_number  TEXT NOT NULL UNIQUE,
      event_id      TEXT REFERENCES events(id) ON DELETE SET NULL,
      event_snapshot_id TEXT,
      event_title   TEXT,
      event_date    TIMESTAMPTZ,
      event_venue   TEXT,
      buyer_name    TEXT NOT NULL,
      buyer_email   TEXT NOT NULL,
      buyer_phone   TEXT,
      total_cents   INTEGER NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending_payment',
      payment_ref   TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_guest_orders_email ON guest_orders(LOWER(buyer_email));
    CREATE INDEX IF NOT EXISTS idx_guest_orders_event ON guest_orders(event_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_orders_payment_ref
      ON guest_orders(payment_ref) WHERE payment_ref IS NOT NULL;

    CREATE TABLE IF NOT EXISTS guest_order_items (
      id               TEXT PRIMARY KEY,
      order_id         TEXT NOT NULL REFERENCES guest_orders(id) ON DELETE CASCADE,
      ticket_type_id   TEXT REFERENCES event_ticket_types(id) ON DELETE SET NULL,
      ticket_type_name TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      quantity         INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_guest_items_order ON guest_order_items(order_id);

    CREATE TABLE IF NOT EXISTS guest_tickets (
      id               TEXT PRIMARY KEY,
      order_id         TEXT NOT NULL REFERENCES guest_orders(id) ON DELETE CASCADE,
      ticket_code      TEXT NOT NULL UNIQUE,
      ticket_type_id   TEXT REFERENCES event_ticket_types(id) ON DELETE SET NULL,
      ticket_type_name TEXT NOT NULL,
      event_id         TEXT REFERENCES events(id) ON DELETE SET NULL,
      beneficiary_name TEXT,
      price_cents      INTEGER NOT NULL,
      status           TEXT NOT NULL DEFAULT 'valid',
      checked_in_at    TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_guest_tickets_order ON guest_tickets(order_id);
    CREATE INDEX IF NOT EXISTS idx_guest_tickets_event ON guest_tickets(event_id);

    CREATE TABLE IF NOT EXISTS email_log (
      id         TEXT PRIMARY KEY,
      order_id   TEXT,
      recipient  TEXT NOT NULL,
      kind       TEXT NOT NULL,
      subject    TEXT NOT NULL,
      status     TEXT NOT NULL,
      error      TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_email_log_order ON email_log(order_id);

    CREATE TABLE IF NOT EXISTS bank_transfer_settings (
      id             TEXT PRIMARY KEY CHECK (id = 'default'),
      account_holder TEXT NOT NULL,
      iban           TEXT NOT NULL,
      bic            TEXT NOT NULL,
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Les réservations sans compte utilisent un identifiant aléatoire de navigateur.
  // Les anciennes installations avaient des clés étrangères vers users sur ces colonnes.
  await getPool().query(`
    ALTER TABLE holds ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE holds DROP CONSTRAINT IF EXISTS holds_user_id_fkey;
    ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
    ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_user_id_fkey;
    ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_held_by_fkey;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_ref TEXT;
    ALTER TABLE event_ticket_types ADD COLUMN IF NOT EXISTS stand_id TEXT;
    ALTER TABLE guest_orders ADD COLUMN IF NOT EXISTS event_snapshot_id TEXT;
    ALTER TABLE guest_orders ADD COLUMN IF NOT EXISTS event_title TEXT;
    ALTER TABLE guest_orders ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;
    ALTER TABLE guest_orders ADD COLUMN IF NOT EXISTS event_venue TEXT;
  `);
  await getPool().query(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_ref ON orders(payment_ref) WHERE payment_ref IS NOT NULL'
  );
}

/* ------------------------------------------------------------------ */
/* Amorçage des données de démonstration                               */
/* ------------------------------------------------------------------ */

interface SeatPlan {
  match: SeedMatch;
  matchIndex: number;
  sectorId: string;
  standId: string;
  priceCents: number;
}

const FORCED_OCCUPIED = new Set<string>([
  'rcl-om-2026|sec-marek-centrale|7|12',
  'rcl-losc-2026|sec-marek-centrale|6|10',
  'rcl-losc-2026|sec-lepagnot-honneur|4|8',
  'rcl-om-2026|sec-delacourt-niv0|3|9'
]);

const ROWS_PER_SECTOR = 8;
const SEATS_PER_ROW = 14;

function nowIso(): string {
  return new Date().toISOString();
}

async function seedCatalog(tx: Queryable): Promise<void> {
  const seatPlans: SeatPlan[] = [];

  for (let matchIndex = 0; matchIndex < SEED_MATCHES.length; matchIndex += 1) {
    const match = SEED_MATCHES[matchIndex];
    await tx.execute(
      `INSERT INTO matches (
         id, opponent, opponent_short, opponent_logo, opponent_color, home_team,
         competition, round, match_date, formatted_date, kickoff, venue, status,
         featured, banner_image
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO NOTHING`,
      [
        match.id,
        match.opponent,
        match.opponentShort,
        match.opponentLogo,
        match.opponentColor,
        'RC Lens',
        match.competition,
        match.round,
        match.date,
        match.formattedDate,
        match.time,
        match.venue,
        match.status,
        match.featured,
        match.bannerImage ?? null
      ]
    );

    for (const stand of SEED_STANDS) {
      await tx.execute(
        `INSERT INTO stands (match_id, stand_id, name, category, accent_color, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (match_id, stand_id) DO NOTHING`,
        [match.id, stand.id, stand.name, stand.category, stand.accentColor, stand.sortOrder]
      );
    }

    for (const sector of SEED_SECTORS) {
      const sectorRowId = `${match.id}__${sector.id}`;
      const priceCents = Math.round(sector.price * match.priceFactor) * 100;
      const reducedCents = Math.round(sector.reducedPrice * match.priceFactor) * 100;
      const totalSeats = ROWS_PER_SECTOR * SEATS_PER_ROW;

      await tx.execute(
        `INSERT INTO sectors (
           id, match_id, stand_id, name, code, category, category_name, price_cents,
           reduced_price_cents, total_seats, gate, view_angle_description, sort_order
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO NOTHING`,
        [
          sectorRowId,
          match.id,
          sector.standId,
          sector.name,
          sector.code,
          sector.category,
          sector.categoryName,
          priceCents,
          reducedCents,
          totalSeats,
          sector.gate,
          sector.viewAngleDescription,
          sector.sortOrder
        ]
      );

      seatPlans.push({
        match,
        matchIndex,
        sectorId: sectorRowId,
        standId: sector.standId,
        priceCents
      });
    }
  }

  for (const plan of seatPlans) {
    const values: unknown[] = [];
    const chunks: string[] = [];
    let index = 0;

    for (let row = 1; row <= ROWS_PER_SECTOR; row += 1) {
      for (let seat = 1; seat <= SEATS_PER_ROW; seat += 1) {
        const forcedKey = `${plan.match.id}|${plan.sectorId.split('__')[1]}|${row}|${seat}`;
        const pseudo = (row * 17 + seat * 31 + plan.matchIndex * 7 + 13) % 100;
        const occupied =
          plan.match.occupancy >= 1 ||
          FORCED_OCCUPIED.has(forcedKey) ||
          pseudo < plan.match.occupancy * 100;

        const base = index * 8;
        chunks.push(
          `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8})`
        );
        values.push(
          `${plan.sectorId}-R${row}-S${seat}`,
          plan.match.id,
          plan.sectorId,
          plan.standId,
          row,
          seat,
          plan.priceCents,
          occupied ? 'occupied' : 'available'
        );
        index += 1;
      }
    }

    await tx.execute(
      `INSERT INTO seats (id, match_id, sector_id, stand_id, row_num, seat_num, price_cents, status)
       VALUES ${chunks.join(',')} ON CONFLICT (id) DO NOTHING`,
      values
    );
  }
}

async function seedTours(tx: Queryable): Promise<void> {
  for (const tour of SEED_TOURS) {
    await tx.execute(
      `INSERT INTO tours (id, title, subtitle, price_cents, duration, badge, image, highlights_json, description, dates_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [
        tour.id,
        tour.title,
        tour.subtitle,
        tour.price * 100,
        tour.duration,
        tour.badge,
        tour.image,
        JSON.stringify(tour.highlights),
        tour.description,
        JSON.stringify(tour.dates)
      ]
    );
  }
}

interface SeedUser {
  id: string;
  name: string;
  email: string;
}

async function seedUsers(tx: Queryable, demoPassword: string): Promise<SeedUser[]> {
  const users: SeedUser[] = [
    { id: 'usr-demo', name: 'Alexandre Dupont', email: 'supporter@rclens.fr' },
    { id: 'usr-seller-1', name: 'Guillaume Dubois', email: 'g.dubois@example.com' },
    { id: 'usr-seller-2', name: 'Marie Fournier', email: 'm.fournier@example.com' },
    { id: 'usr-seller-3', name: 'Antoine Benoit', email: 'a.benoit@example.com' }
  ];

  for (const user of users) {
    await tx.execute(
      `INSERT INTO users (id, name, email, password_hash, created_at)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [user.id, user.name, user.email, hashPassword(demoPassword), nowIso()]
    );
  }

  return users;
}

interface SeedTicket {
  id: string;
  userId: string;
  ticketNumber: string;
  matchId: string;
  sectorSeedId: string;
  row: number;
  seat: number;
  beneficiary: string;
  price: number;
  status: string;
}

async function seedTicketsAndResale(tx: Queryable): Promise<void> {
  const om = SEED_MATCHES.find((m) => m.id === 'rcl-om-2026')!;
  const losc = SEED_MATCHES.find((m) => m.id === 'rcl-losc-2026')!;

  const tickets: SeedTicket[] = [
    {
      id: 'tkt-demo-1',
      userId: 'usr-demo',
      ticketNumber: 'RCL-2026-894721',
      matchId: om.id,
      sectorSeedId: 'sec-marek-centrale',
      row: 7,
      seat: 12,
      beneficiary: 'Alexandre Dupont',
      price: 29,
      status: 'valid'
    },
    {
      id: 'tkt-resale-1',
      userId: 'usr-seller-1',
      ticketNumber: 'RCL-2026-551204',
      matchId: losc.id,
      sectorSeedId: 'sec-marek-centrale',
      row: 6,
      seat: 10,
      beneficiary: 'Guillaume Dubois',
      price: 35,
      status: 'listed_resale'
    },
    {
      id: 'tkt-resale-2',
      userId: 'usr-seller-2',
      ticketNumber: 'RCL-2026-773910',
      matchId: losc.id,
      sectorSeedId: 'sec-lepagnot-honneur',
      row: 4,
      seat: 8,
      beneficiary: 'Marie Fournier',
      price: 55,
      status: 'listed_resale'
    },
    {
      id: 'tkt-resale-3',
      userId: 'usr-seller-3',
      ticketNumber: 'RCL-2026-118842',
      matchId: om.id,
      sectorSeedId: 'sec-delacourt-niv0',
      row: 3,
      seat: 9,
      beneficiary: 'Antoine Benoit',
      price: 24,
      status: 'listed_resale'
    }
  ];

  const sellers = new Map([
    ['usr-seller-1', 'G. D.'],
    ['usr-seller-2', 'M. F.'],
    ['usr-seller-3', 'A. B.']
  ]);

  for (let index = 0; index < tickets.length; index += 1) {
    const ticket = tickets[index];
    const match = SEED_MATCHES.find((m) => m.id === ticket.matchId)!;
    const sectorSeed = SEED_SECTORS.find((s) => s.id === ticket.sectorSeedId)!;
    const stand = SEED_STANDS.find((s) => s.id === sectorSeed.standId)!;
    const orderId = `ord-seed-${index + 1}`;
    const priceCents = ticket.price * 100;

    await tx.execute(
      `INSERT INTO orders (
         id, user_id, buyer_name, buyer_email, tickets_total_cents, addons_total_cents,
         discount_cents, total_cents, promo_code, addons_json, status, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
      [
        orderId,
        ticket.userId,
        ticket.beneficiary,
        'seed@rclens.fr',
        priceCents,
        0,
        0,
        priceCents,
        null,
        JSON.stringify({ insurance: false, scarf: false, parkingPass: 'none' }),
        'paid',
        nowIso()
      ]
    );

    await tx.execute(
      `INSERT INTO tickets (
         id, order_id, user_id, ticket_number, match_id, opponent, match_date, kickoff,
         competition, stand_name, sector_name, row_num, seat_num, gate, beneficiary_name,
         tariff, price_cents, qr_code_data, barcode, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT (id) DO NOTHING`,
      [
        ticket.id,
        orderId,
        ticket.userId,
        ticket.ticketNumber,
        match.id,
        match.opponent,
        match.formattedDate,
        match.time,
        `${match.competition} - ${match.round}`,
        stand.name,
        sectorSeed.name,
        ticket.row,
        ticket.seat,
        sectorSeed.gate,
        ticket.beneficiary,
        'Plein Tarif',
        priceCents,
        `https://billetterie.rclens.fr/verify/${ticket.ticketNumber}`,
        `2600${String(100000000000 + index * 7919).slice(0, 12)}`,
        ticket.status
      ]
    );

    if (ticket.status === 'listed_resale') {
      await tx.execute(
        `INSERT INTO resale_listings (
           id, ticket_id, seller_id, match_id, match_opponent, match_date, stand_name,
           sector_name, row_num, seat_num, original_price_cents, resale_price_cents,
           seller_initials, verified, status, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [
          `resale-seed-${index}`,
          ticket.id,
          ticket.userId,
          match.id,
          match.opponent,
          `${match.formattedDate} ${match.time}`,
          stand.name,
          sectorSeed.name,
          ticket.row,
          ticket.seat,
          priceCents,
          priceCents,
          sellers.get(ticket.userId) ?? 'RCL',
          true,
          'active',
          nowIso()
        ]
      );
    }
  }
}

async function seedEvents(tx: Queryable): Promise<void> {
  const events = [
    {
      id: 'evt-lens-marseille',
      slug: 'lens-marseille-2026',
      title: 'RC Lens — Olympique de Marseille',
      description:
        "Le choc de la 28e journée de Ligue 1 à Bollaert-Delelis. Vivez la ferveur des Sang et Or face à l'OM.",
      category: 'Match',
      opponent: 'Olympique de Marseille',
      venue: 'Stade Bollaert-Delelis, Lens',
      eventDate: '2026-11-21T20:00:00.000Z',
      doorsOpen: '18h30',
      imageUrl: '/images/hero_bollaert_atmosphere_1794048534296.jpg',
      status: 'published',
      featured: true,
      ticketTypes: [
        { name: 'Tribune Marek / Xercès', price: 2900, stock: 120, max: 6 },
        { name: 'Tribune Trannin', price: 3500, stock: 90, max: 6 },
        { name: 'Tribune Delacourt', price: 4200, stock: 60, max: 4 },
        { name: 'Honneur Lepagnot', price: 5900, stock: 30, max: 4 }
      ]
    },
    {
      id: 'evt-lens-lille',
      slug: 'lens-lille-derby-2026',
      title: 'RC Lens — LOSC Lille · Derby du Nord',
      description:
        'Le derby du Nord, une ambiance unique en France. Réservez votre place pour ce rendez-vous historique.',
      category: 'Match',
      opponent: 'LOSC Lille',
      venue: 'Stade Bollaert-Delelis, Lens',
      eventDate: '2026-12-05T16:00:00.000Z',
      doorsOpen: '14h30',
      imageUrl: '/images/match_derby_action_1794048535712.jpg',
      status: 'published',
      featured: true,
      ticketTypes: [
        { name: 'Tribune Marek / Xercès', price: 3400, stock: 100, max: 6 },
        { name: 'Tribune Trannin', price: 3900, stock: 80, max: 6 },
        { name: 'Honneur Lepagnot', price: 6500, stock: 25, max: 4 }
      ]
    },
    {
      id: 'evt-visite-coulisses',
      slug: 'visite-coulisses-bollaert',
      title: 'Visite des coulisses de Bollaert',
      description:
        "Pénétrez dans l'intimité des Sang et Or : vestiaires, tunnel, banc de touche et salle de presse.",
      category: 'Visite',
      opponent: null,
      venue: 'Stade Bollaert-Delelis, Lens',
      eventDate: '2026-11-25T13:30:00.000Z',
      doorsOpen: '13h00',
      imageUrl: '/images/stadium_pitch_aerial_1794048534631.jpg',
      status: 'published',
      featured: false,
      ticketTypes: [
        { name: 'Adulte', price: 1500, stock: 40, max: 8 },
        { name: 'Enfant (moins de 12 ans)', price: 900, stock: 20, max: 8 }
      ]
    }
  ];

  for (const event of events) {
    await tx.execute(
      `INSERT INTO events (
         id, slug, title, description, category, opponent, venue, event_date,
         doors_open, image_url, status, featured
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [
        event.id,
        event.slug,
        event.title,
        event.description,
        event.category,
        event.opponent,
        event.venue,
        event.eventDate,
        event.doorsOpen,
        event.imageUrl,
        event.status,
        event.featured
      ]
    );

    for (let index = 0; index < event.ticketTypes.length; index += 1) {
      const type = event.ticketTypes[index];
      await tx.execute(
        `INSERT INTO event_ticket_types (
           id, event_id, name, description, price_cents, stock, max_per_order, sort_order, active
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)
         ON CONFLICT (id) DO NOTHING`,
        [
          `${event.id}-tt-${index + 1}`,
          event.id,
          type.name,
          '',
          type.price,
          type.stock,
          type.max,
          index + 1
        ]
      );
    }
  }
}

async function seedIfEmpty(): Promise<void> {
  if (process.env.SEED_DEMO_DATA === 'false') {
    console.log('[db] SEED_DEMO_DATA=false : amorçage ignoré.');
    return;
  }

  const count = await queryOne<{ total: string }>('SELECT COUNT(*)::text AS total FROM matches');
  if (Number(count?.total ?? 0) > 0) return;

  const demoPassword = process.env.SEED_PASSWORD || 'Bollaert2026!';
  await withTransaction(async (tx) => {
    await seedCatalog(tx);
    await seedTours(tx);
    await seedUsers(tx, demoPassword);
    await seedTicketsAndResale(tx);
    await seedEvents(tx);
  });
  console.log('[db] Base amorcée avec les données de référence RC Lens.');
}

/* ------------------------------------------------------------------ */
/* Initialisation                                                      */
/* ------------------------------------------------------------------ */

async function doInit(): Promise<void> {
  getPool();
  await createSchema();
  await seedIfEmpty();

  const now = nowIso();
  await execute('DELETE FROM sessions WHERE expires_at < $1', [now]);
  await releaseExpiredHolds();
}

/**
 * Initialise la base (schéma + données de démonstration).
 * Mémoïsé : les appels suivants réutilisent la même promesse.
 */
export function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = doInit().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

/** Libère les sièges dont la pré-réservation a expiré. */
export async function releaseExpiredHolds(tx?: Queryable): Promise<number> {
  const now = nowIso();
  const runner = tx ?? { query, queryOne, execute };

  const expired = await runner.query<{ id: string }>(
    'SELECT id FROM holds WHERE expires_at < $1',
    [now]
  );

  if (expired.length === 0) return 0;

  await runner.execute(
    "UPDATE seats SET status = 'available', held_by = NULL, held_until = NULL WHERE status = 'held' AND held_until < $1",
    [now]
  );
  await runner.execute('DELETE FROM holds WHERE expires_at < $1', [now]);

  return expired.length;
}

export async function closeDb(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = null;
  initPromise = null;
  await current.end();
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString('hex')}`;
}

export function centsToEuros(cents: number): number {
  return Math.round(cents) / 100;
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function isoNow(): string {
  return nowIso();
}

export function addMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}
