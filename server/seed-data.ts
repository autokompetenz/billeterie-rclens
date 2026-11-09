/**
 * Données de référence de la billetterie RC Lens.
 * Utilisées uniquement pour amorcer la base PostgreSQL au premier démarrage.
 */

export type StandId = 'MAREK_XERCES' | 'LEPAGNOT' | 'DELACOURT' | 'TRANNIN';

export interface SeedMatch {
  id: string;
  opponent: string;
  opponentShort: string;
  opponentLogo: string;
  opponentColor: string;
  competition: string;
  round: string;
  date: string;
  formattedDate: string;
  time: string;
  venue: string;
  status: string;
  featured: boolean;
  bannerImage?: string;
  /** Coefficient appliqué aux tarifs de référence des secteurs. */
  priceFactor: number;
  /** Taux d'occupation simulé des sièges (0 à 1). */
  occupancy: number;
}

export const SEED_MATCHES: SeedMatch[] = [
  {
    id: 'rcl-om-2026',
    opponent: 'Olympique de Marseille',
    opponentShort: 'OM',
    opponentLogo:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100&auto=format&fit=crop&q=60',
    opponentColor: '#009fe3',
    competition: 'Ligue 1',
    round: '28ème Journée',
    date: '2026-11-21',
    formattedDate: 'Samedi 21 Novembre 2026',
    time: '21:00',
    venue: 'Stade Bollaert-Delelis, Lens',
    status: 'selling_fast',
    featured: true,
    bannerImage: '/images/hero_bollaert_atmosphere_1794048534296.jpg',
    priceFactor: 1,
    occupancy: 0.9
  },
  {
    id: 'rcl-losc-2026',
    opponent: 'LOSC Lille',
    opponentShort: 'LOSC',
    opponentLogo:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=100&auto=format&fit=crop&q=60',
    opponentColor: '#D71920',
    competition: 'Ligue 1',
    round: '30ème Journée - Le Derby du Nord',
    date: '2026-12-05',
    formattedDate: 'Samedi 5 Décembre 2026',
    time: '17:00',
    venue: 'Stade Bollaert-Delelis, Lens',
    status: 'sold_out_exchange',
    featured: true,
    bannerImage: '/images/match_derby_action_1794048535712.jpg',
    priceFactor: 1.15,
    occupancy: 1
  },
  {
    id: 'rcl-psg-2026',
    opponent: 'Paris Saint-Germain',
    opponentShort: 'PSG',
    opponentLogo:
      'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=100&auto=format&fit=crop&q=60',
    opponentColor: '#001C44',
    competition: 'Ligue 1',
    round: '32ème Journée',
    date: '2026-12-19',
    formattedDate: 'Samedi 19 Décembre 2026',
    time: '21:00',
    venue: 'Stade Bollaert-Delelis, Lens',
    status: 'subscribers_only',
    featured: false,
    bannerImage: '/images/stadium_pitch_aerial_1794048534631.jpg',
    priceFactor: 1.25,
    occupancy: 0.55
  },
  {
    id: 'rcl-ol-2027',
    opponent: 'Olympique Lyonnais',
    opponentShort: 'OL',
    opponentLogo:
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=100&auto=format&fit=crop&q=60',
    opponentColor: '#14387F',
    competition: 'Ligue 1',
    round: '34ème Journée',
    date: '2027-01-16',
    formattedDate: 'Samedi 16 Janvier 2027',
    time: '20:45',
    venue: 'Stade Bollaert-Delelis, Lens',
    status: 'open',
    featured: false,
    priceFactor: 0.95,
    occupancy: 0.3
  },
  {
    id: 'rcl-rennes-2027',
    opponent: 'Stade Rennais FC',
    opponentShort: 'SRFC',
    opponentLogo:
      'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=100&auto=format&fit=crop&q=60',
    opponentColor: '#E2001A',
    competition: 'Coupe de France',
    round: '1/8ème de finale',
    date: '2027-02-06',
    formattedDate: 'Samedi 6 Février 2027',
    time: '20:30',
    venue: 'Stade Bollaert-Delelis, Lens',
    status: 'open',
    featured: false,
    priceFactor: 0.85,
    occupancy: 0.25
  }
];

export interface SeedStand {
  id: StandId;
  name: string;
  category: string;
  accentColor: string;
  sortOrder: number;
}

export const SEED_STANDS: SeedStand[] = [
  {
    id: 'MAREK_XERCES',
    name: 'Tribune Marek / Xercès',
    category: 'Est · Kop Sang & Or',
    accentColor: '#C8102E',
    sortOrder: 1
  },
  {
    id: 'LEPAGNOT',
    name: 'Tribune Lepagnot',
    category: 'Ouest · Honneur & Prestige',
    accentColor: '#FED100',
    sortOrder: 2
  },
  {
    id: 'DELACOURT',
    name: 'Tribune Delacourt',
    category: 'Nord · Famille',
    accentColor: '#10B981',
    sortOrder: 3
  },
  {
    id: 'TRANNIN',
    name: 'Tribune Trannin',
    category: 'Sud · Ambiance',
    accentColor: '#3B82F6',
    sortOrder: 4
  }
];

export interface SeedSector {
  id: string;
  standId: StandId;
  name: string;
  code: string;
  category: number;
  categoryName: string;
  /** Tarif plein de référence en euros (match à coefficient 1). */
  price: number;
  reducedPrice: number;
  gate: string;
  viewAngleDescription: string;
  sortOrder: number;
}

export const SEED_SECTORS: SeedSector[] = [
  {
    id: 'sec-marek-centrale',
    standId: 'MAREK_XERCES',
    name: 'Marek Centrale (Debout Kop)',
    code: 'MK-CTR',
    category: 3,
    categoryName: 'Catégorie 3 - Cœur des Supporters',
    price: 29,
    reducedPrice: 22,
    gate: 'Porte 5 & 6',
    viewAngleDescription:
      'Au ras de la pelouse, vue latérale médiane, cœur battant de Bollaert',
    sortOrder: 1
  },
  {
    id: 'sec-xerces-centrale',
    standId: 'MAREK_XERCES',
    name: 'Xercès Centrale Haute',
    code: 'XR-CTR',
    category: 2,
    categoryName: 'Catégorie 2 - Latérale Haute',
    price: 36,
    reducedPrice: 28,
    gate: 'Porte 7 & 8',
    viewAngleDescription:
      "Vue plongeante panoramique sur l'ensemble du terrain et le banc de touche",
    sortOrder: 2
  },
  {
    id: 'sec-xerces-lat-est',
    standId: 'MAREK_XERCES',
    name: 'Xercès Latérale Est',
    code: 'XR-EST',
    category: 3,
    categoryName: 'Catégorie 3',
    price: 30,
    reducedPrice: 24,
    gate: 'Porte 8',
    viewAngleDescription:
      'Vue latérale avec perspective vers le but Nord (Delacourt)',
    sortOrder: 3
  },
  {
    id: 'sec-lepagnot-honneur',
    standId: 'LEPAGNOT',
    name: 'Lepagnot Honneur Centrale',
    code: 'LP-HN',
    category: 1,
    categoryName: 'Catégorie 1 - Prestige',
    price: 49,
    reducedPrice: 39,
    gate: 'Porte 1 (VIP & Honneur)',
    viewAngleDescription:
      'Sièges rembourrés au centre du terrain, sortie des joueurs en face',
    sortOrder: 4
  },
  {
    id: 'sec-lepagnot-premiere',
    standId: 'LEPAGNOT',
    name: 'Lepagnot 1ère Série',
    code: 'LP-1',
    category: 2,
    categoryName: 'Catégorie 2',
    price: 42,
    reducedPrice: 32,
    gate: 'Porte 2 & 3',
    viewAngleDescription:
      'Excellente visibilité latérale, proche de la ligne de touche',
    sortOrder: 5
  },
  {
    id: 'sec-lepagnot-famille',
    standId: 'LEPAGNOT',
    name: 'Lepagnot Tribune Famille',
    code: 'LP-FAM',
    category: 3,
    categoryName: 'Catégorie 3 - Espace Famille',
    price: 34,
    reducedPrice: 25,
    gate: 'Porte 4',
    viewAngleDescription:
      'Ambiance calme et conviviale adaptée aux enfants et familles',
    sortOrder: 6
  },
  {
    id: 'sec-delacourt-niv0',
    standId: 'DELACOURT',
    name: 'Delacourt Niveau 0 (Basse)',
    code: 'DL-0',
    category: 4,
    categoryName: 'Catégorie 4 - But Nord',
    price: 24,
    reducedPrice: 18,
    gate: 'Porte 11 & 12',
    viewAngleDescription:
      "Juste derrière les filets du but Nord, immersion totale dans l'action",
    sortOrder: 7
  },
  {
    id: 'sec-delacourt-niv1',
    standId: 'DELACOURT',
    name: 'Delacourt Niveau 1 (Haute)',
    code: 'DL-1',
    category: 4,
    categoryName: 'Catégorie 4',
    price: 24,
    reducedPrice: 18,
    gate: 'Porte 13 & 14',
    viewAngleDescription:
      "Vue d'ensemble sur le plan de jeu tactique depuis l'angle Nord",
    sortOrder: 8
  },
  {
    id: 'sec-trannin-niv0',
    standId: 'TRANNIN',
    name: 'Trannin Niveau 0 (Basse)',
    code: 'TR-0',
    category: 4,
    categoryName: 'Catégorie 4 - But Sud',
    price: 24,
    reducedPrice: 18,
    gate: 'Porte 16 & 17',
    viewAngleDescription:
      'Derrière le but Sud, chants continus et ambiance Sang et Or',
    sortOrder: 9
  },
  {
    id: 'sec-trannin-niv1',
    standId: 'TRANNIN',
    name: 'Trannin Niveau 1 (Haute)',
    code: 'TR-1',
    category: 5,
    categoryName: 'Catégorie 5',
    price: 22,
    reducedPrice: 16,
    gate: 'Porte 18 & 19',
    viewAngleDescription:
      'Vue surplombante sur la ligne de surface adverse',
    sortOrder: 10
  }
];

export interface SeedTour {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  duration: string;
  badge: string;
  image: string;
  highlights: string[];
  description: string;
  dates: string[];
}

export const SEED_TOURS: SeedTour[] = [
  {
    id: 'tour-coulisses',
    title: 'Visite des Coulisses de Bollaert',
    subtitle: 'Accès exclusif aux espaces secrets du Stade',
    price: 15,
    duration: '1h30',
    badge: 'Le Plus Populaire',
    image: '/images/stadium_pitch_aerial_1794048534631.jpg',
    highlights: [
      "Vestiaires officiels de l'équipe première du RC Lens",
      "Tunnel d'entrée des joueurs au son de l'hymne",
      'Banc de touche au bord de la pelouse mythique',
      'Salle de conférence de presse et zone mixte'
    ],
    description:
      "Pénétrez dans l'intimité des Sang et Or. Accompagné d'un guide officiel passionné, découvrez l'histoire centenaire du club et marchez dans les pas de vos idoles.",
    dates: [
      'Mercredi 18 Novembre 2026 - 14h30',
      'Samedi 21 Novembre 2026 - 10h00',
      'Mercredi 25 Novembre 2026 - 15h00',
      'Samedi 28 Novembre 2026 - 11h00'
    ]
  },
  {
    id: 'tour-vip-matchday',
    title: 'Expérience Matchday VIP Bollaert',
    subtitle: "Immersion jour de match avant le coup d'envoi",
    price: 129,
    duration: '3h30',
    badge: 'Expérience Prestige',
    image: '/images/hero_bollaert_atmosphere_1794048534296.jpg',
    highlights: [
      'Arrivée officielle du bus des joueurs Sang et Or',
      'Échauffement au plus près de la pelouse (bord terrain)',
      'Cocktail dînatoire au Salon Club Honneur',
      'Cadeau collector exclusif numéroté'
    ],
    description:
      "Vivez l'avant-match comme un invité privilégié du club. Respirez la ferveur des Corons quelques heures avant le coup d'envoi.",
    dates: [
      'Samedi 21 Novembre 2026 - 17h00 (Avant Lens-Marseille)',
      'Dimanche 6 Décembre 2026 - 18h00 (Avant Lens-PSG)',
      'Samedi 10 Janvier 2027 - 17h30 (Avant Derby du Nord)'
    ]
  },
  {
    id: 'tour-famille-lensoise',
    title: 'Parcours En Famille & Juniors',
    subtitle: 'Visite ludique avec quiz et cadeaux pour les enfants',
    price: 10,
    duration: '1h15',
    badge: 'Spécial Familles',
    image: '/images/match_derby_action_1794048535712.jpg',
    highlights: [
      'Photo souvenir officielle avec la mascotte Galopin',
      "Tir au but sur mini-cage en salle d'échauffement",
      'Diplôme officiel du jeune supporter lensois',
      'Livret de jeux historique et goûter offert'
    ],
    description:
      'Une expérience inoubliable pour les supporters en herbe. Des anecdotes passionnantes adaptées aux petits et grands.',
    dates: [
      'Mercredi 18 Novembre 2026 - 10h30',
      'Mercredi 25 Novembre 2026 - 10h30',
      'Samedi 28 Novembre 2026 - 14h00'
    ]
  }
];

/** Tarifs des options de commande, en centimes. */
export const ADDON_PRICES = {
  insurancePerTicket: 250,
  scarf: 1800,
  parking: 1000
} as const;

/** Codes promotionnels acceptés par le serveur. */
export const PROMO_CODES: Record<
  string,
  { type: 'percent' | 'fixed'; value: number }
> = {
  LENSOIS10: { type: 'percent', value: 10 },
  CORONS: { type: 'fixed', value: 1500 }
};
