import React, { useEffect } from 'react';
import { Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { useChessStore, initDeviceId, loadPersistedHistory } from '../lib/state/chessStore';

export default function HomeScreen({ onStartTraining, onShowPaywall }: { onStartTraining: () => void; onShowPaywall: () => void }) {
  const cycleHistory = useChessStore((s) => s.cycleHistory);
  const cycle = useChessStore((s) => s.cycle);

  useEffect(() => {
    initDeviceId().catch(() => null);
    loadPersistedHistory().catch(() => null);
  }, []);

  const totalSolved = cycleHistory.reduce((sum, c) => sum + c.totalPuzzles, 0);
  const totalCorrect = cycleHistory.reduce((sum, c) => sum + c.correctCount, 0);
  const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;
  const completedCycles = cycle - 1;
  const isPremium = useChessStore((s) => s.isPremium);

  return (
    <div className="relative min-h-full flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-[#1A1A24] via-[#0D0D11] to-[#0D0D11] overflow-y-auto">
      
      {/* Share button — top right */}
      <button 
        className="absolute top-8 right-8 p-4 bg-bg-card border border-border-dark rounded-2xl shadow-xl text-text-muted hover:text-white hover:border-brand-gold/30 transition-all group"
        onClick={() => {
          const shareData = {
            title: 'OpenPecker',
            text: 'Master chess openings through deliberate repetition with OpenPecker!',
            url: window.location.href
          };
          if (navigator.share && navigator.canShare?.(shareData)) {
            navigator.share(shareData).catch(console.error);
          } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
          }
        }}
      >
        <Upload size={24} className="group-hover:scale-110 transition-transform" />
      </button>

      <div className="w-full max-w-4xl flex flex-col items-center gap-12 md:gap-16">
        
        {/* Branding & CTA - Centered */}
        <div className="w-full flex flex-col items-center justify-center gap-8">
          {/* Pawn icon circle */}
          <div className="relative flex items-center justify-center">
            <div className="w-40 h-40 md:w-56 md:h-56 rounded-full bg-[#1A1A24] border border-brand-gold/30 flex items-center justify-center shadow-[0_0_32px_rgba(212,175,55,0.5)]">
              <span className="text-8xl md:text-[140px] text-brand-gold leading-none select-none">♚</span>
            </div>
            {/* Glow halo */}
            <div className="absolute -bottom-8 w-48 md:w-72 h-16 rounded-[70px] bg-brand-gold/15 blur-2xl"></div>
          </div>

          {/* App name + tagline */}
          <div className="text-center space-y-4">
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-text-primary tracking-tight">
              OpenPecker
            </h1>
            <p className="text-base md:text-xl text-text-muted leading-relaxed max-w-lg mx-auto">
              Master opening tactics through deliberate repetition. Speed equals mastery.
            </p>
          </div>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStartTraining}
            className="w-full max-w-sm h-16 rounded-2xl bg-gradient-to-r from-brand-gold via-[#B8941F] to-brand-gold text-bg-dark font-bold text-lg tracking-[2px] shadow-[0_8px_24px_rgba(212,175,55,0.25)]"
          >
            START TRAINING  →
          </motion.button>
        </div>

        {/* Stats & Info - Centered below */}
        <div className="w-full max-w-2xl flex flex-col gap-8">
          {/* Stat chips */}
          <div className="grid grid-cols-3 gap-4 w-full">
            <StatChip label="CYCLES" value={completedCycles} />
            <StatChip label="SOLVED" value={totalSolved} />
            <StatChip label="ACC%" value={accuracy > 0 ? `${accuracy}%` : '—'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex-1 bg-bg-card rounded-xl py-3 px-2 flex flex-col items-center border border-border-dark gap-1">
      <span className="font-serif text-xl font-bold text-brand-gold">{value}</span>
      <span className="text-[9px] font-medium text-text-muted tracking-widest">{label}</span>
    </div>
  );
}
