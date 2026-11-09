-- ===========================================================================
-- Billetterie RC Lens — schéma PostgreSQL / Neon
-- ===========================================================================
-- À exécuter une seule fois dans l'éditeur SQL de Neon
-- (console.neon.tech → votre projet → SQL Editor → coller → Run).
--
-- Le script est idempotent : il peut être relancé sans erreur
-- (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
--
-- Il crée uniquement la STRUCTURE. Les données de démonstration (matchs,
-- sièges, événements…) sont insérées automatiquement par l'application au
-- premier démarrage lorsque SEED_DEMO_DATA="true".
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Comptes et sessions
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Matchs, tribunes, secteurs et sièges
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Pré-réservations (holds)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holds (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_holds_user ON holds(user_id);

CREATE TABLE IF NOT EXISTS hold_seats (
  hold_id TEXT NOT NULL REFERENCES holds(id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  PRIMARY KEY (hold_id, seat_id)
);

-- ---------------------------------------------------------------------------
-- Commandes et billets (parcours avec compte)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id),
  buyer_name          TEXT NOT NULL,
  buyer_email         TEXT NOT NULL,
  tickets_total_cents INTEGER NOT NULL,
  addons_total_cents  INTEGER NOT NULL,
  discount_cents      INTEGER NOT NULL,
  total_cents         INTEGER NOT NULL,
  promo_code          TEXT,
  addons_json         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'paid',
  created_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id               TEXT PRIMARY KEY,
  order_id         TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users(id),
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

-- ---------------------------------------------------------------------------
-- Bourse d'échange
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Liste d'attente abonnements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waitlist (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL,
  preferred_stand TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Visites du stade
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Événements gérés par l'administration
-- ---------------------------------------------------------------------------
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

-- Images importées depuis l'administration, stockées en base et servies par
-- /api/images/:id (évite les data-URL volumineuses dans events.image_url).
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

-- ---------------------------------------------------------------------------
-- Commandes invité (achat sans compte)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guest_orders (
  id           TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  event_id     TEXT REFERENCES events(id) ON DELETE SET NULL,
  buyer_name   TEXT NOT NULL,
  buyer_email  TEXT NOT NULL,
  buyer_phone  TEXT,
  total_cents  INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'paid',
  payment_ref  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_guest_orders_email ON guest_orders(LOWER(buyer_email));
CREATE INDEX IF NOT EXISTS idx_guest_orders_event ON guest_orders(event_id);

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

-- ---------------------------------------------------------------------------
-- Journal des e-mails transactionnels
-- ---------------------------------------------------------------------------
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

COMMIT;

-- ===========================================================================
-- Fin du schéma — 19 tables.
-- Vérification rapide :
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;
-- ===========================================================================
