import React, { useState } from 'react';
import { Search, Download, Play, AlertCircle, Loader2, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { useChessStore } from '../lib/state/chessStore';
import { searchLichessPuzzles } from '../services/lichessDatabase';
import { SavedSet } from '../types';

interface DatabaseScreenProps {
  onStart: () => void;
  onShowPaywall: () => void;
}

const THEMES = [
  'mate', 'mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5',
  'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck',
  'endgame', 'middlegame', 'opening', 'sacrifice', 'quietMove',
  'defensiveMove', 'clearance', 'attraction', 'deflection',
  'interference', 'intermezzo', 'xRayAttack', 'zugzwang'
];

export default function DatabaseScreen({ onStart, onShowPaywall }: DatabaseScreenProps) {
  const [minRating, setMinRating] = useState(1000);
  const [maxRating, setMaxRating] = useState(1500);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [limit, setLimit] = useState(50);
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isPremium = useChessStore((s) => s.isPremium);
  const saveSet = useChessStore((s) => s.saveSet);
  const setActiveSet = useChessStore((s) => s.setActiveSet);

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev => 
      prev.includes(theme) 
        ? prev.filter(t => t !== theme)
        : [...prev, theme]
    );
  };

  const handleSearch = async () => {
    if (!isPremium) {
      onShowPaywall();
      return;
    }

    setIsSearching(true);
    setError(null);
    setProgress(0);

    try {
      const puzzles = await searchLichessPuzzles({
        minRating,
        maxRating,
        themes: selectedThemes,
        limit
      }, (count) => {
        setProgress(count);
      });

      if (puzzles.length === 0) {
        setError('No puzzles found matching your criteria.');
        setIsSearching(false);
        return;
      }

      const setName = `DB: ${minRating}-${maxRating} ${selectedThemes.join(', ')}`.substring(0, 30);
      
      const newSet: SavedSet = {
        id: `db-${Date.now()}`,
        openingSlug: 'database',
        openingDisplay: setName,
        puzzleCount: puzzles.length,
        targetCycles: 3,
        cyclesCompleted: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        bestAccuracy: 0,
        totalAttempts: 0,
        puzzles: puzzles,
      };

      saveSet(newSet);
      setActiveSet(newSet.id);
      onStart();

    } catch (err: any) {
      console.error('Search failed:', err);
      setError(err.message || 'Failed to search database. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold text-text-primary mb-2">
              Lichess Database
            </h2>
            <p className="text-text-secondary">
              Search and batch download up to 400 puzzles directly from the open Lichess puzzle database.
            </p>
          </div>
          {!isPremium && (
            <div className="px-3 py-1 bg-brand-gold/10 border border-brand-gold/30 rounded-full text-brand-gold text-sm font-medium">
              Premium Feature
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Filters Column */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-bg-card border border-border-dark rounded-xl p-6">
              <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-brand-blue" />
                Search Filters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Rating Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={minRating}
                      onChange={(e) => setMinRating(parseInt(e.target.value) || 0)}
                      className="w-full bg-bg-dark border border-border-dark rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-blue"
                      placeholder="Min"
                    />
                    <span className="text-text-secondary">-</span>
                    <input
                      type="number"
                      value={maxRating}
                      onChange={(e) => setMaxRating(parseInt(e.target.value) || 0)}
                      className="w-full bg-bg-dark border border-border-dark rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-blue"
                      placeholder="Max"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Number of Puzzles
                  </label>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    className="w-full bg-bg-dark border border-border-dark rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-blue"
                  >
                    <option value={50}>50 Puzzles</option>
                    <option value={100}>100 Puzzles</option>
                    <option value={200}>200 Puzzles</option>
                    <option value={400}>400 Puzzles (Max)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Themes Column */}
          <div className="md:col-span-2">
            <div className="bg-bg-card border border-border-dark rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-text-primary">
                  Puzzle Themes
                </h3>
                <span className="text-sm text-text-secondary">
                  {selectedThemes.length} selected
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {THEMES.map((theme) => {
                  const isSelected = selectedThemes.includes(theme);
                  return (
                    <button
                      key={theme}
                      onClick={() => toggleTheme(theme)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-brand-blue text-white'
                          : 'bg-bg-dark text-text-secondary hover:text-text-primary border border-border-dark hover:border-border-hover'
                      }`}
                    >
                      {theme}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* Action Area */}
        <div className="bg-bg-card border border-border-dark rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {isSearching ? (
            <div className="space-y-4 w-full max-w-md">
              <div className="flex items-center justify-center gap-3 text-brand-blue">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="font-medium">Searching Database...</span>
              </div>
              <div className="w-full bg-bg-dark rounded-full h-2 overflow-hidden">
                <motion.div 
                  className="h-full bg-brand-blue"
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress / limit) * 100}%` }}
                />
              </div>
              <p className="text-sm text-text-secondary">
                Found {progress} / {limit} puzzles
              </p>
            </div>
          ) : (
            <>
              <p className="text-text-secondary max-w-lg">
                This will search the Lichess puzzle database for puzzles matching your criteria and create a new training set.
              </p>
              <button
                onClick={handleSearch}
                className="flex items-center gap-2 px-8 py-4 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-blue/20"
              >
                <Search className="w-5 h-5" />
                Search & Create Set
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
