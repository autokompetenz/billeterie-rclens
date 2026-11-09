import React, { useEffect, useState } from 'react';
import { CartItem, OrderAddons, ETicket } from '../types/ticketing';
import { ticketingApi, getErrorMessage } from '../services/api';
import { X, Lock, CreditCard, ShieldCheck, CheckCircle2, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  addons: OrderAddons;
  onOrderSuccess: (orderId: string, tickets: ETicket[]) => void;
  buyerName?: string;
  buyerEmail?: string;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  addons,
  onOrderSuccess,
  buyerName,
  buyerEmail
}) => {
  const [step, setStep] = useState<'info' | 'payment' | 'processing'>('info');
  const [buyerInfo, setBuyerInfo] = useState({
    firstName: 'Alexandre',
    lastName: 'Dupont',
    email: 'supporter@rclens.fr',
    phone: '06 12 34 56 78',
    termsAccepted: true
  });

  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '4970 •••• •••• 4242',
    expiry: '08/28',
    cvv: '921',
    cardholder: 'ALEXANDRE DUPONT'
  });

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pré-remplit les coordonnées avec le compte connecté à chaque ouverture
  useEffect(() => {
    if (!isOpen) return;
    const parts = (buyerName || 'Alexandre Dupont').split(' ');
    setBuyerInfo((prev) => ({
      ...prev,
      firstName: parts[0] || 'Alexandre',
      lastName: parts.slice(1).join(' ') || 'Dupont',
      email: buyerEmail || 'supporter@rclens.fr'
    }));
    setPaymentDetails((prev) => ({
      ...prev,
      cardholder: (buyerName || 'ALEXANDRE DUPONT').toUpperCase()
    }));
    setStep('info');
    setError(null);
  }, [isOpen, buyerName, buyerEmail]);

  if (!isOpen) return null;

  const ticketsTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const addonsTotal =
    (addons.insurance ? 2.5 * cart.length : 0) +
    (addons.scarf ? 18 : 0) +
    (addons.parkingPass !== 'none' ? 10 : 0);
  const rawTotal = ticketsTotal + addonsTotal;
  const grandTotal = Math.max(0, rawTotal - promoDiscount);

  const applyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (code === 'LENSOIS10') {
      const disc = Math.round(rawTotal * 0.1);
      setPromoDiscount(disc);
      setAppliedPromoCode(code);
      setPromoMessage('Code LENSOIS10 appliqué (-10%)');
    } else if (code === 'CORONS') {
      setPromoDiscount(Math.min(15, rawTotal));
      setAppliedPromoCode(code);
      setPromoMessage('Code CORONS appliqué (-15,00 €)');
    } else {
      setPromoMessage('Code invalide ou expiré');
      setPromoDiscount(0);
      setAppliedPromoCode(null);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep('processing');

    try {
      const res = await ticketingApi.createOrder(
        cart,
        addons,
        {
          cardholder: `${buyerInfo.firstName} ${buyerInfo.lastName}`.trim(),
          email: buyerInfo.email
        },
        appliedPromoCode ?? undefined
      );

      if (res.success) {
        setTimeout(() => {
          onOrderSuccess(res.orderId, res.tickets);
          onClose();
        }, 800);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setStep('payment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-xl max-h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-heading text-lg sm:text-xl font-bold uppercase text-slate-900 dark:text-white tracking-tight">
              Paiement Sécurisé Billetterie
            </h2>
          </div>
          {step !== 'processing' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step Indicator */}
        <div className="px-5 sm:px-6 py-2 bg-slate-100/70 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span
            className={`font-semibold ${
              step === 'info'
                ? 'text-red-700 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            1. Coordonnées Acheteur
          </span>
          <span className="text-slate-300 dark:text-slate-700">➔</span>
          <span
            className={`font-semibold ${
              step === 'payment' || step === 'processing'
                ? 'text-red-700 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            2. Règlement Bancaire
          </span>
          <span className="text-slate-300 dark:text-slate-700">➔</span>
          <span className="text-slate-500 dark:text-slate-400">3. E-Billets Immédiats</span>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {step === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={buyerInfo.firstName}
                    onChange={(e) =>
                      setBuyerInfo((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={buyerInfo.lastName}
                    onChange={(e) =>
                      setBuyerInfo((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse e-mail (Réception des e-billets PDF)
                </label>
                <input
                  type="email"
                  value={buyerInfo.email}
                  onChange={(e) => setBuyerInfo((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Téléphone mobile (SMS d&apos;accès stade)
                </label>
                <input
                  type="tel"
                  value={buyerInfo.phone}
                  onChange={(e) => setBuyerInfo((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Promo code field */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Code Avantage / Promo supporter
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: LENSOIS10 ou CORONS"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 uppercase"
                  />
                  <button
                    type="button"
                    onClick={applyPromo}
                    className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Appliquer
                  </button>
                </div>
                {promoMessage && (
                  <p
                    className={`text-[11px] mt-1 font-semibold ${
                      promoDiscount > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {promoMessage}
                  </p>
                )}
              </div>

              {/* CGV Accept */}
              <label className="flex items-start gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={buyerInfo.termsAccepted}
                  onChange={(e) =>
                    setBuyerInfo((prev) => ({ ...prev, termsAccepted: e.target.checked }))
                  }
                  className="mt-0.5 accent-amber-500 rounded"
                />
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  J&apos;accepte les Conditions Générales de Vente de la billetterie du RC Lens et le règlement intérieur du Stade Bollaert-Delelis.
                </span>
              </label>

              <button
                disabled={!buyerInfo.termsAccepted || !buyerInfo.email}
                onClick={() => setStep('payment')}
                className="w-full mt-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-heading font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continuer vers le paiement ({grandTotal.toFixed(2)} €)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 'payment' && (
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Montant total de la commande :</span>
                  <div className="font-heading text-2xl font-black text-red-700 dark:text-amber-400 tabular-nums">
                    {grandTotal.toFixed(2)} €
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>3D Secure 2.0</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom sur la carte bancaire
                </label>
                <input
                  type="text"
                  value={paymentDetails.cardholder}
                  onChange={(e) =>
                    setPaymentDetails((prev) => ({ ...prev, cardholder: e.target.value }))
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white uppercase focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Numéro de carte bancaire
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={paymentDetails.cardNumber}
                    onChange={(e) =>
                      setPaymentDetails((prev) => ({ ...prev, cardNumber: e.target.value }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date expiration
                  </label>
                  <input
                    type="text"
                    placeholder="MM/AA"
                    value={paymentDetails.expiry}
                    onChange={(e) =>
                      setPaymentDetails((prev) => ({ ...prev, expiry: e.target.value }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cryptogramme (CVV)
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    value={paymentDetails.cvv}
                    onChange={(e) =>
                      setPaymentDetails((prev) => ({ ...prev, cvv: e.target.value }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('info')}
                  className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Confirmer et Payer {grandTotal.toFixed(2)} €</span>
                </button>
              </div>
            </form>
          )}

          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
              <div>
                <h3 className="font-heading text-lg font-bold uppercase text-slate-900 dark:text-white">
                  Validation bancaire 3D Secure en cours...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Génération sécurisée de vos e-billets officiels avec QR codes nominatifs uniques.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
