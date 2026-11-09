# Architecture & Composants React (Frontend Billetterie RC Lens)

Ce document fournit l'architecture complète, la structure des dossiers et le code prêt à l'emploi en **React + Tailwind CSS** + **Lucide Icons** pour connecter votre propre backend (API REST ou GraphQL).

---

## 1. Structure du projet recommandée

```text
src/
├── assets/                  # Logos, images locales, visuels
├── components/
│   ├── layout/
│   │   ├── Header.jsx       # Header sticky avec blason, panier & compte
│   │   ├── BottomNav.jsx    # Barre d'onglets mobile
│   │   └── Footer.jsx       # Partenaires, mentions légales, réassurance
│   ├── home/
│   │   ├── CountdownHero.jsx# Prochain match & compte à rebours
│   │   ├── PromoBanners.jsx # Bannières matches à l'extérieur & Ligue des Champions
│   │   ├── MatchList.jsx    # Liste des matches (Ligue 1 & UCL)
│   │   ├── MatchCard.jsx    # Carte de match unitaire avec CTA Réserver/Revente
│   │   ├── AlertSection.jsx # Notification alertes mise en vente
│   │   ├── SubTeams.jsx     # Équipe Féminine & Groupe Élite
│   │   ├── Experiences.jsx  # Bollaert Tour, Stages Sang et Or, Lampi Club
│   │   └── FaqSection.jsx   # Accordéon FAQ & contact guichet
│   └── ui/
│       ├── Button.jsx
│       └── Badge.jsx
├── services/
│   └── api.js              # Fonctions de fetch vers votre backend personnalisé
├── App.jsx
└── main.jsx
```

---

## 2. Configuration Tailwind CSS (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rcl: {
          gold: '#fed100',       // Jaune or emblématique
          red: '#e01e2b',        // Rouge carmin Racing
          darkRed: '#a8131d',
          dark: '#121212',       // Noir mineur
          ucl: '#0d1b2a',        // Bleu sombre UCL
          surface: '#fcf9f8',
          card: '#ffffff',
        }
      },
      fontFamily: {
        condensed: ['"Barlow Condensed"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
```

---

## 3. Modèle de données attendu depuis votre Backend (`types.js` ou format JSON)

```json
[
  {
    "id": "match-om",
    "competition": "LIGUE 1 MCDONALD'S",
    "matchday": "JOURNÉE 12",
    "homeTeam": "RC LENS",
    "awayTeam": "OM",
    "homeLogo": "/assets/rcl-badge.svg",
    "awayLogo": "/assets/om-badge.svg",
    "date": "2026-11-08T20:45:00Z",
    "stadium": "STADE BOLLAERT-DELELIS",
    "status": "AVAILABLE",
    "canResell": true,
    "theme": "gold"
  }
]
```

---

## 4. Code React Complet

### A. Composant `CountdownHero.jsx` (Compte à rebours temps réel)
```jsx
import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

export default function CountdownHero({ targetDate = "2026-11-08T20:45:00" }) {
  const [timeLeft, setTimeLeft] = useState({ days: '01', hours: '09', minutes: '15', seconds: '55' });

  useEffect(() => {
    const interval = setInterval(() => {
      const difference = new Date(targetDate) - new Date();
      if (difference > 0) {
        setTimeLeft({
          days: String(Math.floor(difference / (1000 * 60 * 60 * 24))).padStart(2, '0'),
          hours: String(Math.floor((difference / (1000 * 60 * 60)) % 24)).padStart(2, '0'),
          minutes: String(Math.floor((difference / 1000 / 60) % 60)).padStart(2, '0'),
          seconds: String(Math.floor((difference / 1000) % 60)).padStart(2, '0'),
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <section className="relative overflow-hidden bg-rcl-gold text-rcl-dark px-4 pt-6 pb-4 shadow-sm">
      <div className="flex items-center justify-between font-condensed font-black tracking-wider text-xl uppercase mb-3">
        <span>RÉSERVER MES BILLETS POUR LE PROCHAIN MATCH</span>
        <ChevronRight className="w-6 h-6 stroke-[3]" />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center font-condensed">
        {[
          { label: 'JOURS', val: timeLeft.days },
          { label: 'HEURES', val: timeLeft.hours },
          { label: 'MINUTES', val: timeLeft.minutes },
          { label: 'SECONDES', val: timeLeft.seconds },
        ].map((unit, idx) => (
          <div key={idx} className="bg-yellow-400/90 border border-yellow-500/60 rounded-sm py-1.5">
            <span className="block text-2xl font-black text-black leading-none">{unit.val}</span>
            <span className="block text-[10px] font-bold text-gray-800 tracking-wider mt-0.5">{unit.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

### B. Composant `MatchCard.jsx` (Cartes de match Ligue 1 & Ligue des Champions)
```jsx
import React from 'react';

export default function MatchCard({ match, onBook, onResell }) {
  const isUcl = match.theme === 'ucl';

  return (
    <div className={`rounded-xl overflow-hidden shadow-sm border mb-4 font-condensed ${
      isUcl 
        ? 'bg-[#0f1c2e] text-white border-blue-900/60' 
        : 'bg-rcl-gold text-rcl-dark border-yellow-400'
    }`}>
      {/* Badge Compétition */}
      <div className="py-1.5 px-3 text-center text-xs font-black tracking-widest uppercase flex items-center justify-center gap-1.5 opacity-90">
        <span>●</span>
        <span>{match.competition} • {match.matchday}</span>
      </div>

      {/* Confrontation */}
      <div className="px-6 py-4 flex items-center justify-around">
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center p-2">
            <img src={match.homeLogo} alt={match.homeTeam} className="h-10 object-contain" />
          </div>
          <span className="font-black text-sm tracking-wide">{match.homeTeam}</span>
        </div>

        <span className={`text-xs font-black px-2 py-1 rounded ${isUcl ? 'bg-blue-900/70 text-blue-200' : 'bg-black/10 text-black'}`}>
          VS
        </span>

        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center p-2">
            <img src={match.awayLogo} alt={match.awayTeam} className="h-10 object-contain" />
          </div>
          <span className="font-black text-sm tracking-wide">{match.awayTeam}</span>
        </div>
      </div>

      {/* Date & Lieu */}
      <div className={`py-2 px-3 text-center border-t border-b ${
        isUcl ? 'bg-black/30 border-blue-900/40' : 'bg-yellow-200/50 border-black/5'
      }`}>
        <p className="font-black text-sm tracking-wide uppercase">{match.formattedDate}</p>
        <p className="text-[11px] opacity-80 uppercase tracking-wider">{match.stadium}</p>
      </div>

      {/* Actions */}
      <div className="p-3 grid grid-cols-2 gap-2">
        <button 
          onClick={() => onBook(match.id)}
          className={`py-2.5 rounded font-black text-sm uppercase tracking-wider transition ${
            isUcl 
              ? 'bg-rcl-gold text-rcl-dark hover:brightness-105' 
              : 'bg-rcl-dark text-white hover:bg-black'
          }`}
        >
          RÉSERVER
        </button>
        <button 
          onClick={() => onResell(match.id)}
          className={`py-2.5 rounded font-black text-sm uppercase tracking-wider transition ${
            isUcl 
              ? 'bg-white/10 text-white hover:bg-white/20' 
              : 'bg-white/90 text-rcl-dark border border-black/10 hover:bg-white'
          }`}
        >
          REVENTE
        </button>
      </div>
    </div>
  );
}
```

---

### C. Hook & Service Backend (`useMatches.js`)
```jsx
import { useState, useEffect } from 'react';

// Exemple de hook prêt à être branché sur votre propre route API backend
export function useMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        setLoading(true);
        // Remplacez par votre endpoint: const res = await fetch('/api/matches');
        // const data = await res.json();
        // Simulation locale :
        const data = [
          {
            id: 1,
            competition: "Ligue 1 McDonald's",
            matchday: "Journée 12",
            homeTeam: "RC Lens",
            awayTeam: "OM",
            homeLogo: "https://billetterie.rclens.fr/media/club_lens.png",
            awayLogo: "https://billetterie.rclens.fr/media/club_om.png",
            formattedDate: "Sam. 08 Novembre 2026 - 20:45",
            stadium: "Stade Bollaert-Delelis",
            theme: "gold"
          },
          {
            id: 2,
            competition: "UEFA Champions League",
            matchday: "6ème Journée",
            homeTeam: "RC Lens",
            awayTeam: "FK Bodø/Glimt",
            homeLogo: "https://billetterie.rclens.fr/media/club_lens.png",
            awayLogo: "https://billetterie.rclens.fr/media/club_bodo.png",
            formattedDate: "Mer. 09 Décembre 2026 - 21:00",
            stadium: "Stade Bollaert-Delelis",
            theme: "ucl"
          }
        ];
        setMatches(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, []);

  return { matches, loading, error };
}
```

---

### D. Layout Global & Navigation Mobile (`App.jsx`)
```jsx
import React from 'react';
import { Menu, ShoppingBag, User, Ticket, CreditCard, Compass, ShieldCheck } from 'lucide-react';
import CountdownHero from './components/home/CountdownHero';
import MatchCard from './components/home/MatchCard';
import { useMatches } from './services/useMatches';

export default function App() {
  const { matches, loading } = useMatches();

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#121212] font-condensed pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-rcl-red text-white px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button className="p-1 hover:bg-white/10 rounded">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-rcl-gold rounded-full flex items-center justify-center font-black text-rcl-dark text-xs border border-white/20">
              RCL
            </div>
            <div>
              <div className="font-black text-sm uppercase leading-none">RC LENS</div>
              <div className="text-[10px] text-yellow-300 font-semibold uppercase leading-none">BILLETTERIE</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-1.5 hover:bg-white/10 rounded">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 bg-rcl-gold text-rcl-dark text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              0
            </span>
          </button>
          <button className="p-1.5 hover:bg-white/10 rounded">
            <User className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <CountdownHero />

        {/* Matches Section */}
        <section className="px-4 py-6">
          <div className="text-center mb-5">
            <div className="text-rcl-red font-black text-xl mb-1">⚔</div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-rcl-dark">
              LES PROCHAINS MATCHS DU RACING
            </h2>
            <div className="w-10 h-1 bg-rcl-gold mx-auto mt-1"></div>
          </div>

          {loading ? (
            <p className="text-center py-8">Chargement des rencontres...</p>
          ) : (
            matches.map((m) => (
              <MatchCard 
                key={m.id} 
                match={m} 
                onBook={(id) => console.log('Booking match', id)} 
                onResell={(id) => console.log('Resell match', id)} 
              />
            ))
          )}
        </section>
      </main>

      {/* Bottom Nav Bar (Fixe Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-3 py-2 flex items-center justify-around shadow-lg">
        <button className="flex flex-col items-center text-rcl-red">
          <Ticket className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase mt-0.5">BILLETTERIE</span>
        </button>
        <button className="flex flex-col items-center text-gray-500 hover:text-rcl-dark">
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase mt-0.5">MES BILLETS</span>
        </button>
        <button className="flex flex-col items-center text-gray-500 hover:text-rcl-dark">
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase mt-0.5">BOLLAERT TOUR</span>
        </button>
        <button className="flex flex-col items-center text-gray-500 hover:text-rcl-dark">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase mt-0.5">ABONNEMENTS</span>
        </button>
      </nav>
    </div>
  );
}
```
