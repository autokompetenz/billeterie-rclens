import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music, Heart, Flame, Sparkles } from 'lucide-react';

export const AnthemPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<any>(null);

  const lyrics = [
    '« Au nord, c\'étaient les corons... »',
    '« La terre, c\'était le charbon... »',
    '« Le ciel, c\'était l\'horizon... »',
    '« Les hommes, des mineurs de fond... »',
    '🔴🟡 Stade Bollaert-Delelis à l\'unisson 🔴🟡'
  ];

  // Web Audio synthesizer for the authentic anthem melody
  const startAnthemAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // Notes of Les Corons theme in Hz (C4, D4, E4, F4, G4, A4)
      const melody = [
        { f: 261.63, d: 0.6 }, // C4
        { f: 293.66, d: 0.6 }, // D4
        { f: 329.63, d: 1.0 }, // E4
        { f: 293.66, d: 0.6 }, // D4
        { f: 261.63, d: 0.8 }, // C4
        { f: 329.63, d: 0.6 }, // E4
        { f: 392.0, d: 1.2 },  // G4
        { f: 349.23, d: 0.8 }, // F4
        { f: 329.63, d: 1.0 }, // E4
        { f: 293.66, d: 1.2 }  // D4
      ];

      let time = ctx.currentTime + 0.1;

      // Repeat twice for full emotional phrase
      for (let pass = 0; pass < 2; pass++) {
        melody.forEach((note) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          // Warm harmonic brass / organ timbre
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.f, time);

          // Subtle crowd warm harmony layer
          const subOsc = ctx.createOscillator();
          const subGain = ctx.createGain();
          subOsc.type = 'sine';
          subOsc.frequency.setValueAtTime(note.f / 2, time);

          gain.gain.setValueAtTime(0.001, time);
          gain.gain.exponentialRampToValueAtTime(0.22, time + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, time + note.d - 0.05);

          subGain.gain.setValueAtTime(0.001, time);
          subGain.gain.exponentialRampToValueAtTime(0.12, time + 0.08);
          subGain.gain.exponentialRampToValueAtTime(0.001, time + note.d - 0.05);

          osc.connect(gain);
          subOsc.connect(subGain);
          gain.connect(ctx.destination);
          subGain.connect(ctx.destination);

          osc.start(time);
          subOsc.start(time);
          osc.stop(time + note.d);
          subOsc.stop(time + note.d);

          time += note.d;
        });
      }

      setIsPlaying(true);

      // Rotate lyrics line by line
      let idx = 0;
      intervalRef.current = setInterval(() => {
        idx = (idx + 1) % lyrics.length;
        setCurrentLineIndex(idx);
      }, 2200);

      // Auto stop after melody completes
      setTimeout(() => {
        stopAnthemAudio();
      }, 16000);
    } catch (e) {
      console.error(e);
      setIsPlaying(false);
    }
  };

  const stopAnthemAudio = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  };

  const toggleAnthem = () => {
    if (isPlaying) {
      stopAnthemAudio();
    } else {
      startAnthemAudio();
    }
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleAnthem}
        title="Ambiance Stade Bollaert - Hymne Les Corons"
        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
          isPlaying
            ? 'bg-red-950 border-amber-400 text-amber-300 shadow-md shadow-red-950/50 ring-1 ring-amber-400/40'
            : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500'
        }`}
      >
        {isPlaying ? (
          <>
            <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-heading text-xs uppercase tracking-wider text-amber-300">
              {lyrics[currentLineIndex]}
            </span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </>
        ) : (
          <>
            <Music className="w-4 h-4 text-amber-400" />
            <span className="font-heading text-xs uppercase tracking-wider">
              Ambiance Bollaert · Les Corons
            </span>
          </>
        )}
      </button>
    </div>
  );
};
