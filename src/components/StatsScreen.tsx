import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useChessStore } from '../lib/state/chessStore';
import { TrendingUp, Flame, Target, Clock, Trophy, Lock, Share2, Database } from 'lucide-react';

interface StatsScreenProps {
  onShowPaywall: () => void;
}

export default function StatsScreen({ onShowPaywall }: StatsScreenProps) {
  const { cycleHistory, savedSets, isPremium } = useChessStore();
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('all');

  const stats = useMemo(() => {
    const now = new Date();
    const filteredHistory = cycleHistory.filter(record => {
      if (period === 'all') return true;
      const recordDate = new Date(record.completedAt);
      const diffDays = (now.getTime() - recordDate.getTime()) / (1000 * 3600 * 24);
      return period === '7d' ? diffDays <= 7 : diffDays <= 30;
    });

    const totalPuzzles = filteredHistory.reduce((sum, r) => sum + r.totalPuzzles, 0);
    const correctPuzzles = filteredHistory.reduce((sum, r) => sum + r.correctCount, 0);
    const accuracy = totalPuzzles > 0 ? Math.round((correctPuzzles / totalPuzzles) * 100) : 0;
    const totalTimeMs = filteredHistory.reduce((sum, r) => sum + r.totalTimeMs, 0);
    const avgTimePerPuzzle = totalPuzzles > 0 ? Math.round((totalTimeMs / totalPuzzles) / 1000) : 0;
    const totalCycles = filteredHistory.length;

    // Calculate a mock "Performance Rating"
    const baseRating = 1200;
    const ratingBonus = (accuracy - 50) * 10 + (totalCycles * 5);
    const performanceRating = Math.max(400, baseRating + ratingBonus);

    // Calculate Streaks (mock logic based on dates)
    let currentStreak = 0;
    let longestStreak = 0;
    if (filteredHistory.length > 0) {
      // Simplified streak calculation for demo
      currentStreak = Math.min(filteredHistory.length, 5);
      longestStreak = Math.max(currentStreak, 12);
    }

    // Calculate performance per opening from savedSets
    const openingPerformance = savedSets.map(set => ({
      id: set.id,
      name: set.openingDisplay,
      puzzles: set.puzzles.length,
      cycles: set.cyclesCompleted,
      accuracy: set.bestAccuracy,
      lastPlayed: set.lastPlayedAt
    })).sort((a, b) => b.accuracy - a.accuracy);

    return {
      totalPuzzles,
      correctPuzzles,
      accuracy,
      avgTimePerPuzzle,
      totalCycles,
      performanceRating,
      currentStreak,
      longestStreak,
      history: filteredHistory,
      openingPerformance
    };
  }, [cycleHistory, period, savedSets]);

  const handleShare = () => {
    const text = `My OpenPecker Stats: ${stats.performanceRating} Rating, ${stats.totalPuzzles} puzzles solved with ${stats.accuracy}% accuracy!`;
    if (navigator.share) {
      navigator.share({
        title: 'OpenPecker Stats',
        text: text,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert('Stats copied to clipboard!');
    }
  };

  return (
    <div className="h-full relative flex flex-col bg-bg-dark text-white overflow-y-auto p-6 md:p-10">
      
      {/* Full Page Paywall Overlay */}
      {!isPremium && (
        <div className="absolute inset-0 z-50 bg-bg-dark/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(212,175,55,0.2)]">
            <Lock size={36} className="text-brand-gold" />
          </div>
          <h2 className="font-serif text-4xl font-bold text-text-primary mb-4">Premium Analytics</h2>
          <p className="text-text-muted max-w-md mb-8 leading-relaxed">
            Unlock comprehensive performance tracking, opening-specific analytics, historical progress charts, and accuracy breakdowns.
          </p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onShowPaywall}
            className="px-8 py-4 bg-brand-gold text-bg-dark rounded-xl font-bold text-sm uppercase tracking-widest shadow-[0_4px_20px_rgba(212,175,55,0.3)]"
          >
            Upgrade to Premium
          </motion.button>
        </div>
      )}

      <div className={`max-w-5xl mx-auto w-full space-y-8 ${!isPremium ? 'opacity-20 pointer-events-none select-none blur-sm' : ''}`}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl font-bold text-text-primary mb-2">Performance</h1>
            <p className="text-text-muted">Track your opening mastery progress.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-bg-card border border-border-dark rounded-xl p-1">
              {(['7d', '30d', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    period === p 
                      ? 'bg-brand-gold text-bg-dark' 
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button 
              onClick={handleShare}
              className="p-2.5 bg-bg-card border border-border-dark rounded-xl text-text-muted hover:text-brand-gold hover:border-brand-gold/30 transition-colors"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Stats Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Rating Card */}
            <div className="bg-gradient-to-br from-bg-card to-bg-dark border border-border-dark rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="w-32 h-32 rounded-full bg-bg-dark border-4 border-brand-gold flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                  <div className="text-center">
                    <span className="block font-serif text-3xl font-bold text-brand-gold">{stats.performanceRating}</span>
                    <span className="text-[10px] uppercase tracking-widest text-text-muted">Rating</span>
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-2 gap-6 w-full">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1">Total Solved</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.totalPuzzles}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1">Cycles Done</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.totalCycles}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1">Accuracy</p>
                    <p className="text-2xl font-bold text-emerald-500">{stats.accuracy}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1">Avg Time</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.avgTimePerPuzzle}s</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Streaks */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-bg-card border border-border-dark rounded-2xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Flame size={24} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Current Streak</p>
                  <p className="text-xl font-bold text-text-primary">{stats.currentStreak} Days</p>
                </div>
              </div>
              <div className="bg-bg-card border border-border-dark rounded-2xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center">
                  <Trophy size={24} className="text-brand-gold" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Longest Streak</p>
                  <p className="text-xl font-bold text-text-primary">{stats.longestStreak} Days</p>
                </div>
              </div>
            </div>

            {/* Opening Performance Table */}
            <div className="bg-bg-card border border-border-dark rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Opening Performance</h3>
                <Database size={16} className="text-brand-gold" />
              </div>
              
              {stats.openingPerformance.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">
                  No sets created yet. Start training to see your performance!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-dark text-[10px] uppercase tracking-widest text-text-muted">
                        <th className="pb-3 font-bold">Opening</th>
                        <th className="pb-3 font-bold text-right">Puzzles</th>
                        <th className="pb-3 font-bold text-right">Cycles</th>
                        <th className="pb-3 font-bold text-right">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {stats.openingPerformance.map((op) => (
                        <tr key={op.id} className="border-b border-border-dark/50 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="py-4 font-medium text-text-primary">{op.name}</td>
                          <td className="py-4 text-right text-text-muted font-mono">{op.puzzles}</td>
                          <td className="py-4 text-right text-text-muted font-mono">{op.cycles}</td>
                          <td className="py-4 text-right font-bold text-emerald-500">{op.accuracy}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Premium Stats */}
          <div className="space-y-6">
            <div className="bg-bg-card border border-border-dark rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted mb-6">Results Breakdown</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-text-muted">Wins</span>
                    <span className="font-bold text-emerald-500">{stats.accuracy}%</span>
                  </div>
                  <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${stats.accuracy}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-text-muted">Losses</span>
                    <span className="font-bold text-red-500">{100 - stats.accuracy}%</span>
                  </div>
                  <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${100 - stats.accuracy}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-border-dark">
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted mb-6">Difficulty Mix</h3>
                <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                  <div className="bg-blue-400 w-[30%]" title="Easy" />
                  <div className="bg-brand-gold w-[50%]" title="Medium" />
                  <div className="bg-red-500 w-[20%]" title="Hard" />
                </div>
                <div className="flex justify-between mt-3 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  <span>Easy 30%</span>
                  <span>Med 50%</span>
                  <span>Hard 20%</span>
                </div>
              </div>
            </div>
            
            {/* Recent Progress (Mock Chart) */}
            <div className="bg-bg-card border border-border-dark rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Recent Accuracy</h3>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
              <div className="h-32 flex items-end justify-between gap-2">
                {/* Generate some mock bars based on history or random if empty */}
                {Array.from({ length: 14 }).map((_, i) => {
                  const height = stats.history.length > 0 
                    ? Math.max(20, Math.min(100, stats.accuracy + (Math.random() * 40 - 20)))
                    : Math.random() * 100;
                  return (
                    <div key={i} className="w-full bg-bg-dark rounded-t-sm relative group">
                      <div 
                        className="absolute bottom-0 w-full bg-brand-gold/50 rounded-t-sm transition-all group-hover:bg-brand-gold"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
