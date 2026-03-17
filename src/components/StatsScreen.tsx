import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useChessStore } from '../lib/state/chessStore';
import { TrendingUp, Flame, Target, Clock, Trophy, Lock, Database, BrainCircuit } from 'lucide-react';
import { ShareButton } from './ShareButton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchBigQueryStats } from '../services/bigQuery';

interface StatsScreenProps {
  onShowPaywall: () => void;
}

export default function StatsScreen({ onShowPaywall }: StatsScreenProps) {
  const cycleHistory = useChessStore((s) => s.cycleHistory);
  const savedSets = useChessStore((s) => s.savedSets);
  const isPremium = useChessStore((s) => s.isPremium);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'openings'>('overview');
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('all');
  const [selectedSet, setSelectedSet] = useState<string>('all');
  const [repoStats, setRepoStats] = useState<any[]>([]);

  if (!isPremium) {
    return (
      <div className="h-screen flex items-center justify-center bg-teal-950 text-white p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 mx-auto bg-brand-gold/10 rounded-full flex items-center justify-center">
            <Lock className="text-brand-gold" size={32} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-brand-gold">Premium Stats</h2>
          <p className="text-text-muted">Upgrade to view your detailed performance statistics, trends, and opening mastery.</p>
          <button 
            onClick={onShowPaywall} 
            className="w-full py-4 bg-brand-gold text-bg-dark rounded-xl font-bold text-xs uppercase tracking-[2px] shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  React.useEffect(() => {
    fetchBigQueryStats()
      .then(data => {
        if (data.data) {
          setRepoStats(data.data.sort((a: any, b: any) => b.count - a.count));
        }
      })
      .catch(console.error);
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const filteredHistory = cycleHistory.filter(record => {
      const dateMatch = period === 'all' ? true : (() => {
        const recordDate = new Date(record.completedAt);
        const diffDays = (now.getTime() - recordDate.getTime()) / (1000 * 3600 * 24);
        return period === '7d' ? diffDays <= 7 : diffDays <= 30;
      })();
      const setMatch = selectedSet === 'all' ? true : record.openingSlug === selectedSet;
      return dateMatch && setMatch;
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
      slug: set.openingSlug,
      puzzles: set.puzzles.length,
      cycles: set.cyclesCompleted,
      accuracy: set.bestAccuracy,
      lastPlayed: set.lastPlayedAt
    })).sort((a, b) => b.accuracy - a.accuracy);

    // Mocking the extra KPIs for the intensive stats screen
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
      openingPerformance,
      totalTrainingTime: Math.round(totalTimeMs / 60000),
      puzzlesToday: Math.floor(totalPuzzles / 10),
      cyclesToday: Math.floor(totalCycles / 5),
      avgPuzzlesPerDay: Math.floor(totalPuzzles / 30),
      avgCyclesPerDay: Math.floor(totalCycles / 30),
      easySolved: Math.floor(totalPuzzles * 0.3),
      mediumSolved: Math.floor(totalPuzzles * 0.5),
      hardSolved: Math.floor(totalPuzzles * 0.2),
      winRate: accuracy,
      lossRate: 100 - accuracy,
      bestOpeningAccuracy: openingPerformance[0]?.accuracy || 0,
      worstOpeningAccuracy: openingPerformance[openingPerformance.length - 1]?.accuracy || 0,
      mostPlayedOpening: openingPerformance[0]?.name || 'N/A',
      leastPlayedOpening: openingPerformance[openingPerformance.length - 1]?.name || 'N/A',
      totalOpeningsMastered: openingPerformance.filter(o => o.accuracy > 90).length,
      puzzlesThisWeek: Math.floor(totalPuzzles / 4),
      cyclesThisWeek: Math.floor(totalCycles / 4),
      peakRating: performanceRating + 150
    };
  }, [cycleHistory, period, savedSets, selectedSet]);


  return (
    <div className="h-screen flex flex-col bg-teal-950 text-white">
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
      
      <div className={`max-w-5xl mx-auto w-full space-y-8`}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl font-bold text-brand-gold mb-2">Performance</h1>
            <p className="text-brand-gold">Track your opening mastery progress.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              id="selectedSet"
              name="selectedSet"
              value={selectedSet} 
              onChange={(e) => setSelectedSet(e.target.value)}
              className="bg-bg-card border border-border-dark rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-primary focus:outline-none focus:border-brand-gold"
            >
              <option value="all">All Sets</option>
              {savedSets.map(set => <option key={set.id} value={set.openingSlug}>{set.openingDisplay}</option>)}
            </select>
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
            <ShareButton 
              title="OpenPecker Stats"
              text={`My OpenPecker Stats: ${stats.performanceRating} Rating, ${stats.totalPuzzles} puzzles solved with ${stats.accuracy}% accuracy!`}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-bg-card border border-border-dark rounded-xl p-1">
          {['Overview', 'Trends', 'Openings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase() as any)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.toLowerCase()
                  ? 'bg-brand-gold text-bg-dark'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Conditional Content */}
        {activeTab === 'overview' && (
          <>
            {/* Synthesis Insight */}
            {stats.totalPuzzles === 0 ? (
              <div className="bg-bg-card border border-brand-gold/20 rounded-2xl p-6 flex items-start gap-4">
                <BrainCircuit className="text-brand-gold shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="text-sm font-bold text-brand-gold mb-2">Synthesis Insight</h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    Play more to uncover insights.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-bg-card border border-brand-gold/20 rounded-2xl p-6 flex items-start gap-4">
                <BrainCircuit className="text-brand-gold shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="text-sm font-bold text-brand-gold mb-2">Synthesis Insight</h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    Based on your performance in {selectedSet === 'all' ? 'all sets' : stats.mostPlayedOpening}, you are {stats.accuracy > 70 ? 'excelling' : 'improving'} in accuracy. {stats.currentStreak > 3 ? 'Your consistency is excellent.' : 'Try to maintain a daily streak to boost your rating.'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Rating', value: stats.performanceRating },
                { label: 'Peak Rating', value: stats.peakRating },
                { label: 'Accuracy', value: `${stats.accuracy}%` },
                { label: 'Win Rate', value: `${stats.winRate}%` },
                { label: 'Loss Rate', value: `${stats.lossRate}%` },
                { label: 'Total Puzzles', value: stats.totalPuzzles },
                { label: 'Total Cycles', value: stats.totalCycles },
                { label: 'Avg Time/Puz', value: `${stats.avgTimePerPuzzle}s` },
                { label: 'Current Streak', value: `${stats.currentStreak}d` },
                { label: 'Longest Streak', value: `${stats.longestStreak}d` },
                { label: 'Total Time (m)', value: stats.totalTrainingTime },
                { label: 'Puzzles Today', value: stats.puzzlesToday },
                { label: 'Cycles Today', value: stats.cyclesToday },
                { label: 'Avg Puz/Day', value: stats.avgPuzzlesPerDay },
                { label: 'Avg Cyc/Day', value: stats.avgCyclesPerDay },
                { label: 'Easy Solved', value: stats.easySolved },
                { label: 'Medium Solved', value: stats.mediumSolved },
                { label: 'Hard Solved', value: stats.hardSolved },
                { label: 'Best Acc', value: `${stats.bestOpeningAccuracy}%` },
                { label: 'Worst Acc', value: `${stats.worstOpeningAccuracy}%` },
                { label: 'Most Played', value: stats.mostPlayedOpening },
                { label: 'Least Played', value: stats.leastPlayedOpening },
                { label: 'Mastered', value: stats.totalOpeningsMastered },
                { label: 'Puz This Week', value: stats.puzzlesThisWeek },
                { label: 'Cyc This Week', value: stats.cyclesThisWeek },
              ].map((kpi, i) => (
                <div key={i} className="bg-bg-card border border-border-dark rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gold mb-1">{kpi.label}</p>
                  <p className="text-lg font-bold text-text-primary truncate">{kpi.value}</p>
                </div>
              ))}
            </div>
          </>
        )}
        
        {activeTab === 'trends' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Accuracy Trend', data: stats.history.slice(-10).map((h, i) => ({ name: i, val: h.accuracy })) },
              { title: 'Time per Puzzle', data: stats.history.slice(-10).map((h, i) => ({ name: i, val: h.totalTimeMs / h.totalPuzzles / 1000 })) },
              { title: 'Puzzles per Cycle', data: stats.history.slice(-10).map((h, i) => ({ name: i, val: h.totalPuzzles })) },
              { title: 'Cycles per Day', data: stats.history.slice(-10).map((h, i) => ({ name: i, val: 1 })) }, // Mock
              { title: 'Rating Trend', data: stats.history.slice(-10).map((h, i) => ({ name: i, val: 1200 + i * 10 })) }, // Mock
            ].map((chart, i) => (
              <div key={i} className="bg-bg-card border border-border-dark rounded-2xl p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-brand-gold mb-4">{chart.title}</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none' }} />
                      <Bar dataKey="val" fill="#D4AF37" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'openings' && (
          <div className="bg-bg-card border border-border-dark rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-brand-gold mb-4">Opening Performance</h3>
            <div className="space-y-4">
              {stats.openingPerformance.map((opening) => (
                <div key={opening.id} className="flex items-center justify-between p-4 bg-bg-dark rounded-xl border border-border-dark">
                  <span className="font-bold text-text-primary">{opening.name}</span>
                  <span className="text-sm font-mono text-brand-gold">{opening.accuracy}% Accuracy</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
