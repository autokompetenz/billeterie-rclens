import React, { useEffect, useState } from 'react';
import { CartItem, Match, TourPackage } from '../types/ticketing';
import { Compass, Clock, Calendar, Check, Users, ArrowRight } from 'lucide-react';

interface StadiumToursProps {
  onAddToCart: (items: Omit<CartItem, 'id'>[]) => Promise<void> | void;
  tours: TourPackage[];
}

export const StadiumTours: React.FC<StadiumToursProps> = ({ onAddToCart, tours }) => {
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(2);
  const [addedNotice, setAddedNotice] = useState(false);

  useEffect(() => {
    if (tours.length === 0) return;
    setSelectedPackage((current) => {
      if (current && tours.some((tour) => tour.id === current)) return current;
      return tours[0].id;
    });
  }, [tours]);

  const currentPkg = tours.find((p) => p.id === selectedPackage) || tours[0];

  useEffect(() => {
    if (!currentPkg) return;
    if (!currentPkg.availableDates.includes(selectedDate)) {
      setSelectedDate(currentPkg.availableDates[0] ?? '');
    }
  }, [currentPkg, selectedDate]);

  if (!currentPkg) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <Compass className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="font-heading text-lg font-bold uppercase text-slate-900 dark:text-white">
          Visites indisponibles pour le moment
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Les créneaux de visite seront publiés prochainement.
        </p>
      </div>
    );
  }

  const handleBookTour = async () => {
    const tourMatch: Match = {
      id: currentPkg.id,
      opponent: currentPkg.title,
      opponentShort: 'VISITE',
      opponentLogo: '',
      opponentColor: '#C8102E',
      homeTeam: 'RC Lens',
      competition: 'Visites & Expériences',
      round: 'Stade Bollaert-Delelis',
      date: selectedDate.split(' - ')[0] ?? selectedDate,
      formattedDate: selectedDate.split(' - ')[0] ?? selectedDate,
      time: selectedDate.split(' - ')[1] ?? '',
      venue: 'Stade Bollaert-Delelis, Lens',
      status: 'open',
      minPrice: currentPkg.price,
      stands: {} as Match['stands']
    };

    const items: Omit<CartItem, 'id'>[] = Array.from({ length: quantity }).map((_, i) => ({
      matchId: currentPkg.id,
      match: tourMatch,
      standId: 'LEPAGNOT',
      standName: 'Espaces Officiels Bollaert',
      sectorId: currentPkg.id,
      sectorName: currentPkg.title,
      categoryName: `${currentPkg.title} (${selectedDate})`,
      row: 1,
      seatNumber: i + 1,
      tariff: 'full',
      price: currentPkg.price,
      basePrice: currentPkg.price,
      beneficiary: { firstName: '', lastName: '', email: '' },
      gate: 'Accueil VIP / Hall Bollaert',
      tourId: currentPkg.id,
      tourDate: selectedDate
    }));

    await onAddToCart(items);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 4000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-3xl overflow-hidden bg-gradient-to-r from-red-900 via-slate-900 to-amber-950 border border-slate-800 p-6 sm:p-10 relative shadow-xl text-white">
        <div className="max-w-2xl relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-widest mb-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Immersion Exclusive · Stade Bollaert-Delelis</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-black uppercase text-white tracking-tight">
            Visites &amp; <span className="text-amber-400">Expériences VIP</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-200 leading-relaxed">
            Pénétrez dans les lieux secrets du RC Lens : marchez dans le tunnel des joueurs,
            découvrez les vestiaires officiels et vivez l&apos;ambiance mythique de Bollaert de
            l&apos;intérieur.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold text-white">
            <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-lg border border-slate-700">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Guides officiels du club</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-lg border border-slate-700">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Accès bord pelouse garanti</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-lg border border-slate-700">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>E-billet immédiat &amp; échangeable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Package Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tours.map((pkg) => {
          const isSelected = selectedPackage === pkg.id;
          return (
            <div
              key={pkg.id}
              onClick={() => {
                setSelectedPackage(pkg.id);
                setSelectedDate(pkg.availableDates[0]);
              }}
              className={`rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col justify-between group ${
                isSelected
                  ? 'bg-amber-50/50 dark:bg-slate-900 border-amber-500 dark:border-amber-400 shadow-xl ring-2 ring-amber-400/40 scale-[1.01]'
                  : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg'
              }`}
            >
              <div>
                <div className="relative h-44 w-full overflow-hidden">
                  <img
                    src={pkg.image}
                    alt={pkg.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  <span className="absolute top-3 left-3 text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded bg-amber-500 text-slate-950 shadow-xs font-bold">
                    {pkg.badge}
                  </span>
                  <span className="absolute bottom-3 right-3 text-xs font-mono font-bold bg-slate-950/80 text-white px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {pkg.duration}
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="font-heading text-xl font-bold uppercase text-slate-900 dark:text-white group-hover:text-red-700 dark:group-hover:text-amber-400 transition-colors">
                    {pkg.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{pkg.subtitle}</p>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    {pkg.highlights.slice(0, 3).map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Tarif par participant</span>
                  <div className="font-heading text-2xl font-black text-red-700 dark:text-amber-400 tabular-nums">
                    {pkg.price} €
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPackage(pkg.id);
                    setSelectedDate(pkg.availableDates[0]);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-heading font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300'
                  }`}
                >
                  {isSelected ? 'Sélectionné' : 'Choisir'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking Form for Selected Package */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-red-700 dark:text-amber-400 uppercase px-2 py-0.5 rounded bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700">
              Réservation en direct
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">· {currentPkg.badge}</span>
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold uppercase text-slate-900 dark:text-white">
            {currentPkg.title}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {currentPkg.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {currentPkg.highlights.map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Date & Quantity Picker Card */}
        <div className="lg:col-span-5 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-red-600 dark:text-amber-400" />
              Sélectionnez une date &amp; créneau :
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {currentPkg.availableDates.map((d, i) => (
                <option key={i} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-red-600 dark:text-amber-400" />
              Nombre de personnes :
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => setQuantity(num)}
                  className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    quantity === num
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Total réservation :</span>
              <div className="font-heading text-2xl font-black text-red-700 dark:text-amber-400 tabular-nums">
                {currentPkg.price * quantity} €
              </div>
            </div>

            <button
              onClick={handleBookTour}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Ajouter au panier</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {addedNotice && (
            <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-200 rounded-lg text-xs text-center animate-in fade-in duration-200 font-semibold">
              ✓ Visite ajoutée avec succès à votre panier !
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
