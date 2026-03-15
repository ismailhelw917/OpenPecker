import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useChessStore } from '../lib/state/chessStore';
import { SavedSet } from '../types';
import { Lock, Play, Download, User, Target, Clock, Repeat } from 'lucide-react';
import { ShareButton } from './ShareButton';
import { Chess } from 'chess.js';

interface PersonalizedScreenProps {
  onStart: () => void;
  onShowPaywall: () => void;
}

const PUZZLE_COUNTS = [10, 20, 50, 100, 150, 200, 400];
const CYCLE_COUNTS = [1, 3, 5, 7, 'Infinite'];

export default function PersonalizedScreen({ onStart, onShowPaywall }: PersonalizedScreenProps) {
  const { 
    isPremium, 
    targetPuzzleCount,
    setTargetPuzzleCount,
    targetCycles,
    setTargetCycles,
    setPuzzles,
    setCurrentPuzzleIndex,
    setCorrectCount,
    setStartTime,
    addSavedSet,
    setSelectedOpening
  } = useChessStore();

  const [lichessUsername, setLichessUsername] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');

  const generateFromLichess = async () => {
    if (!lichessUsername) return;
    if (!isPremium) {
      onShowPaywall();
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('Fetching your recent games...');
    
    try {
      const url = `https://lichess.org/api/games/user/${lichessUsername}?max=50&analysed=true&evals=true&moves=true&perfType=blitz,rapid,classical`;
      const response = await fetch(url, { headers: { 'Accept': 'application/x-ndjson' } });
      
      if (!response.ok) throw new Error('Failed to fetch games');
      
      const text = await response.text();
      const games = text.split('\n').filter(x => x !== '').map(x => JSON.parse(x));
      
      setGenerationStatus('Analyzing opening blunders...');
      
      const generatedPuzzles = [];
      
      for (let game of games) {
        if (!game.analysis || !game.moves) continue;
        
        const moves = game.moves.split(' ');
        // Only look at the first 20 moves (opening phase)
        const maxMoves = Math.min(game.analysis.length, 20);
        
        for (let index = 1; index < maxMoves; index++) {
          const move = game.analysis[index];
          const prevMove = game.analysis[index-1];
          
          // Find blunders where the previous move was also a blunder (tactical opportunity)
          if (move.judgment && move.judgment.name === 'Blunder' && prevMove.judgment && prevMove.judgment.name === 'Blunder') {
            const blunderIndex = index - 1;
            const blunderMove = moves[blunderIndex];
            
            // Reconstruct the FEN before the blunder
            const chess = new Chess();
            for (let i = 0; i < blunderIndex; i++) {
              chess.move(moves[i]);
            }
            
            const fen = chess.fen();
            
            // The solution is the variation provided by Lichess analysis
            if (move.variation) {
              const variationMoves = move.variation.split(' ');
              // Convert SAN to UCI for react-chessboard
              const solutionUci = [];
              const simChess = new Chess(fen);
              
              // Apply the blunder first
              const bMove = simChess.move(blunderMove);
              const initialMoveUci = bMove ? bMove.from + bMove.to + (bMove.promotion || '') : '';
              
              let validVariation = true;
              for (let vMove of variationMoves) {
                try {
                  const m = simChess.move(vMove);
                  if (m) {
                    solutionUci.push(m.from + m.to + (m.promotion || ''));
                  } else {
                    validVariation = false;
                    break;
                  }
                } catch (e) {
                  validVariation = false;
                  break;
                }
              }
              
              if (validVariation && solutionUci.length >= 2) {
                generatedPuzzles.push({
                  puzzle: {
                    id: `custom_${game.id}_${blunderIndex}`,
                    fen: fen,
                    initialMove: initialMoveUci,
                    solution: solutionUci,
                    rating: 1500,
                    themes: ['custom', 'opening']
                  }
                });
              }
            }
          }
        }
      }
      
      if (generatedPuzzles.length > 0) {
        setGenerationStatus(`Found ${generatedPuzzles.length} opening tactics!`);
        
        // Save as a custom set
        const newSet: SavedSet = {
          id: `custom_${Date.now()}`,
          openingSlug: 'custom_lichess',
          openingDisplay: `My Mistakes (${lichessUsername})`,
          puzzleCount: generatedPuzzles.length,
          targetCycles: Number(targetCycles),
          cyclesCompleted: 0,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          lastPlayedAt: new Date().toISOString(),
          bestAccuracy: 0,
          totalAttempts: 0,
          puzzles: generatedPuzzles.slice(0, targetPuzzleCount),
        } as any;
        
        addSavedSet(newSet);
        setPuzzles(newSet.puzzles);
        setCurrentPuzzleIndex(0);
        setCorrectCount(0);
        setStartTime(Date.now());
        setSelectedOpening('custom_lichess');
        
        onStart();
      } else {
        setGenerationStatus('No opening blunders found in recent games.');
        setTimeout(() => setIsGenerating(false), 3000);
      }
      
    } catch (error) {
      console.error(error);
      setGenerationStatus('Error generating tactics.');
      setTimeout(() => setIsGenerating(false), 3000);
    }
  };

  const estimatedSeconds = targetPuzzleCount * (targetCycles === 999 ? 1 : targetCycles) * 15;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  return (
    <div className="h-full flex flex-col bg-bg-dark text-white overflow-y-auto p-6 md:p-10 relative">
      <div className="max-w-4xl mx-auto w-full space-y-10">
        
        <div>
          <h1 className="font-serif text-4xl font-bold text-text-primary mb-2">Personalized Tactics</h1>
          <p className="text-text-muted">Generate puzzles from your own Lichess mistakes.</p>
        </div>
        <ShareButton className="absolute top-6 right-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-r from-brand-gold/20 to-bg-card border border-brand-gold/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center">
                  <User size={20} className="text-brand-gold" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Lichess Integration</h2>
                  <p className="text-xs text-text-muted">Analyze your last 50 games for opening blunders</p>
                </div>
                {!isPremium && <Lock size={16} className="text-brand-gold ml-auto" />}
              </div>
              
              <div className="flex gap-3">
                <input 
                  id="lichessUsername"
                  name="lichessUsername"
                  type="text"
                  placeholder="Lichess Username"
                  value={lichessUsername}
                  onChange={(e) => setLichessUsername(e.target.value)}
                  className="flex-1 bg-bg-dark border border-border-dark rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-gold/50 transition-colors"
                />
                <button
                  onClick={generateFromLichess}
                  disabled={isGenerating || !lichessUsername}
                  className="px-6 py-3 bg-brand-gold text-bg-dark rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-gold/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <span className="animate-pulse">{generationStatus || 'Generating...'}</span>
                  ) : (
                    <>
                      <Download size={16} /> Generate
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="bg-bg-card border border-border-dark rounded-2xl p-6">
              <h3 className="text-sm font-bold text-text-primary mb-4">How it works</h3>
              <ul className="space-y-3 text-sm text-text-muted">
                <li className="flex gap-2"><span className="text-brand-gold">•</span> We fetch your last 50 analyzed games from Lichess.</li>
                <li className="flex gap-2"><span className="text-brand-gold">•</span> We scan the first 20 moves (the opening phase) of each game.</li>
                <li className="flex gap-2"><span className="text-brand-gold">•</span> We identify positions where you made a blunder and missed a tactical opportunity.</li>
                <li className="flex gap-2"><span className="text-brand-gold">•</span> We generate a custom puzzle set so you can practice the exact tactics you missed!</li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-bg-card border border-border-dark rounded-2xl p-6 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-text-primary">Max Puzzles</h3>
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

            <div className="bg-gradient-to-b from-brand-gold/10 to-transparent border border-brand-gold/20 rounded-2xl p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-6">Session Summary</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm">
                  <Target size={16} className="text-text-muted" />
                  <span className="text-text-muted">Theme:</span>
                  <span className="font-bold text-text-primary ml-auto text-right">My Mistakes</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Repeat size={16} className="text-text-muted" />
                  <span className="text-text-muted">Max Puzzles:</span>
                  <span className="font-bold text-text-primary ml-auto">
                    {targetCycles === 999 ? '∞' : Number(targetPuzzleCount) * Number(targetCycles)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={16} className="text-text-muted" />
                  <span className="text-text-muted">Est. Time:</span>
                  <span className="font-bold text-text-primary ml-auto">
                    {targetCycles === 999 ? '∞' : `~${estimatedMinutes} min`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
