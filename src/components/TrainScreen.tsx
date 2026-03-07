import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useChessStore } from '../lib/state/chessStore';
import { Search, Lock, Play, Clock, Target, Repeat, Database, User, Download } from 'lucide-react';
import { Chess } from 'chess.js';

const OPENINGS = [
  { id: 'alekhineDefense', name: 'Alekhine Defense', group: 'Black vs e4', isPremium: false },
  { id: 'caroKannDefense', name: 'Caro-Kann Defense', group: 'Black vs e4', isPremium: false },
  { id: 'frenchDefense', name: 'French Defense', group: 'Black vs e4', isPremium: false },
  { id: 'modernDefense', name: 'Modern Defense', group: 'Black vs e4', isPremium: true },
  { id: 'pircDefense', name: 'Pirc Defense', group: 'Black vs e4', isPremium: true },
  { id: 'scandinavianDefense', name: 'Scandinavian Defense', group: 'Black vs e4', isPremium: false },
  { id: 'sicilianDefense', name: 'Sicilian Defense', group: 'Black vs e4', isPremium: false },

  { id: 'benoniDefense', name: 'Benoni Defense', group: 'Black vs d4', isPremium: true },
  { id: 'bogoIndianDefense', name: 'Bogo-Indian Defense', group: 'Black vs d4', isPremium: true },
  { id: 'dutchDefense', name: 'Dutch Defense', group: 'Black vs d4', isPremium: true },
  { id: 'grunfeldDefense', name: 'Grünfeld Defense', group: 'Black vs d4', isPremium: true },
  { id: 'kingsIndianDefense', name: 'King\'s Indian Defense', group: 'Black vs d4', isPremium: false },
  { id: 'nimzoIndianDefense', name: 'Nimzo-Indian Defense', group: 'Black vs d4', isPremium: false },
  { id: 'queensGambitAccepted', name: 'Queen\'s Gambit Accepted', group: 'Black vs d4', isPremium: false },
  { id: 'queensGambitDeclined', name: 'Queen\'s Gambit Declined', group: 'Black vs d4', isPremium: false },
  { id: 'slavDefense', name: 'Slav Defense', group: 'Black vs d4', isPremium: false },
  { id: 'trompowskyAttack', name: 'Trompowsky Attack', group: 'Black vs d4', isPremium: true },

  { id: 'birdOpening', name: 'Bird Opening', group: 'Flank / Others', isPremium: true },
  { id: 'catalanOpening', name: 'Catalan Opening', group: 'Flank / Others', isPremium: true },
  { id: 'englishOpening', name: 'English Opening', group: 'Flank / Others', isPremium: false },
  { id: 'kingsIndianAttack', name: 'King\'s Indian Attack', group: 'Flank / Others', isPremium: true },
  { id: 'nimzoLarsenAttack', name: 'Nimzo-Larsen Attack', group: 'Flank / Others', isPremium: true },
  { id: 'retiOpening', name: 'Reti Opening', group: 'Flank / Others', isPremium: false },

  { id: 'fourKnightsGame', name: 'Four Knights Game', group: 'White Openings', isPremium: true },
  { id: 'italianGame', name: 'Italian Game', group: 'White Openings', isPremium: false },
  { id: 'kingsGambit', name: 'King\'s Gambit', group: 'White Openings', isPremium: true },
  { id: 'londonSystem', name: 'London System', group: 'White Openings', isPremium: false },
  { id: 'petrovsDefense', name: 'Petrov\'s Defense', group: 'White Openings', isPremium: true },
  { id: 'philidorDefense', name: 'Philidor Defense', group: 'White Openings', isPremium: true },
  { id: 'queensPawnGame', name: 'Queen\'s Pawn Game', group: 'White Openings', isPremium: false },
  { id: 'ruyLopez', name: 'Ruy Lopez', group: 'White Openings', isPremium: false },
  { id: 'scotchGame', name: 'Scotch Game', group: 'White Openings', isPremium: true },
  { id: 'viennaGame', name: 'Vienna Game', group: 'White Openings', isPremium: true },
];

const PUZZLE_COUNTS = [10, 20, 50, 100, 150, 200, 400];
const CYCLE_COUNTS = [1, 3, 5, 7, 'Infinite'];

interface TrainScreenProps {
  onStart: () => void;
  onShowPaywall: () => void;
}

export default function TrainScreen({ onStart, onShowPaywall }: TrainScreenProps) {
  const { 
    isPremium, 
    selectedOpening, 
    setSelectedOpening,
    targetPuzzleCount,
    setTargetPuzzleCount,
    targetCycles,
    setTargetCycles,
    setPuzzles,
    setCurrentPuzzleIndex,
    setCorrectCount,
    setStartTime,
    addSavedSet
  } = useChessStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [repositoryStats, setRepositoryStats] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/lichess/repository')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          const stats: Record<string, number> = {};
          data.data.forEach((row: any) => {
            stats[row.theme] = row.count;
          });
          setRepositoryStats(stats);
        }
      })
      .catch(console.error);
  }, []);

  const filteredOpenings = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = OPENINGS.filter(o => o.name.toLowerCase().includes(query));
    
    // Group them
    const groups = filtered.reduce((acc, curr) => {
      if (!acc[curr.group]) acc[curr.group] = [];
      acc[curr.group].push(curr);
      return acc;
    }, {} as Record<string, typeof OPENINGS>);
    
    return groups;
  }, [searchQuery]);

  const handleStart = () => {
    if (!selectedOpening && selectedOpening !== 'custom_lichess') return;
    
    if (selectedOpening !== 'custom_lichess') {
      const opening = OPENINGS.find(o => o.id === selectedOpening);
      if (opening?.isPremium && !isPremium) {
        onShowPaywall();
        return;
      }
    }

    // Reset game state
    setPuzzles([]);
    setCurrentPuzzleIndex(0);
    setCorrectCount(0);
    setStartTime(Date.now());
    
    onStart();
  };

  // Estimate: 15 seconds per puzzle on average
  const estimatedSeconds = targetPuzzleCount * (typeof targetCycles === 'number' ? targetCycles : 1) * 15;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  const currentCachedCount = selectedOpening && selectedOpening !== 'custom_lichess' ? (repositoryStats[selectedOpening] || 0) : 0;

  return (
    <div className="h-full flex flex-col bg-bg-dark text-white overflow-y-auto p-6 md:p-10">
      <div className="max-w-4xl mx-auto w-full space-y-10">
        
        <div>
          <h1 className="font-serif text-4xl font-bold text-text-primary mb-2">Configure Training</h1>
          <p className="text-text-muted">Set up your spaced repetition cycle.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Opening Selection */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-bg-card border border-border-dark rounded-2xl p-6 flex flex-col h-[500px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                  <Target size={20} className="text-brand-gold" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Select Theme</h2>
                  <p className="text-xs text-text-muted">Choose an opening to practice</p>
                </div>
              </div>

              <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  type="text"
                  placeholder="Search openings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-dark border border-border-dark rounded-xl py-3 pl-12 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-gold/50 transition-colors"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                {Object.entries(filteredOpenings).map(([group, openings]) => (
                  <div key={group}>
                    <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3 sticky top-0 bg-bg-card py-1 z-10">
                      {group}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(openings as typeof OPENINGS).map(opening => {
                        const isSelected = selectedOpening === opening.id;
                        const isLocked = opening.isPremium && !isPremium;
                        const cachedCount = repositoryStats[opening.id] || 0;
                        
                        return (
                          <button
                            key={opening.id}
                            onClick={() => {
                              if (isLocked) onShowPaywall();
                              else setSelectedOpening(opening.id);
                            }}
                            className={`relative flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                              isSelected 
                                ? 'bg-brand-gold/10 border-brand-gold text-brand-gold' 
                                : isLocked
                                  ? 'bg-bg-dark/50 border-border-dark/50 text-text-muted hover:border-border-dark'
                                  : 'bg-bg-dark border-border-dark text-text-primary hover:border-brand-gold/50 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium pr-6">{opening.name}</span>
                              {cachedCount > 0 && !isLocked && (
                                <span className="text-[10px] text-emerald-500/80 mt-1 flex items-center gap-1">
                                  <Database size={10} /> {cachedCount} cached
                                </span>
                              )}
                            </div>
                            {isLocked && <Lock size={14} className="absolute right-4 text-text-muted" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {Object.keys(filteredOpenings).length === 0 && (
                  <div className="text-center py-10 text-text-muted text-sm">
                    No openings found matching "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Settings & Summary */}
          <div className="space-y-6">
            
            {/* Settings Card */}
            <div className="bg-bg-card border border-border-dark rounded-2xl p-6 space-y-8">
              
              {/* Puzzles per cycle */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-text-primary">Puzzles per Cycle</h3>
                  <span className="text-xs font-mono text-brand-gold">{targetPuzzleCount}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PUZZLE_COUNTS.map(count => (
                    <button
                      key={count}
                      onClick={() => setTargetPuzzleCount(count)}
                      className={`py-2 px-3 flex-1 min-w-[50px] rounded-lg text-xs font-bold transition-colors ${
                        targetPuzzleCount === count
                          ? 'bg-brand-gold text-bg-dark'
                          : 'bg-bg-dark border border-border-dark text-text-muted hover:text-white hover:border-brand-gold/30'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of cycles */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-text-primary">Target Cycles</h3>
                  <span className="text-xs font-mono text-brand-gold">{targetCycles}</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {CYCLE_COUNTS.map(count => (
                    <button
                      key={count}
                      onClick={() => setTargetCycles(count === 'Infinite' ? 999 : count as number)}
                      className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                        (targetCycles === count || (count === 'Infinite' && targetCycles === 999))
                          ? 'bg-brand-gold text-bg-dark'
                          : 'bg-bg-dark border border-border-dark text-text-muted hover:text-white hover:border-brand-gold/30'
                      }`}
                    >
                      {count === 'Infinite' ? '∞' : count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-b from-brand-gold/10 to-transparent border border-brand-gold/20 rounded-2xl p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-6">Session Summary</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm">
                  <Target size={16} className="text-text-muted" />
                  <span className="text-text-muted">Theme:</span>
                  <span className="font-bold text-text-primary ml-auto text-right">
                    {selectedOpening === 'custom_lichess' ? 'My Mistakes' : (OPENINGS.find(o => o.id === selectedOpening)?.name || 'None selected')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Repeat size={16} className="text-text-muted" />
                  <span className="text-text-muted">Total Puzzles:</span>
                  <span className="font-bold text-text-primary ml-auto">
                    {targetCycles === 999 ? '∞' : targetPuzzleCount * targetCycles}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={16} className="text-text-muted" />
                  <span className="text-text-muted">Est. Time:</span>
                  <span className="font-bold text-text-primary ml-auto">
                    {targetCycles === 999 ? '∞' : `~${estimatedMinutes} min`}
                  </span>
                </div>
                {selectedOpening && selectedOpening !== 'custom_lichess' && (
                  <div className="flex items-center gap-3 text-sm pt-4 border-t border-brand-gold/20">
                    <Database size={16} className="text-text-muted" />
                    <span className="text-text-muted">In Repository:</span>
                    <span className="font-bold text-emerald-500 ml-auto">
                      {currentCachedCount}
                    </span>
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                disabled={!selectedOpening}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-bg-dark font-bold text-sm tracking-[2px] uppercase shadow-[0_4px_20px_rgba(212,175,55,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Play size={18} className="fill-current" />
                <span>Start Session</span>
              </motion.button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
