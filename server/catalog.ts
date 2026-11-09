import { Router } from 'express';
import { optionalAuth } from './auth.ts';
import { centsToEuros, query, queryOne, releaseExpiredHolds } from './db.ts';
import { asyncHandler, notFound } from './http.ts';

export const catalogRouter = Router();

interface MatchRow {
  id: string;
  opponent: string;
  opponent_short: string;
  opponent_logo: string;
  opponent_color: string;
  home_team: string;
  competition: string;
  round: string;
  match_date: string;
  formatted_date: string;
  kickoff: string;
  venue: string;
  status: string;
  featured: boolean;
  banner_image: string | null;
}

interface StandRow {
  stand_id: string;
  name: string;
  category: string;
  accent_color: string;
  sort_order: number;
}

interface StandAggregateRow {
  stand_id: string;
  min_price_cents: number;
  available: string;
}

interface SectorRow {
  id: string;
  match_id: string;
  stand_id: string;
  name: string;
  code: string;
  category: number;
  category_name: string;
  price_cents: number;
  reduced_price_cents: number;
  total_seats: number;
  gate: string;
  view_angle_description: string;
  sort_order: number;
  available: string;
}

interface SeatRow {
  id: string;
  sector_id: string;
  stand_id: string;
  row_num: number;
  seat_num: number;
  price_cents: number;
  status: string;
  held_by: string | null;
}

interface TourRow {
  id: string;
  title: string;
  subtitle: string;
  price_cents: number;
  duration: string;
  badge: string;
  image: string;
  highlights_json: string;
  description: string;
  dates_json: string;
}

async function loadSectorRows(matchId: string): Promise<SectorRow[]> {
  return query<SectorRow>(
    `SELECT sec.*,
            COALESCE(SUM(CASE WHEN st.status = 'available' THEN 1 ELSE 0 END), 0)::text AS available
       FROM sectors sec
       LEFT JOIN seats st ON st.sector_id = sec.id
      WHERE sec.match_id = $1
      GROUP BY sec.id
      ORDER BY sec.sort_order`,
    [matchId]
  );
}

function mapSector(row: SectorRow) {
  return {
    id: row.id,
    standId: row.stand_id,
    name: row.name,
    code: row.code,
    category: row.category,
    categoryName: row.category_name,
    price: centsToEuros(row.price_cents),
    reducedPrice: centsToEuros(row.reduced_price_cents),
    totalSeats: row.total_seats,
    availableSeats: Number(row.available),
    gate: row.gate,
    viewAngleDescription: row.view_angle_description
  };
}

async function loadStandSummaries(matchId: string) {
  const stands = await query<StandRow>(
    'SELECT * FROM stands WHERE match_id = $1 ORDER BY sort_order',
    [matchId]
  );

  const aggregates = await query<StandAggregateRow>(
    `SELECT sec.stand_id,
            MIN(sec.price_cents) AS min_price_cents,
            SUM(CASE WHEN st.status = 'available' THEN 1 ELSE 0 END)::text AS available
       FROM sectors sec
       JOIN seats st ON st.sector_id = sec.id
      WHERE sec.match_id = $1
      GROUP BY sec.stand_id`,
    [matchId]
  );

  const byStand = new Map(aggregates.map((a) => [a.stand_id, a]));

  const result: Record<string, unknown> = {};
  for (const stand of stands) {
    const aggregate = byStand.get(stand.stand_id);
    const available = Number(aggregate?.available ?? 0);
    result[stand.stand_id] = {
      id: stand.stand_id,
      name: stand.name,
      category: stand.category,
      price: centsToEuros(Number(aggregate?.min_price_cents ?? 0)),
      availableSeats: available,
      isSoldOut: available === 0,
      accentColor: stand.accent_color
    };
  }
  return result;
}

function deriveStatus(row: MatchRow, available: number, total: number): string {
  if (row.status === 'coming_soon' || row.status === 'subscribers_only') {
    return row.status;
  }
  if (total === 0 || available === 0) return 'sold_out_exchange';
  const ratio = available / total;
  return ratio < 0.15 ? 'selling_fast' : 'open';
}

async function buildMatch(row: MatchRow) {
  const sectors = (await loadSectorRows(row.id)).map(mapSector);
  const totalSeats = sectors.reduce((sum, s) => sum + s.totalSeats, 0);
  const availableSeats = sectors.reduce((sum, s) => sum + s.availableSeats, 0);
  const minPrice = sectors.length ? Math.min(...sectors.map((s) => s.price)) : 0;

  return {
    id: row.id,
    opponent: row.opponent,
    opponentShort: row.opponent_short,
    opponentLogo: row.opponent_logo,
    opponentColor: row.opponent_color,
    homeTeam: row.home_team,
    competition: row.competition,
    round: row.round,
    date: row.match_date,
    formattedDate: row.formatted_date,
    time: row.kickoff,
    venue: row.venue,
    status: deriveStatus(row, availableSeats, totalSeats),
    minPrice,
    featured: Boolean(row.featured),
    bannerImage: row.banner_image ?? undefined,
    stands: await loadStandSummaries(row.id),
    availableSeats,
    totalSeats
  };
}

async function findMatchRow(id: string): Promise<MatchRow | undefined> {
  return queryOne<MatchRow>('SELECT * FROM matches WHERE id = $1', [id]);
}

catalogRouter.get(
  '/matches',
  asyncHandler(async (_req, res) => {
    await releaseExpiredHolds();
    const rows = await query<MatchRow>('SELECT * FROM matches ORDER BY match_date');
    res.json(await Promise.all(rows.map(buildMatch)));
  })
);

catalogRouter.get(
  '/matches/:id',
  asyncHandler(async (req, res) => {
    await releaseExpiredHolds();
    const row = await findMatchRow(req.params.id);
    if (!row) throw notFound('Match introuvable.');
    res.json(await buildMatch(row));
  })
);

catalogRouter.get(
  '/matches/:id/sectors',
  asyncHandler(async (req, res) => {
    await releaseExpiredHolds();
    const row = await findMatchRow(req.params.id);
    if (!row) throw notFound('Match introuvable.');
    res.json((await loadSectorRows(row.id)).map(mapSector));
  })
);

catalogRouter.get(
  '/sectors/:id/seats',
  optionalAuth,
  asyncHandler(async (req, res) => {
    await releaseExpiredHolds();
    const sector = await queryOne<{ id: string }>(
      'SELECT id FROM sectors WHERE id = $1',
      [req.params.id]
    );

    if (!sector) throw notFound('Secteur introuvable.');

    const rows = await query<SeatRow>(
      'SELECT * FROM seats WHERE sector_id = $1 ORDER BY row_num, seat_num',
      [sector.id]
    );

    const userId = req.user?.id;
    res.json(
      rows.map((seat) => {
        let status: 'available' | 'occupied' | 'resale' = 'available';
        if (seat.status === 'occupied') {
          status = 'occupied';
        } else if (seat.status === 'held' && seat.held_by !== userId) {
          status = 'occupied';
        }
        return {
          id: seat.id,
          sectorId: seat.sector_id,
          standId: seat.stand_id,
          row: seat.row_num,
          number: seat.seat_num,
          price: centsToEuros(seat.price_cents),
          status
        };
      })
    );
  })
);

catalogRouter.get(
  '/tours',
  asyncHandler(async (_req, res) => {
    const rows = await query<TourRow>('SELECT * FROM tours ORDER BY price_cents DESC');

    res.json(
      rows.map((tour) => ({
        id: tour.id,
        title: tour.title,
        subtitle: tour.subtitle,
        price: centsToEuros(tour.price_cents),
        duration: tour.duration,
        badge: tour.badge,
        image: tour.image,
        highlights: JSON.parse(tour.highlights_json) as string[],
        description: tour.description,
        availableDates: JSON.parse(tour.dates_json) as string[]
      }))
    );
  })
);
