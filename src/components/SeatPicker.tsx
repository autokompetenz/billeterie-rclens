import React, { useState } from 'react';
import { Sector, Seat, CartItem, Match, TariffType } from '../types/ticketing';
import { Check, ShoppingBag, X, Loader2, AlertCircle } from 'lucide-react';

interface SeatPickerProps {
  match: Match;
  sector: Sector;
  seats: Seat[];
  onClose: () => void;
  onAddToCart: (items: Omit<CartItem, 'id'>[]) => Promise<void> | void;
}

export const SeatPicker: React.FC<SeatPickerProps> = ({
  match,
  sector,
  seats,
  onClose,
  onAddToCart
}) => {
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedTariff, setSelectedTariff] = useState<TariffType>('full');
  const [autoSeatsCount, setAutoSeatsCount] = useState<number>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSeat = (seat: Seat) => {
    if (seat.status === 'occupied') return;

    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.id));
    } else {
      if (selectedSeatIds.length >= 6) {
        alert('Limite maximale : 6 places par commande pour ce match.');
        return;
      }
      setSelectedSeatIds((prev) => [...prev, seat.id]);
    }
  };

  const getPriceForTariff = (basePrice: number, tariff: TariffType) => {
    if (tariff === 'u16') return Math.round(basePrice * 0.75 * 100) / 100;
    if (tariff === 'student') return Math.round(basePrice * 0.85 * 100) / 100;
    return basePrice;
  };

  const currentPricePerSeat = getPriceForTariff(sector.price, selectedTariff);
  const totalPrice = currentPricePerSeat * selectedSeatIds.length;

  // Auto-selection of consecutive seats
  const handleAutoSelect = () => {
    const availableSeats = seats.filter((s) => s.status === 'available');
    const rowMap: Record<number, Seat[]> = {};
    availableSeats.forEach((s) => {
      if (!rowMap[s.row]) rowMap[s.row] = [];
      rowMap[s.row].push(s);
    });

    for (const rowNum of Object.keys(rowMap).map(Number)) {
      const rowSeats = rowMap[rowNum].sort((a, b) => a.number - b.number);
      for (let i = 0; i <= rowSeats.length - autoSeatsCount; i++) {
        let consecutive = true;
        for (let j = 0; j < autoSeatsCount - 1; j++) {
          if (rowSeats[i + j + 1].number !== rowSeats[i + j].number + 1) {
            consecutive = false;
            break;
          }
        }
        if (consecutive) {
          const chosen = rowSeats.slice(i, i + autoSeatsCount).map((s) => s.id);
          setSelectedSeatIds(chosen);
          return;
        }
      }
    }

    // Fallback: pick any available seats
    setSelectedSeatIds(availableSeats.slice(0, autoSeatsCount).map((s) => s.id));
  };

  const handleConfirmSelection = async () => {
    if (selectedSeatIds.length === 0 || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    const chosenSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
    const itemsToAdd: Omit<CartItem, 'id'>[] = chosenSeats.map((seat) => ({
      matchId: match.id,
      match,
      standId: sector.standId,
      standName:
        sector.standId === 'MAREK_XERCES'
          ? 'Tribune Marek / Xercès'
          : sector.standId === 'LEPAGNOT'
          ? 'Tribune Lepagnot'
          : sector.standId === 'DELACOURT'
          ? 'Tribune Delacourt'
          : 'Tribune Trannin',
      sectorId: sector.id,
      sectorName: sector.name,
      categoryName: sector.categoryName,
      row: seat.row,
      seatNumber: seat.number,
      tariff: selectedTariff,
      price: getPriceForTariff(sector.price, selectedTariff),
      basePrice: sector.price,
      beneficiary: { firstName: '', lastName: '', email: '' },
      gate: sector.gate,
      isResale: seat.status === 'resale',
      seatId: seat.id
    }));

    try {
      await onAddToCart(itemsToAdd);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de bloquer ces places.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group seats by row for display
  const rows = Array.from(new Set(seats.map((s) => s.row))).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white transition-colors duration-200">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-red-700 dark:text-amber-400 uppercase">
                {sector.code}
              </span>
              <span className="text-slate-400 dark:text-slate-600">·</span>
              <span className="text-xs text-slate-600 dark:text-slate-400">{sector.categoryName}</span>
            </div>
            <h2 className="text-base sm:text-xl font-heading font-extrabold uppercase mt-0.5 text-slate-900 dark:text-white">
              {sector.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Best-seats auto assist & Tariffs */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Quick Auto-Seat Assignment */}
          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Placement côte à côte :</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => {
                    setAutoSeatsCount(count);
                    setTimeout(handleAutoSelect, 10);
                  }}
                  className={`w-7 h-7 rounded font-mono font-bold transition-all cursor-pointer ${
                    autoSeatsCount === count && selectedSeatIds.length === count
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Tariff selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Tarif :</span>
            <div className="flex items-center gap-1 p-0.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedTariff('full')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  selectedTariff === 'full'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Plein ({sector.price}€)
              </button>
              <button
                onClick={() => setSelectedTariff('u16')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  selectedTariff === 'u16'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                -16 ans ({getPriceForTariff(sector.price, 'u16')}€)
              </button>
              <button
                onClick={() => setSelectedTariff('student')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  selectedTariff === 'student'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Étudiant ({getPriceForTariff(sector.price, 'student')}€)
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 sm:px-6 py-2 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm bg-emerald-500 border border-emerald-400" />
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm bg-amber-400 border border-amber-300 shadow-sm" />
            <span className="font-semibold text-slate-900 dark:text-white">Votre sélection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm bg-slate-300 dark:bg-slate-700/60 border border-slate-400 dark:border-slate-600" />
            <span>Occupé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm bg-red-500 border border-red-400" />
            <span>Revente officielle</span>
          </div>
        </div>

        {/* The Pitch Direction Banner */}
        <div className="py-1.5 bg-emerald-50 dark:bg-gradient-to-b dark:from-green-950/40 dark:to-transparent text-center border-b border-emerald-200 dark:border-slate-800/40">
          <span className="text-[10px] font-mono tracking-widest text-emerald-700 dark:text-emerald-400 uppercase font-bold">
            ▲ DIRECTION DE LA PELOUSE BOLLAERT ▲
          </span>
        </div>

        {/* Interactive Seats Grid Area with smooth horizontal scrolling on mobile */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 flex flex-col items-center">
          <div className="inline-flex flex-col gap-2 min-w-max pb-2">
            {rows.map((rowNum) => {
              const rowSeats = seats
                .filter((s) => s.row === rowNum)
                .sort((a, b) => a.number - b.number);

              return (
                <div key={rowNum} className="flex items-center gap-2 justify-center">
                  {/* Row Indicator Left */}
                  <span className="w-7 sm:w-8 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 text-right shrink-0">
                    R{rowNum}
                  </span>

                  {/* Seat Nodes */}
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {rowSeats.map((seat) => {
                      const isSelected = selectedSeatIds.includes(seat.id);
                      const isOccupied = seat.status === 'occupied';
                      const isResale = seat.status === 'resale';

                      return (
                        <button
                          key={seat.id}
                          disabled={isOccupied}
                          onClick={() => toggleSeat(seat)}
                          title={`Rang ${seat.row}, Siège ${seat.number} - ${
                            isOccupied ? 'Occupé' : `${currentPricePerSeat} €`
                          }`}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded text-[10px] font-mono font-bold transition-all flex items-center justify-center relative cursor-pointer ${
                            isOccupied
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-300 dark:border-slate-800/80'
                              : isSelected
                              ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/30 scale-110 z-10 ring-2 ring-red-600 dark:ring-white'
                              : isResale
                              ? 'bg-red-100 text-red-900 border border-red-400 dark:bg-red-900/60 dark:text-red-200 dark:border-red-500 hover:scale-105'
                              : 'bg-emerald-50 text-emerald-900 border border-emerald-400 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:border-emerald-500/50 dark:hover:bg-emerald-600 dark:hover:text-white hover:scale-105'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            seat.number
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Row Indicator Right */}
                  <span className="w-7 sm:w-8 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 text-left shrink-0">
                    R{rowNum}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 mb-2 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Footer with Selection Summary & Checkout Trigger */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Places sélectionnées :</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-heading text-lg sm:text-xl font-bold uppercase text-slate-900 dark:text-white">
                  {selectedSeatIds.length} {selectedSeatIds.length > 1 ? 'Places' : 'Place'}
                </span>
                {selectedSeatIds.length > 0 && (
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[150px] sm:max-w-none">
                    (
                    {seats
                      .filter((s) => selectedSeatIds.includes(s.id))
                      .map((s) => `R${s.row}-S${s.number}`)
                      .join(', ')}
                    )
                  </span>
                )}
              </div>
            </div>

            {selectedSeatIds.length > 0 && (
              <div className="pl-4 border-l border-slate-300 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Sous-total :</span>
                <div className="font-heading text-xl sm:text-2xl font-black text-red-700 dark:text-amber-400 tabular-nums">
                  {totalPrice} €
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              disabled={selectedSeatIds.length === 0 || isSubmitting}
              onClick={handleConfirmSelection}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-heading font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
              {isSubmitting ? 'Blocage des places…' : 'Ajouter au panier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
