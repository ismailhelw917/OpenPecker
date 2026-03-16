import React, { useEffect } from 'react';
import { Upload, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from './Logo';
import { ShareButton } from './ShareButton';
import { Screen } from '../types';
import BottomNav from './BottomNav';

import { useChessStore, initDeviceId, loadPersistedHistory } from '../lib/state/chessStore';

export default function HomeScreen({ onStartTraining, onShowPaywall, onRegister }: { onStartTraining: () => void; onShowPaywall: () => void; onRegister: () => void; }) {
  const cycleHistory = useChessStore((s) => s.cycleHistory);
  const cycle = useChessStore((s) => s.cycle);
  const user = useChessStore((s) => s.user);
  const setUser = useChessStore((s) => s.setUser);
  const logout = useChessStore((s) => s.logout);

  useEffect(() => {
    console.log('[DEBUG] HomeScreen useEffect');
    initDeviceId().catch(() => null);
    loadPersistedHistory().catch(() => null);
  }, []);

  const totalSolved = cycleHistory.reduce((sum, c) => sum + c.totalPuzzles, 0);
  const totalCorrect = cycleHistory.reduce((sum, c) => sum + c.correctCount, 0);
  const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;
  const completedCycles = cycle - 1;
  const isPremium = useChessStore((s) => s.isPremium);

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-b from-[#1A1A24] via-[#0D0D11] to-[#0D0D11] mt-[-3.0rem]">
      <div className="flex-1 flex flex-col items-center justify-between px-4 py-4">
      
      {/* Share button — top right */}
      <ShareButton />

      <div className="w-full max-w-4xl flex flex-col items-center gap-4 md:gap-6 flex-1 justify-center">
        
        {/* Branding & CTA - Centered */}
        <div className="w-full flex flex-col items-center justify-center gap-4">
          {/* Pawn icon circle */}
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 md:w-36 md:h-36 rounded-full bg-[#1A1A24] border border-brand-gold/30 flex items-center justify-center shadow-[0_0_24px_rgba(212,175,55,0.4)]">
              <Logo size={80} className="md:w-28 md:h-28" />
            </div>
            {/* Glow halo */}
            <div className="absolute -bottom-2 w-32 md:w-48 h-8 rounded-[70px] bg-brand-gold/10 blur-xl"></div>
          </div>

          {/* App name + tagline */}
          <div className="text-center space-y-1">
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-brand-gold tracking-tight">
              OpenPecker
            </h1>
            <p className="text-xs md:text-base text-brand-gold leading-relaxed max-w-sm mx-auto">
              Master opening tactics through deliberate repetition.
            </p>
          </div>

          {/* CTA */}
          <div className="w-full max-w-xs flex flex-col gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartTraining}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-gold via-[#B8941F] to-brand-gold text-bg-dark font-bold text-base tracking-[1px] shadow-[0_4px_16px_rgba(212,175,55,0.2)]"
            >
              START TRAINING  →
            </motion.button>
            
            {!user && (
              <div className="flex flex-row gap-2 w-full">
                <button 
                  onClick={onRegister}
                  className="w-full py-2 rounded-lg bg-bg-card border border-border-dark text-text-primary font-bold text-xs hover:border-brand-gold/30 transition-all"
                >
                  Sign In / Register
                </button>
              </div>
            )}
            {user && (
              <div className="flex flex-col items-center gap-1">
                <div className="text-center text-text-muted text-xs">
                  Logged in as <span className="text-brand-gold font-bold">{user.username}</span>
                </div>
                <button 
                  onClick={logout}
                  className="px-3 py-0.5 rounded-md bg-bg-card border border-border-dark text-text-muted hover:text-white hover:border-red-500/30 transition-all text-[9px] uppercase tracking-widest"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Stats & Info - Centered below */}
        <div className="w-full max-w-xs pb-2">
          {/* Stat chips */}
          <div className="grid grid-cols-3 gap-2 w-full">
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
      <span className="text-[9px] font-medium text-brand-gold tracking-widest">{label}</span>
    </div>
  );
}
