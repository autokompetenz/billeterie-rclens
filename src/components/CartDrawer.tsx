import React from 'react';
import { CartItem, OrderAddons, TariffType } from '../types/ticketing';
import { X, Trash2, Clock, Shield, Car, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemoveItem: (id: string) => void;
  onUpdateBeneficiary: (id: string, firstName: string, lastName: string) => void;
  onUpdateTariff: (id: string, tariff: TariffType) => void;
  addons: OrderAddons;
  setAddons: React.Dispatch<React.SetStateAction<OrderAddons>>;
  timeLeft: number;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onRemoveItem,
  onUpdateBeneficiary,
  onUpdateTariff,
  addons,
  setAddons,
  timeLeft,
  onProceedToCheckout
}) => {
  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatEuros = (value: number) =>
    `${value.toFixed(2).replace('.', ',')} €`;

  const ticketsTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const addonsTotal =
    (addons.insurance ? 2.5 * cart.length : 0) +
    (addons.scarf ? 18 : 0) +
    (addons.parkingPass !== 'none' ? 10 : 0);

  const grandTotal = ticketsTotal + addonsTotal;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl flex flex-col transition-colors duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg sm:text-xl font-extrabold uppercase text-slate-900 dark:text-white tracking-tight">
                Votre Panier ({cart.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Reservation Countdown timer */}
          {cart.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-900/60 px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
                <Clock className="w-4 h-4 text-red-600 dark:text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Places bloquées pendant :</span>
              </div>
              <span className="font-mono font-bold text-red-700 dark:text-amber-300 text-sm">
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 dark:text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-slate-200 uppercase">
                  Votre panier est vide
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  Choisissez un match et sélectionnez vos places sur le plan du Stade Bollaert-Delelis pour réserver.
                </p>
              </div>
            ) : (
              <>
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-mono font-bold uppercase text-red-700 dark:text-amber-400 tracking-wider">
                          {item.match.competition} · {item.match.formattedDate}
                        </div>
                        <h4 className="font-heading text-base font-bold text-slate-900 dark:text-white uppercase mt-0.5">
                          RC Lens vs {item.match.opponent}
                        </h4>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          <span className="font-semibold text-slate-900 dark:text-white">{item.standName}</span>
                          <span className="text-slate-400"> · </span>
                          <span>{item.sectorName}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-heading text-lg font-black text-red-700 dark:text-amber-400 tabular-nums">
                          {formatEuros(item.price)}
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="mt-1 p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                          title="Supprimer la place"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Seat Coordinates or Tour slot */}
                    {item.tourDate ? (
                      <div className="mt-3 py-1.5 px-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-600 dark:text-slate-400">
                          Créneau :{' '}
                          <strong className="text-slate-900 dark:text-white">{item.tourDate}</strong>
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">Accès : {item.gate}</span>
                      </div>
                    ) : (
                      <div className="mt-3 py-1.5 px-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-600 dark:text-slate-400">
                          Rang <strong className="text-slate-900 dark:text-white">{item.row}</strong> · Siège{' '}
                          <strong className="text-slate-900 dark:text-white">{item.seatNumber}</strong>
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">Accès : {item.gate}</span>
                      </div>
                    )}

                    {/* Tariff select (uniquement pour les places de match) */}
                    {!item.tourId && !item.resaleListingId ? (
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Tarif appliqué :</span>
                        <select
                          value={item.tariff}
                          onChange={(e) => onUpdateTariff(item.id, e.target.value as TariffType)}
                          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="full">Plein Tarif</option>
                          <option value="u16">-16 ans (-25%)</option>
                          <option value="student">Étudiant (-15%)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Tarif appliqué :</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {item.resaleListingId ? 'Bourse d\'échange' : 'Tarif unique visite'}
                        </span>
                      </div>
                    )}

                    {/* Mandatory Nominative beneficiary input */}
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                        <span>Bénéficiaire nominatif :</span>
                        <span className="text-[10px] text-red-600 dark:text-amber-400">Loi sport 2016</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Prénom"
                          defaultValue={item.beneficiary.firstName}
                          onChange={(e) =>
                            onUpdateBeneficiary(item.id, e.target.value, item.beneficiary.lastName)
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded px-2.5 py-1 text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                        />
                        <input
                          type="text"
                          placeholder="Nom"
                          defaultValue={item.beneficiary.lastName}
                          onChange={(e) =>
                            onUpdateBeneficiary(item.id, item.beneficiary.firstName, e.target.value)
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded px-2.5 py-1 text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Matchday Add-ons */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-heading font-extrabold uppercase text-slate-900 dark:text-white tracking-wider">
                    Options &amp; Services Stade Bollaert
                  </h4>

                  {/* Insurance */}
                  <label className="flex items-start gap-2.5 py-2 cursor-pointer border-b border-slate-200 dark:border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={addons.insurance}
                      onChange={(e) =>
                        setAddons((prev) => ({ ...prev, insurance: e.target.checked }))
                      }
                      className="mt-0.5 accent-amber-500 rounded"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white">Assurance Annulation</span>
                        <span className="font-mono text-red-700 dark:text-amber-400 font-bold">
                          +{(2.5 * cart.length).toFixed(2)} €
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Remboursement à 100% en cas d&apos;empêchement (maladie, transport).
                      </p>
                    </div>
                  </label>

                  {/* Official Scarf */}
                  <label className="flex items-start gap-2.5 py-2 cursor-pointer border-b border-slate-200 dark:border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={addons.scarf}
                      onChange={(e) =>
                        setAddons((prev) => ({ ...prev, scarf: e.target.checked }))
                      }
                      className="mt-0.5 accent-amber-500 rounded"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white">Écharpe Sang et Or 2026/27</span>
                        <span className="font-mono text-red-700 dark:text-amber-400 font-bold">+18.00 €</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        À retirer à la Boutique Emotion Foot le jour du match.
                      </p>
                    </div>
                  </label>

                  {/* Parking Pass */}
                  <div className="py-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-amber-500" /> Parking Stade
                      </span>
                      {addons.parkingPass !== 'none' && (
                        <span className="font-mono text-red-700 dark:text-amber-400 font-bold">+10.00 €</span>
                      )}
                    </div>
                    <select
                      value={addons.parkingPass}
                      onChange={(e) =>
                        setAddons((prev) => ({
                          ...prev,
                          parkingPass: e.target.value as any
                        }))
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="none">Sans accès parking</option>
                      <option value="P1_Bollaert">Parking P1 Bollaert (+10 €)</option>
                      <option value="P2_Delacourt">Parking P2 Delacourt Nord (+10 €)</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer with totals and checkout */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Billets ({cart.length}) :</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{formatEuros(ticketsTotal)}</span>
                </div>
                {addonsTotal > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Options &amp; Services :</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-slate-200">
                      {formatEuros(addonsTotal)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Frais de réservation :</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">0,00 € (Offerts)</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                  <span className="font-heading text-lg font-bold uppercase text-slate-900 dark:text-white">
                    Total TTC :
                  </span>
                  <span className="font-heading text-2xl font-black text-red-700 dark:text-amber-400 tabular-nums">
                    {formatEuros(grandTotal)}
                  </span>
                </div>
              </div>

              <button
                onClick={onProceedToCheckout}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-extrabold text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Commander &amp; Régler</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Paiement 100% sécurisé · E-billets instantanés</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
