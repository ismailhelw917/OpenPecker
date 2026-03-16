import React from 'react';
import { useChessStore } from '../lib/state/chessStore';
import { Settings, Palette, Shield, CreditCard, Info, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { ShareButton } from './ShareButton';

interface SettingsScreenProps {
  onShowPaywall: () => void;
}

export default function SettingsScreen({ onShowPaywall }: SettingsScreenProps) {
  const { boardTheme, setBoardTheme, isPremium, setPremium, fitToScreen, setFitToScreen } = useChessStore();

  const themes = [
    { id: 'brown', name: 'Classic Wood', light: '#f0d9b5', dark: '#b58863' },
    { id: 'blue', name: 'Ocean Breeze', light: '#dee3e6', dark: '#8ca2ad' },
    { id: 'green', name: 'Tournament Green', light: '#ffffdd', dark: '#86a666' },
  ] as const;

  return (
    <div className="h-screen flex flex-col bg-teal-950 p-6 md:p-12">
      <div className="flex-1 overflow-y-auto max-w-2xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-brand-gold">
              <Settings size={24} />
              <h1 className="text-3xl font-serif font-bold text-text-primary">Settings</h1>
            </div>
            <ShareButton />
          </div>
          <p className="text-text-muted">Customize your training experience and manage your account.</p>
        </div>

        {/* Board Customization */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-text-primary">
            <Palette size={20} className="text-brand-gold" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-sm">Appearance</h2>
          </div>
          
          <div className="bg-bg-card rounded-2xl border border-border-dark p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-text-primary">Fit to Screen</span>
                <span className="text-xs font-mono text-brand-gold">{fitToScreen}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={fitToScreen}
                onChange={(e) => setFitToScreen(parseInt(e.target.value))}
                className="w-full h-2 bg-bg-dark rounded-lg appearance-none cursor-pointer accent-brand-gold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setBoardTheme(theme.id)}
                  className={`group relative p-4 rounded-2xl border transition-all duration-300 ${
                    boardTheme === theme.id 
                      ? 'bg-brand-gold/10 border-brand-gold shadow-lg shadow-brand-gold/5' 
                      : 'bg-bg-dark border-border-dark hover:border-brand-gold/30'
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="grid grid-cols-2 w-16 h-16 rounded-lg overflow-hidden border border-white/10 rotate-45 scale-75 group-hover:scale-90 transition-transform">
                      <div style={{ backgroundColor: theme.light }} />
                      <div style={{ backgroundColor: theme.dark }} />
                      <div style={{ backgroundColor: theme.dark }} />
                      <div style={{ backgroundColor: theme.light }} />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-widest ${
                      boardTheme === theme.id ? 'text-brand-gold' : 'text-text-muted'
                    }`}>
                      {theme.name}
                    </span>
                  </div>
                  {boardTheme === theme.id && (
                    <motion.div 
                      layoutId="activeTheme"
                      className="absolute -top-2 -right-2 w-6 h-6 bg-brand-gold rounded-full flex items-center justify-center shadow-lg"
                    >
                      <div className="w-2 h-2 bg-bg-dark rounded-full" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Subscription */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-text-primary">
            <Shield size={20} className="text-brand-gold" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-sm">Subscription & Account</h2>
          </div>
          
          <div className="bg-bg-card rounded-2xl border border-border-dark p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold text-text-primary">Premium Status</p>
                <p className="text-xs text-text-muted">
                  {isPremium ? 'You have full access to all 150+ openings.' : 'Upgrade to unlock all openings and advanced stats.'}
                </p>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                isPremium ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20'
              }`}>
                {isPremium ? 'Active' : 'Free Tier'}
              </div>
            </div>

            {!isPremium && (
              <button 
                onClick={onShowPaywall}
                className="w-full py-4 rounded-xl bg-brand-gold text-bg-dark font-bold text-xs uppercase tracking-[2px] shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Upgrade to Premium
              </button>
            )}
            
            <div className="pt-6 border-t border-border-dark flex flex-col gap-4">
              <button className="flex items-center justify-between text-xs text-text-muted hover:text-text-primary transition-colors">
                <div className="flex items-center gap-3">
                  <CreditCard size={16} />
                  <span>Manage Billing</span>
                </div>
                <ExternalLink size={14} />
              </button>
              <button className="flex items-center justify-between text-xs text-text-muted hover:text-text-primary transition-colors">
                <div className="flex items-center gap-3">
                  <Info size={16} />
                  <span>Terms of Service</span>
                </div>
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* App Info */}
        <div className="pt-12 text-center space-y-2">
          <p className="text-[10px] text-text-muted uppercase tracking-[4px]">OpenPecker v1.0.4</p>
          <p className="text-[10px] text-text-muted">Crafted for chess mastery.</p>
        </div>
      </div>
    </div>
  );
}
