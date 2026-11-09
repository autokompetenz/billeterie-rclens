import React from 'react';
import { StandId } from '../types/ticketing';
import { X, Eye, Compass, Volume2 } from 'lucide-react';

interface PitchViewModalProps {
  standId: StandId;
  onClose: () => void;
}

export const PitchViewModal: React.FC<PitchViewModalProps> = ({ standId, onClose }) => {
  const standMeta: Record<
    StandId,
    { title: string; image: string; perspective: string; description: string; audioDesc: string }
  > = {
    MAREK_XERCES: {
      title: 'Tribune Marek / Xercès (Kop Sang & Or)',
      image: '/images/hero_bollaert_atmosphere_1794048534296.jpg',
      perspective: 'Latérale Est · Au cœur des supporters',
      description:
        'La tribune mythique de Bollaert ! Les chants partent d\'ici. Vue directe sur le banc des joueurs et vue parfaite sur toute la longueur du terrain.',
      audioDesc: 'Ambiance sonore : 120 dB lors du chant Les Corons'
    },
    LEPAGNOT: {
      title: 'Tribune Lepagnot (Honneur & Loges)',
      image: '/images/stadium_pitch_aerial_1794048534631.jpg',
      perspective: 'Latérale Ouest · Vue présidentielle',
      description:
        'Excellente vision globale du jeu tactique, sortie du tunnel des joueurs juste en dessous, sièges confortables et salons VIP adjacents.',
      audioDesc: 'Confort maximal et visibilité centrale 100%'
    },
    DELACOURT: {
      title: 'Tribune Delacourt (But Nord)',
      image: '/images/match_derby_action_1794048535712.jpg',
      perspective: 'Derrière le but Nord · Niveaux 0 & 1',
      description:
        'Sensation incomparable lors des frappes et des buts. Vue en profondeur sur toutes les phases offensives et les arrêts décisifs du gardien.',
      audioDesc: 'Frissons garantis lors des corners et penalties'
    },
    TRANNIN: {
      title: 'Tribune Trannin (But Sud)',
      image: '/images/stadium_pitch_aerial_1794048534631.jpg',
      perspective: 'Derrière le but Sud · Niveaux 0 & 1',
      description:
        'Ambiance festive et familiale face à la Marek, vue plongeante sur l\'entrée des joueurs et l\'écran géant du stade.',
      audioDesc: 'Excellente visibilité sur l\'ensemble des tribunes'
    }
  };

  const current = standMeta[standId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-red-600 dark:text-amber-400" />
            <div>
              <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                Simulation vue pelouse : {current.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{current.perspective}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Viewport with Scrim and Specs */}
        <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
          <img
            src={current.image}
            alt={current.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none" />

          {/* Compass & Angle badge */}
          <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md border border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-white font-mono">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Angle de vue réel · Bollaert-Delelis</span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-3 sm:p-4 text-xs text-slate-200">
            <p className="font-medium">{current.description}</p>
            <div className="mt-2 flex items-center gap-2 text-amber-300 font-mono text-[11px]">
              <Volume2 className="w-3.5 h-3.5" />
              <span>{current.audioDesc}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Fermer l&apos;aperçu
          </button>
        </div>
      </div>
    </div>
  );
};
