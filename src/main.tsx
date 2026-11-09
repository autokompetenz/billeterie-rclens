import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminPage from './pages/AdminPage.tsx';
import EventsPage from './pages/EventsPage.tsx';
import VerifyPage from './pages/VerifyPage.tsx';
import './index.css';

/**
 * Routage minimal basé sur le chemin (pas de dépendance supplémentaire).
 * - /              → application historique (matchs, plan de stade, bourse…)
 * - /evenements    → catalogue d'événements + achat invité
 * - /verifier      → vérification d'un bon de commande / billet
 * - /admin         → espace administrateur masqué
 */

function resolvePage(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/admin') return <AdminPage />;
  if (path === '/evenements') return <EventsPage />;
  if (path === '/verifier') return <VerifyPage />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{resolvePage(window.location.pathname)}</StrictMode>
);
