import React from 'react';
import { Eye, MapPin } from 'lucide-react';
import { Sector, StandId } from '../types/ticketing';

export interface DigitalStand {
  id: StandId;
  label: string;
  direction: string;
  color: string;
  price: number;
  availableSeats: number;
}

interface DigitalStadiumProps {
  stands: DigitalStand[];
  sectors: Sector[];
  selectedStand: StandId | null;
  selectedSectorId: string | null;
  onSelectStand: (stand: StandId) => void;
  onSelectSector: (sector: Sector) => void;
}

function formatPrice(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

export const DigitalStadium: React.FC<DigitalStadiumProps> = ({
  stands,
  sectors,
  selectedStand,
  selectedSectorId,
  onSelectStand,
  onSelectSector
}) => {
  const stand = (id: StandId) => stands.find((item) => item.id === id)!;
  const activeSectors = sectors.filter((sector) => sector.standId === selectedStand);

  const standPath = (
    id: StandId,
    d: string,
    label: string,
    x: number,
    y: number,
    rotate = 0
  ) => {
    const item = stand(id);
    const active = selectedStand === id;
    const available = item.availableSeats > 0;
    return (
      <g
        key={id}
        role="button"
        tabIndex={available ? 0 : -1}
        aria-label={`${item.label}, ${item.availableSeats} billets disponibles, dès ${formatPrice(item.price)}`}
        aria-pressed={active}
        onClick={() => available && onSelectStand(id)}
        onKeyDown={(event) => {
          if (available && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onSelectStand(id);
          }
        }}
        className={available ? 'cursor-pointer outline-none' : 'cursor-not-allowed opacity-50'}
      >
        <path
          d={d}
          fill={item.color}
          fillOpacity={active ? 0.98 : 0.76}
          stroke={active ? '#fbbf24' : '#cbd5e1'}
          strokeWidth={active ? 4 : 1.4}
          className="transition-all duration-200 hover:brightness-125 focus-visible:stroke-amber-300"
        />
        <path d={d} fill="url(#seatRows)" opacity={active ? 0.34 : 0.5} pointerEvents="none" />
        <g transform={`translate(${x} ${y}) rotate(${rotate})`} pointerEvents="none">
          <text textAnchor="middle" fill="white" fontSize="15" fontWeight="900" fontFamily="Barlow Condensed, sans-serif" letterSpacing="1.2">
            {label}
          </text>
          <text y="17" textAnchor="middle" fill="#fff7ed" fontSize="10" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">
            {available ? `DÈS ${formatPrice(item.price)} · ${item.availableSeats} PLACES` : 'COMPLET'}
          </text>
        </g>
      </g>
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl">
      <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
            <Eye className="h-3.5 w-3.5" /> Visite numérique · vue isométrique
          </div>
          <h2 className="mt-1 font-heading text-2xl font-black uppercase sm:text-3xl">Le stade Bollaert-Delelis</h2>
          <p className="mt-1 text-xs text-white/55">Sélectionnez une tribune pour afficher ses catégories et tarifs.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold text-white/65 sm:self-auto">
          <MapPin className="h-3.5 w-3.5 text-amber-300" /> Lens · France
        </div>
      </header>

      <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_54%,#334155_0%,#0f172a_65%,#020617_100%)] px-2 py-4 sm:px-5 sm:py-6">
        <div className="pointer-events-none absolute inset-x-0 top-5 flex justify-center gap-[28%] opacity-50">
          <span className="h-28 w-1 rounded-full bg-gradient-to-b from-white/60 to-transparent blur-sm" />
          <span className="h-28 w-1 rounded-full bg-gradient-to-b from-white/60 to-transparent blur-sm" />
        </div>
        <svg
          viewBox="0 0 900 590"
          role="img"
          aria-label="Maquette numérique en perspective du stade Bollaert-Delelis. Les quatre tribunes sont sélectionnables."
          className="relative z-10 mx-auto block w-full max-w-[820px] drop-shadow-2xl"
        >
          <defs>
            <linearGradient id="bowlConcrete" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0" stopColor="#64748b" />
              <stop offset="0.45" stopColor="#334155" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="roofMetal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e2e8f0" stopOpacity=".9" />
              <stop offset=".25" stopColor="#94a3b8" stopOpacity=".7" />
              <stop offset="1" stopColor="#1e293b" stopOpacity=".95" />
            </linearGradient>
            <linearGradient id="grass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4ade80" />
              <stop offset=".55" stopColor="#16a34a" />
              <stop offset="1" stopColor="#166534" />
            </linearGradient>
            <pattern id="seatRows" width="16" height="12" patternUnits="userSpaceOnUse" patternTransform="skewX(-16)">
              <path d="M0 2H16M0 8H16" stroke="#f8fafc" strokeOpacity=".55" strokeWidth="2" />
              <path d="M4 3V6M12 9V11" stroke="#020617" strokeOpacity=".45" strokeWidth="1" />
            </pattern>
            <pattern id="turf" width="48" height="30" patternUnits="userSpaceOnUse" patternTransform="skewX(-18)">
              <rect width="24" height="30" fill="#ffffff" opacity=".08" />
            </pattern>
            <filter id="stadiumShadow" x="-20%" y="-20%" width="140%" height="160%">
              <feDropShadow dx="0" dy="18" stdDeviation="15" floodColor="#000" floodOpacity=".65" />
            </filter>
          </defs>

          <ellipse cx="450" cy="493" rx="355" ry="55" fill="#020617" opacity=".75" />
          <g filter="url(#stadiumShadow)">
            {/* Outer stadium shell and concourse */}
            <path d="M120 150 Q450 5 780 150 L837 378 Q450 580 63 378Z" fill="url(#bowlConcrete)" stroke="#94a3b8" strokeOpacity=".45" strokeWidth="3" />
            <path d="M144 169 Q450 45 756 169 L795 350 Q450 517 105 350Z" fill="#0f172a" stroke="#cbd5e1" strokeOpacity=".25" strokeWidth="2" />

            {/* Roof canopy, split into four visible tiers */}
            <path d="M110 147 Q450 0 790 147 L750 192 Q450 65 150 192Z" fill="url(#roofMetal)" stroke="#e2e8f0" strokeOpacity=".65" strokeWidth="2" />
            <path d="M78 359 Q450 548 822 359 L790 408 Q450 586 110 408Z" fill="url(#roofMetal)" stroke="#cbd5e1" strokeOpacity=".55" strokeWidth="2" />
            <path d="M105 170 L145 190 L105 357 L60 376Z" fill="url(#roofMetal)" stroke="#cbd5e1" strokeOpacity=".5" strokeWidth="2" />
            <path d="M795 170 L755 190 L795 357 L840 376Z" fill="url(#roofMetal)" stroke="#cbd5e1" strokeOpacity=".5" strokeWidth="2" />

            {/* Exterior roof ribs */}
            {Array.from({ length: 13 }, (_, index) => {
              const t = index / 12;
              const x = 120 + t * 660;
              const topY = 145 - Math.sin(t * Math.PI) * 72;
              const bottomY = 355 + Math.sin(t * Math.PI) * 112;
              return <g key={index} opacity=".42"><path d={`M${x} ${topY} L${x - 33 + t * 66} ${topY + 53}`} stroke="#f8fafc" strokeWidth="2" /><path d={`M${x} ${bottomY} L${x - 33 + t * 66} ${bottomY - 46}`} stroke="#f8fafc" strokeWidth="2" /></g>;
            })}

            {/* Stand facades are clickable areas */}
            {standPath('DELACOURT', 'M220 112 Q450 42 680 112 L650 227 Q450 177 250 227Z', 'DELACOURT · NORD', 450, 139)}
            {standPath('TRANNIN', 'M250 370 Q450 421 650 370 L690 470 Q450 545 210 470Z', 'TRANNIN · SUD', 450, 439)}
            {standPath('LEPAGNOT', 'M112 197 L242 231 L216 385 L92 350Z', 'LEPAGNOT · OUEST', 171, 294, -76)}
            {standPath('MAREK_XERCES', 'M658 231 L788 197 L808 350 L684 385Z', 'MAREK / XERCÈS · EST', 730, 294, 76)}

            {/* Pitch, with perspective markings */}
            <path d="M267 231 L633 231 L674 376 L226 376Z" fill="url(#grass)" stroke="#dcfce7" strokeWidth="3" />
            <path d="M267 231 L633 231 L674 376 L226 376Z" fill="url(#turf)" />
            <path d="M267 231 L633 231 L674 376 L226 376Z" fill="none" stroke="#fff" strokeWidth="2" />
            <path d="M450 231 L450 376" stroke="#fff" strokeWidth="2" />
            <ellipse cx="450" cy="303" rx="43" ry="34" fill="none" stroke="#fff" strokeWidth="2" />
            <ellipse cx="450" cy="303" rx="3" ry="2.5" fill="#fff" />
            <path d="M267 267 L318 267 L328 340 L247 340Z M633 267 L582 267 L572 340 L653 340Z" fill="none" stroke="#fff" strokeWidth="2" />
            <path d="M267 281 L295 281 L302 326 L257 326Z M633 281 L605 281 L598 326 L643 326Z" fill="none" stroke="#fff" strokeWidth="2" />
            <path d="M318 279 Q342 303 321 328 M582 279 Q558 303 579 328" fill="none" stroke="#fff" strokeWidth="2" />
            <text x="450" y="309" textAnchor="middle" fill="#fff" fillOpacity=".25" fontFamily="Barlow Condensed, sans-serif" fontSize="22" fontWeight="900" letterSpacing="5">RC LENS</text>

            {/* Roof edge lights */}
            {[180, 300, 420, 540, 660, 720].map((x) => (
              <g key={x} opacity=".9"><circle cx={x} cy={90 + Math.abs(450 - x) * .07} r="4" fill="#fff7ed" /><circle cx={x} cy={90 + Math.abs(450 - x) * .07} r="13" fill="#fef3c7" opacity=".16" /></g>
            ))}
          </g>
        </svg>
      </div>

      <div className="grid gap-2 border-t border-white/10 bg-slate-900/90 p-3 sm:grid-cols-2 sm:p-4">
        {stands.map((item) => {
          const active = selectedStand === item.id;
          const available = item.availableSeats > 0;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!available}
              onClick={() => onSelectStand(item.id)}
              className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${active ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'} disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="min-w-0"><span className="block truncate text-xs font-bold text-white">{item.label}</span><span className="block text-[10px] text-white/50">{item.direction} · {available ? `${item.availableSeats} places` : 'complet'}</span></span>
              </span>
              <span className="shrink-0 text-right"><span className="block text-[9px] uppercase text-white/40">Dès</span><span className="text-xs font-black text-amber-300">{formatPrice(item.price)}</span></span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-white/10 px-4 py-4 sm:px-5">
        {selectedStand ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-heading text-lg font-black uppercase">Catégories · {stand(selectedStand).label}</h3>
              <span className="text-[10px] text-white/45">Sélectionnez une catégorie pour la retrouver dans le récapitulatif</span>
            </div>
            {activeSectors.length ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {activeSectors.map((sector) => (
                  <button key={sector.id} type="button" onClick={() => onSelectSector(sector)} className={`min-w-[150px] rounded-xl border px-3 py-2 text-left transition ${selectedSectorId === sector.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}>
                    <span className="block truncate text-xs font-bold text-white">{sector.name}</span>
                    <span className="mt-1 block text-[10px] text-white/50">{sector.availableSeats} places disponibles</span>
                    <span className="mt-1 block text-sm font-black text-amber-300">{formatPrice(sector.price)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-white/50">Aucune catégorie ouverte dans cette tribune.</p>
            )}
          </>
        ) : (
          <p className="text-center text-xs text-white/50">Cliquez sur l’une des tribunes colorées pour explorer les tarifs et catégories.</p>
        )}
      </div>
    </section>
  );
};
