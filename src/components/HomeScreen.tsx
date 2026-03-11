import React, { useEffect } from 'react';
import { Upload, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from './Logo';

import { useChessStore, initDeviceId, loadPersistedHistory } from '../lib/state/chessStore';

export default function HomeScreen({ onStartTraining, onShowPaywall, onRegister }: { onStartTraining: () => void; onShowPaywall: () => void; onRegister: () => void }) {
  const cycleHistory = useChessStore((s) => s.cycleHistory);
  const cycle = useChessStore((s) => s.cycle);
  const user = useChessStore((s) => s.user);
  const setUser = useChessStore((s) => s.setUser);
  const logout = useChessStore((s) => s.logout);

  useEffect(() => {
    initDeviceId().catch(() => null);
    loadPersistedHistory().catch(() => null);
  }, []);

  const totalSolved = cycleHistory.reduce((sum, c) => sum + c.totalPuzzles, 0);
  const totalCorrect = cycleHistory.reduce((sum, c) => sum + c.correctCount, 0);
  const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;
  const completedCycles = cycle - 1;
  const isPremium = useChessStore((s) => s.isPremium);

  const handleLichessLogin = async () => {
    try {
      const response = await fetch('/api/auth/lichess/url');
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url,
        'lichess_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        alert('Please allow popups to login with Lichess');
      }
    } catch (error) {
      console.error('Lichess Login Error:', error);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setUser(event.data.user);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setUser]);

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

      <div className="w-full max-w-4xl flex flex-col items-center gap-12 md:gap-16 relative -top-[28px]">
        
        {/* Branding & CTA - Centered */}
        <div className="w-full flex flex-col items-center justify-center gap-8">
          {/* Pawn icon circle */}
          <div className="relative flex items-center justify-center">
            <div className="w-40 h-40 md:w-56 md:h-56 rounded-full bg-[#1A1A24] border border-brand-gold/30 flex items-center justify-center shadow-[0_0_32px_rgba(212,175,55,0.5)]">
              <Logo size={160} className="md:w-48 md:h-48" />
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
          <div className="w-full max-w-sm flex flex-col gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartTraining}
              className="w-full h-16 rounded-2xl bg-gradient-to-r from-brand-gold via-[#B8941F] to-brand-gold text-bg-dark font-bold text-lg tracking-[2px] shadow-[0_8px_24px_rgba(212,175,55,0.25)]"
            >
              START TRAINING  →
            </motion.button>
            
            {!user && (
              <div className="flex flex-row gap-3 w-full">
                <button 
                  onClick={handleLichessLogin}
                  className="flex-1 py-4 rounded-xl bg-[#2A2A3A] border border-border-dark text-text-primary font-bold text-xs md:text-sm hover:border-brand-gold/30 transition-all flex items-center justify-center gap-2"
                >
                  <img src="https://lichess1.org/assets/_6S0m6Y/logo/lichess-favicon-32.png" alt="Lichess" className="w-4 h-4 md:w-5 md:h-5" />
                  Lichess
                </button>
                <button 
                  onClick={onRegister}
                  className="flex-1 py-4 rounded-xl bg-bg-card border border-border-dark text-text-primary font-bold text-xs md:text-sm hover:border-brand-gold/30 transition-all"
                >
                  Email
                </button>
              </div>
            )}
            {user && (
              <div className="flex flex-col items-center gap-4">
                <div className="text-center text-text-muted">
                  Logged in as <span className="text-brand-gold font-bold">{user.username}</span>
                </div>
                <button 
                  onClick={logout}
                  className="px-6 py-2 rounded-lg bg-bg-card border border-border-dark text-text-muted hover:text-white hover:border-red-500/30 transition-all text-xs uppercase tracking-widest"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
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
