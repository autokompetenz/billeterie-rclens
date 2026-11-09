import React, { useState } from 'react';
import { StandId, Sector, Match } from '../types/ticketing';
import { Eye, ChevronRight } from 'lucide-react';

interface StadiumMapProps {
  match: Match;
  sectors: Sector[];
  selectedStand: StandId | null;
  onSelectStand: (standId: StandId) => void;
  selectedSector: Sector | null;
  onSelectSector: (sector: Sector) => void;
  onPreviewPitch: (standId: StandId) => void;
}

export const StadiumMap: React.FC<StadiumMapProps> = ({
  match,
  sectors,
  selectedStand,
  onSelectStand,
  selectedSector,
  onSelectSector,
  onPreviewPitch
}) => {
  const [hoveredStand, setHoveredStand] = useState<StandId | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'map' | 'list'>('map');

  const standsConfig: Record<
    StandId,
    { label: string; sub: string; orientation: string; color: string; hoverColor: string }
  > = {
    DELACOURT: {
      label: 'Tribune Delacourt',
      sub: 'Nord · But Nord · Niveaux 0 & 1',
      orientation: 'NORD',
      color: '#059669',
      hoverColor: '#10b981'
    },
    TRANNIN: {
      label: 'Tribune Trannin',
      sub: 'Sud · But Sud · Niveaux 0 & 1',
      orientation: 'SUD',
      color: '#2563eb',
      hoverColor: '#3b82f6'
    },
    MAREK_XERCES: {
      label: 'Tribune Marek / Xercès',
      sub: 'Est · Kop Sang & Or · Latérale',
      orientation: 'EST',
      color: '#dc2626',
      hoverColor: '#ef4444'
    },
    LEPAGNOT: {
      label: 'Tribune Lepagnot',
      sub: 'Ouest · Honneur & Loges · Famille',
      orientation: 'OUEST',
      color: '#d97706',
      hoverColor: '#f59e0b'
    }
  };

  const getStandAvailability = (id: StandId) => {
    return match.stands[id];
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors duration-200">
      {/* Header bar with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-amber-400 uppercase tracking-widest">
            <span>Stade Bollaert-Delelis</span>
            <span>·</span>
            <span>Plan Officiel 38 223 Places</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 dark:text-white mt-1 uppercase tracking-tight">
            Choisissez votre tribune
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cliquez sur une tribune pour afficher les blocs et sélectionner vos sièges numérotés.
          </p>
        </div>

        {/* View mode toggle (Map vs Sector List) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveViewMode('map')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeViewMode === 'map'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Plan du Stade
          </button>
          <button
            onClick={() => setActiveViewMode('list')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeViewMode === 'list'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Liste des Blocs ({sectors.length})
          </button>
        </div>
      </div>

      {activeViewMode === 'map' ? (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Interactive SVG Stadium Viewport */}
          <div className="lg:col-span-8 flex flex-col items-center">
            {/* North marker */}
            <div className="text-[11px] font-mono tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1.5">
              <span>▲</span> NORD · TRIBUNE DELACOURT
            </div>

            <div className="relative w-full max-w-[560px] aspect-[4/3] bg-slate-100 dark:bg-slate-950 rounded-xl p-2 sm:p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-inner overflow-hidden">
              {/* Dynamic floating tooltip on hover */}
              {hoveredStand && (
                <div className="absolute top-4 sm:top-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-amber-400/80 px-3.5 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs text-white animate-in fade-in zoom-in-95 duration-150">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: standsConfig[hoveredStand].color }}
                  />
                  <span className="font-heading font-extrabold uppercase text-amber-300">
                    {standsConfig[hoveredStand].label}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono font-bold text-white">
                    Dès {match.stands[hoveredStand].price} €
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-emerald-400 font-semibold">
                    {match.stands[hoveredStand].availableSeats} places
                  </span>
                </div>
              )}

              <svg
                viewBox="0 0 600 480"
                className="w-full h-full select-none"
                style={{ filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.25))' }}
              >
                <defs>
                  {/* Pitch grass pattern */}
                  <pattern id="turfPattern" width="60" height="20" patternUnits="userSpaceOnUse">
                    <rect width="60" height="10" fill="#15803d" />
                    <rect y="10" width="60" height="10" fill="#166534" />
                  </pattern>

                  {/* Tribunes metallic texture */}
                  <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                </defs>

                {/* Outer Stadium Concrete Perimeter */}
                <rect
                  x="15"
                  y="15"
                  width="570"
                  height="450"
                  rx="8"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="2"
                />

                {/* English-style Corner pylons / structural trusses */}
                <line x1="15" y1="15" x2="120" y2="100" stroke="#475569" strokeWidth="2" strokeDasharray="4 2" />
                <line x1="585" y1="15" x2="480" y2="100" stroke="#475569" strokeWidth="2" strokeDasharray="4 2" />
                <line x1="15" y1="465" x2="120" y2="380" stroke="#475569" strokeWidth="2" strokeDasharray="4 2" />
                <line x1="585" y1="465" x2="480" y2="380" stroke="#475569" strokeWidth="2" strokeDasharray="4 2" />

                {/* 1. NORTH STAND: TRIBUNE DELACOURT */}
                <g
                  onClick={() => onSelectStand('DELACOURT')}
                  onMouseEnter={() => setHoveredStand('DELACOURT')}
                  onMouseLeave={() => setHoveredStand(null)}
                  className="cursor-pointer transition-all duration-200"
                >
                  <path
                    d="M 125 35 L 475 35 L 455 105 L 145 105 Z"
                    fill={
                      selectedStand === 'DELACOURT'
                        ? '#059669'
                        : hoveredStand === 'DELACOURT'
                        ? '#10b981'
                        : '#064e3b'
                    }
                    stroke={selectedStand === 'DELACOURT' ? '#34d399' : '#047857'}
                    strokeWidth={selectedStand === 'DELACOURT' ? '3' : '1.5'}
                  />
                  <line x1="135" y1="70" x2="465" y2="70" stroke="#022c22" strokeWidth="1" strokeDasharray="3 3" />
                  <text
                    x="300"
                    y="60"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13"
                    fontWeight="800"
                    fontFamily="Barlow Condensed, sans-serif"
                    letterSpacing="1px"
                  >
                    TRIBUNE DELACOURT (NORD)
                  </text>
                  <text
                    x="300"
                    y="88"
                    textAnchor="middle"
                    fill="#a7f3d0"
                    fontSize="11"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontWeight="600"
                  >
                    Dès {match.stands.DELACOURT.price} € · {match.stands.DELACOURT.isSoldOut ? 'COMPLET' : `${match.stands.DELACOURT.availableSeats} places`}
                  </text>
                </g>

                {/* 2. SOUTH STAND: TRIBUNE TRANNIN */}
                <g
                  onClick={() => onSelectStand('TRANNIN')}
                  onMouseEnter={() => setHoveredStand('TRANNIN')}
                  onMouseLeave={() => setHoveredStand(null)}
                  className="cursor-pointer transition-all duration-200"
                >
                  <path
                    d="M 145 375 L 455 375 L 475 445 L 125 445 Z"
                    fill={
                      selectedStand === 'TRANNIN'
                        ? '#2563eb'
                        : hoveredStand === 'TRANNIN'
                        ? '#3b82f6'
                        : '#1e3a8a'
                    }
                    stroke={selectedStand === 'TRANNIN' ? '#60a5fa' : '#1d4ed8'}
                    strokeWidth={selectedStand === 'TRANNIN' ? '3' : '1.5'}
                  />
                  <line x1="135" y1="410" x2="465" y2="410" stroke="#0f172a" strokeWidth="1" strokeDasharray="3 3" />
                  <text
                    x="300"
                    y="405"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13"
                    fontWeight="800"
                    fontFamily="Barlow Condensed, sans-serif"
                    letterSpacing="1px"
                  >
                    TRIBUNE TRANNIN (SUD)
                  </text>
                  <text
                    x="300"
                    y="432"
                    textAnchor="middle"
                    fill="#bfdbfe"
                    fontSize="11"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontWeight="600"
                  >
                    Dès {match.stands.TRANNIN.price} € · {match.stands.TRANNIN.isSoldOut ? 'COMPLET' : `${match.stands.TRANNIN.availableSeats} places`}
                  </text>
                </g>

                {/* 3. WEST STAND: TRIBUNE LEPAGNOT */}
                <g
                  onClick={() => onSelectStand('LEPAGNOT')}
                  onMouseEnter={() => setHoveredStand('LEPAGNOT')}
                  onMouseLeave={() => setHoveredStand(null)}
                  className="cursor-pointer transition-all duration-200"
                >
                  <path
                    d="M 35 115 L 115 130 L 115 350 L 35 365 Z"
                    fill={
                      selectedStand === 'LEPAGNOT'
                        ? '#d97706'
                        : hoveredStand === 'LEPAGNOT'
                        ? '#f59e0b'
                        : '#78350f'
                    }
                    stroke={selectedStand === 'LEPAGNOT' ? '#fbbf24' : '#b45309'}
                    strokeWidth={selectedStand === 'LEPAGNOT' ? '3' : '1.5'}
                  />
                  <g transform="translate(68, 240) rotate(-90)">
                    <text
                      x="0"
                      y="-4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="13"
                      fontWeight="800"
                      fontFamily="Barlow Condensed, sans-serif"
                      letterSpacing="1px"
                    >
                      LEPAGNOT (HONNEUR)
                    </text>
                    <text
                      x="0"
                      y="14"
                      textAnchor="middle"
                      fill="#fde68a"
                      fontSize="10"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                      fontWeight="600"
                    >
                      Dès {match.stands.LEPAGNOT.price} €
                    </text>
                  </g>
                </g>

                {/* 4. EAST STAND: TRIBUNE MAREK / XERCÈS (KOP) */}
                <g
                  onClick={() => onSelectStand('MAREK_XERCES')}
                  onMouseEnter={() => setHoveredStand('MAREK_XERCES')}
                  onMouseLeave={() => setHoveredStand(null)}
                  className="cursor-pointer transition-all duration-200"
                >
                  <path
                    d="M 485 130 L 565 115 L 565 365 L 485 350 Z"
                    fill={
                      selectedStand === 'MAREK_XERCES'
                        ? '#dc2626'
                        : hoveredStand === 'MAREK_XERCES'
                        ? '#ef4444'
                        : '#7f1d1d'
                    }
                    stroke={selectedStand === 'MAREK_XERCES' ? '#f87171' : '#b91c1c'}
                    strokeWidth={selectedStand === 'MAREK_XERCES' ? '3' : '1.5'}
                  />
                  <g transform="translate(532, 240) rotate(90)">
                    <text
                      x="0"
                      y="-4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="13"
                      fontWeight="800"
                      fontFamily="Barlow Condensed, sans-serif"
                      letterSpacing="1px"
                    >
                      MAREK / XERCÈS (KOP)
                    </text>
                    <text
                      x="0"
                      y="14"
                      textAnchor="middle"
                      fill="#fecaca"
                      fontSize="10"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                      fontWeight="600"
                    >
                      Dès {match.stands.MAREK_XERCES.price} €
                    </text>
                  </g>
                </g>

                {/* THE LAWN / FOOTBALL PITCH (PELOUSE BOLLAERT) */}
                <g>
                  <rect
                    x="135"
                    y="125"
                    width="330"
                    height="230"
                    fill="url(#turfPattern)"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    rx="3"
                  />
                  <line x1="300" y1="125" x2="300" y2="355" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="300" cy="240" r="35" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="300" cy="240" r="2" fill="#ffffff" />
                  <rect x="135" y="175" width="45" height="130" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  <rect x="135" y="205" width="18" height="70" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  <path d="M 180 220 A 25 25 0 0 1 180 260" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="165" cy="240" r="1.5" fill="#ffffff" />
                  <rect x="420" y="175" width="45" height="130" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  <rect x="447" y="205" width="18" height="70" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  <path d="M 420 220 A 25 25 0 0 0 420 260" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="435" cy="240" r="1.5" fill="#ffffff" />
                  <path d="M 135 133 A 8 8 0 0 0 143 125" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  <path d="M 135 347 A 8 8 0 0 1 143 355" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  <path d="M 465 133 A 8 8 0 0 1 457 125" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  <path d="M 465 347 A 8 8 0 0 0 457 355" fill="none" stroke="#ffffff" strokeWidth="1.5" />

                  <text
                    x="300"
                    y="244"
                    textAnchor="middle"
                    fill="rgba(255, 255, 255, 0.3)"
                    fontSize="18"
                    fontWeight="900"
                    fontFamily="Barlow Condensed, sans-serif"
                    letterSpacing="2px"
                  >
                    RC LENS
                  </text>
                </g>
              </svg>
            </div>

            {/* South marker */}
            <div className="text-[11px] font-mono tracking-widest text-slate-500 uppercase mt-2 flex items-center gap-1.5">
              <span>▼</span> SUD · TRIBUNE TRANNIN
            </div>
          </div>

          {/* Stand Quick Info / Selection Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sélectionnez une tribune
            </span>

            {(Object.keys(standsConfig) as StandId[]).map((standKey) => {
              const cfg = standsConfig[standKey];
              const summary = getStandAvailability(standKey);
              const isSelected = selectedStand === standKey;

              return (
                <div
                  key={standKey}
                  onClick={() => onSelectStand(standKey)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-slate-800 border-amber-500 dark:border-amber-400 shadow-md ring-1 ring-amber-400/30'
                      : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-lg font-bold text-slate-900 dark:text-white uppercase group-hover:text-red-700 dark:group-hover:text-amber-400 transition-colors">
                          {cfg.label}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {cfg.orientation}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{cfg.sub}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="font-semibold text-red-700 dark:text-amber-400 font-mono">
                          Dès {summary.price} €
                        </span>
                        <span className="text-slate-400 dark:text-slate-600">·</span>
                        {summary.isSoldOut ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">Guichet fermé</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {summary.availableSeats} places dispo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewPitch(standKey);
                      }}
                      title="Aperçu vue pelouse"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <ChevronRight
                      className={`w-5 h-5 transition-transform ${
                        isSelected ? 'text-amber-500 translate-x-1' : 'text-slate-400 dark:text-slate-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Sector Grid View */
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectors.map((sec) => {
            const isSelected = selectedSector?.id === sec.id;
            return (
              <div
                key={sec.id}
                onClick={() => {
                  onSelectStand(sec.standId);
                  onSelectSector(sec);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50 dark:bg-slate-800 border-amber-500 dark:border-amber-400 shadow-md ring-1 ring-amber-400/20'
                    : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      {sec.code}
                    </span>
                    <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white uppercase mt-2">
                      {sec.name}
                    </h3>
                  </div>
                  <span className="text-sm font-mono font-bold text-red-700 dark:text-amber-400">
                    {sec.price} €
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                  {sec.viewAngleDescription}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Accès : {sec.gate}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {sec.availableSeats} places
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected stand bottom bar with direct sector selector */}
      {selectedStand && (
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/90 dark:bg-slate-950/90 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-6 rounded-b-2xl">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: standsConfig[selectedStand].color }}
            />
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Tribune active
              </div>
              <div className="font-heading text-xl font-bold text-slate-900 dark:text-white uppercase">
                {standsConfig[selectedStand].label}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onPreviewPitch(selectedStand)}
              className="px-3 py-2 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-red-600 dark:text-amber-400" />
              Vue depuis la tribune
            </button>

            {/* List of sectors in this stand */}
            <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
              {sectors
                .filter((s) => s.standId === selectedStand)
                .map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => onSelectSector(sec)}
                    className={`px-3 py-2 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      selectedSector?.id === sec.id
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-white hover:bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/60'
                    }`}
                  >
                    {sec.code} · {sec.price}€
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
