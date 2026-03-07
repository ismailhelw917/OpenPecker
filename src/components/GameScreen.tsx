import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { motion, AnimatePresence } from 'motion/react';
import { useChessStore } from '../lib/state/chessStore';
import { ChevronLeft, RotateCcw, CheckCircle2, XCircle, Timer } from 'lucide-react';

interface GameScreenProps {
  onBack: () => void;
}

export default function GameScreen({ onBack }: GameScreenProps) {
  const { 
    puzzles, 
    setPuzzles,
    currentPuzzleIndex, 
    setCurrentPuzzleIndex,
    correctCount,
    setCorrectCount,
    startTime,
    updateSavedSet,
    savedSets,
    addCycleRecord,
    selectedOpening,
    targetPuzzleCount,
    targetCycles,
    addSavedSet,
    boardTheme,
    setBoardTheme
  } = useChessStore();

  const [game, setGame] = useState(new Chess());
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'correct' | 'wrong' | 'completed'>('playing');
  const [hint, setHint] = useState<string | null>(null);
  const getBoardColors = () => {
    switch (boardTheme) {
      case 'blue':
        return { light: '#dee3e6', dark: '#8ca2ad' };
      case 'green':
        return { light: '#ffffdd', dark: '#86a666' };
      case 'brown':
      default:
        return { light: '#f0d9b5', dark: '#b58863' };
    }
  };

  const boardColors = getBoardColors();
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // Fetch puzzles if empty
  useEffect(() => {
    if (puzzles.length === 0 && selectedOpening && !loading && !hasFetchedRef.current) {
      const fetchPuzzles = async () => {
        hasFetchedRef.current = true;
        setLoading(true);
        try {
          const theme = selectedOpening;
          console.log('Fetching puzzles for theme:', theme);
          const response = await fetch(`/api/lichess/puzzles?theme=${theme}&count=${targetPuzzleCount}`);
          const result = await response.json();
          
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            console.log('Successfully fetched puzzles:', result.data.length);
            setPuzzles(result.data);
            
            // Create a new set if this is a fresh start
            // Format camelCase to Title Case for display
            const openingDisplay = selectedOpening
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase());
              
            const newSet: any = {
              id: Date.now().toString(),
              openingSlug: selectedOpening,
              openingDisplay: openingDisplay,
              puzzleCount: result.data.length,
              targetCycles: targetCycles,
              cyclesCompleted: 0,
              status: 'active',
              createdAt: new Date().toISOString(),
              lastPlayedAt: new Date().toISOString(),
              bestAccuracy: 0,
              totalAttempts: 0,
              puzzles: result.data,
            };
            addSavedSet(newSet);
          } else {
            console.warn('No puzzles returned from API:', result);
            // Fallback to a broader theme if specific one fails
            if (theme !== 'opening') {
               console.log('Retrying with broader theme: opening');
               const retryResponse = await fetch(`/api/lichess/puzzles?theme=opening&count=${targetPuzzleCount}`);
               const retryResult = await retryResponse.json();
               if (retryResult.data && Array.isArray(retryResult.data)) {
                 setPuzzles(retryResult.data);
               }
            }
          }
        } catch (error) {
          console.error('Error fetching puzzles:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchPuzzles();
    }
  }, [puzzles.length, selectedOpening, targetPuzzleCount, targetCycles, setPuzzles, addSavedSet, loading]);

  const currentPuzzle = puzzles[currentPuzzleIndex];
  const activeSet = savedSets.find(s => s.status === 'active');

  console.log('GameScreen puzzles:', puzzles.length, 'currentIndex:', currentPuzzleIndex);

  const [orientation, setOrientation] = useState<'white' | 'black'>('white');

  // Initialize puzzle
  useEffect(() => {
    if (currentPuzzle) {
      console.log('Initializing puzzle:', currentPuzzle.puzzle.id);
      
      let newGame = new Chess();
      let initialMove = currentPuzzle.puzzle.initialMove;
      
      // Handle Lichess API format (has game.pgn)
      if (currentPuzzle.game && currentPuzzle.game.pgn) {
        newGame.loadPgn(currentPuzzle.game.pgn);
        const lastMove = newGame.undo(); // Undo opponent's last move
        if (lastMove) {
          initialMove = lastMove.from + lastMove.to + (lastMove.promotion || '');
        }
      } 
      // Handle custom format (has puzzle.fen)
      else if (currentPuzzle.puzzle.fen) {
        newGame = new Chess(currentPuzzle.puzzle.fen);
      }

      // Set orientation based on whose turn it will be AFTER the initial move
      const userColor = newGame.turn() === 'w' ? 'black' : 'white';
      setOrientation(userColor);
      
      // Set the board to the state BEFORE the initial move
      setGame(new Chess(newGame.fen()));
      setMoveIndex(0);
      setStatus('playing');
      setHint(null);

      // Animate the initial move
      if (initialMove) {
        const from = initialMove.slice(0, 2);
        const to = initialMove.slice(2, 4);
        const promotion = initialMove.length > 4 ? initialMove.slice(4, 5) : 'q';
        
        setTimeout(() => {
          const animatedGame = new Chess(newGame.fen());
          animatedGame.move({ from, to, promotion });
          setGame(animatedGame);
        }, 600);
      }
    }
  }, [currentPuzzleIndex, puzzles, currentPuzzle]);

  const onPieceDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (status !== 'playing' || loading) return false;
    if (!currentPuzzle) return false;

    const solution = currentPuzzle.puzzle.solution;
    const expectedMove = solution[moveIndex];
    const moveStr = sourceSquare + targetSquare;

    let promotion = 'q';
    if (expectedMove && expectedMove.length === 5) {
      promotion = expectedMove[4];
    }

    const newGame = new Chess(game.fen());
    try {
      const move = newGame.move({ from: sourceSquare, to: targetSquare, promotion });
      if (!move) return false;
    } catch (e) {
      return false;
    }

    if (expectedMove && moveStr === expectedMove.slice(0, 4)) {
      setGame(newGame);

      if (moveIndex + 1 < solution.length) {
        const opponentMove = solution[moveIndex + 1];
        setTimeout(() => {
          const oFrom = opponentMove.slice(0, 2);
          const oTo = opponentMove.slice(2, 4);
          const oProm = opponentMove.length > 4 ? opponentMove.slice(4, 5) : undefined;
          
          const oppGame = new Chess(newGame.fen());
          oppGame.move({ from: oFrom, to: oTo, promotion: oProm });
          setGame(oppGame);
          setMoveIndex(moveIndex + 2);
        }, 500);
      } else {
        handlePuzzleSuccess();
      }
      return true;
    } else {
      setStatus('wrong');
      setTimeout(() => {
        if (currentPuzzle) {
          let resetGame = new Chess();
          let initialMove = currentPuzzle.puzzle.initialMove;
          
          if (currentPuzzle.game && currentPuzzle.game.pgn) {
            resetGame.loadPgn(currentPuzzle.game.pgn);
            const lastMove = resetGame.undo();
            if (lastMove) {
              initialMove = lastMove.from + lastMove.to + (lastMove.promotion || '');
            }
          } else if (currentPuzzle.puzzle.fen) {
            resetGame = new Chess(currentPuzzle.puzzle.fen);
          }

          if (initialMove) {
            resetGame.move({ from: initialMove.slice(0, 2), to: initialMove.slice(2, 4), promotion: 'q' });
          }
          setGame(resetGame);
          setMoveIndex(0);
          setStatus('playing');
        }
      }, 1000);
      return false;
    }
  };

  const handlePuzzleSuccess = () => {
    setStatus('correct');
    setCorrectCount(correctCount + 1);
    
    setTimeout(() => {
      if (currentPuzzleIndex + 1 < puzzles.length) {
        setCurrentPuzzleIndex(currentPuzzleIndex + 1);
      } else {
        handleSetCompletion();
      }
    }, 1500);
  };

  const handleSetCompletion = () => {
    setStatus('completed');
    const endTime = Date.now();
    const totalTimeMs = startTime ? endTime - startTime : 0;
    const accuracy = Math.round((correctCount / puzzles.length) * 100);

    if (activeSet) {
      const isLastCycle = activeSet.cyclesCompleted + 1 >= activeSet.targetCycles;
      updateSavedSet(activeSet.id, {
        cyclesCompleted: activeSet.cyclesCompleted + 1,
        bestAccuracy: Math.max(activeSet.bestAccuracy, accuracy),
        status: isLastCycle ? 'completed' : 'active',
        lastPlayedAt: new Date().toISOString(),
        totalAttempts: activeSet.totalAttempts + puzzles.length
      });

      addCycleRecord({
        cycle: activeSet.cyclesCompleted + 1,
        totalPuzzles: puzzles.length,
        correctCount: correctCount,
        totalTimeMs: totalTimeMs,
        completedAt: new Date().toISOString()
      });
    }
  };

  const pieces = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];
  const customPieces = React.useMemo(() => {
    const pieceMap: Record<string, ({ squareWidth }: { squareWidth: number }) => React.ReactElement> = {};
    pieces.forEach((piece) => {
      pieceMap[piece] = ({ squareWidth }) => (
        <img
          src={`https://lichess1.org/assets/piece/cburnett/${piece}.svg`}
          style={{ width: squareWidth, height: squareWidth }}
          alt={piece}
          referrerPolicy="no-referrer"
        />
      );
    });
    return pieceMap;
  }, []);

  return (
    <div className="h-full flex flex-col bg-bg-dark text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-dark bg-bg-card">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-brand-gold uppercase tracking-widest">
            {activeSet?.openingDisplay || 'Training'}
          </h2>
          <p className="text-[10px] text-text-muted">
            {puzzles.length > 0 ? `Puzzle ${currentPuzzleIndex + 1} of ${puzzles.length}` : 'Loading Puzzles...'}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-4 gap-8 overflow-y-auto">
        {/* Chessboard Container */}
        <div className="w-full max-w-[500px] aspect-square relative shadow-2xl">
          <Chessboard 
            options={{
              position: game.fen(),
              onPieceDrop: ({ sourceSquare, targetSquare }) => onPieceDrop(sourceSquare, targetSquare, ''),
              canDragPiece: ({ piece }) => {
                if (status !== 'playing' || loading) return false;
                return piece.pieceType[0] === orientation[0];
              },
              boardOrientation: orientation,
              pieces: customPieces,
              darkSquareStyle: { backgroundColor: boardColors.dark },
              lightSquareStyle: { backgroundColor: boardColors.light },
              animationDurationInMs: 200
            }}
          />
          
          <AnimatePresence>
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-bg-dark/60 backdrop-blur-[4px] z-30"
              >
                <div className="w-12 h-12 rounded-full border-2 border-brand-gold/20 border-t-brand-gold animate-spin mb-4" />
                <p className="text-xs text-text-muted font-mono uppercase tracking-widest">Loading Puzzles</p>
              </motion.div>
            )}

            {puzzles.length === 0 && !loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-bg-dark/80 backdrop-blur-[2px] z-30 p-8 text-center"
              >
                <h2 className="text-xl font-bold text-text-primary mb-2">No puzzles loaded</h2>
                <p className="text-sm text-text-muted mb-6">Something went wrong while loading the puzzles. Please try again.</p>
                <button onClick={onBack} className="px-6 py-3 bg-brand-gold text-bg-dark rounded-xl font-bold text-xs uppercase tracking-widest">
                  Go Back
                </button>
              </motion.div>
            )}

            {status === 'correct' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-[2px] z-20 pointer-events-none"
              >
                <div className="bg-bg-card p-6 rounded-3xl border border-green-500/50 shadow-2xl flex flex-col items-center gap-2">
                  <CheckCircle2 size={48} className="text-green-500" />
                  <span className="font-bold text-xl text-green-500">CORRECT!</span>
                </div>
              </motion.div>
            )}
            {status === 'wrong' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-red-500/20 backdrop-blur-[2px] z-20 pointer-events-none"
              >
                <div className="bg-bg-card p-6 rounded-3xl border border-red-500/50 shadow-2xl flex flex-col items-center gap-2">
                  <XCircle size={48} className="text-red-500" />
                  <span className="font-bold text-xl text-red-500">TRY AGAIN</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info & Controls */}
        <div className="w-full max-w-[400px] space-y-4">
          <div className="bg-bg-card rounded-2xl p-6 border border-border-dark space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Progress</span>
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {(['brown', 'blue', 'green'] as const).map(theme => (
                    <button
                      key={theme}
                      onClick={() => setBoardTheme(theme)}
                      className={`w-4 h-4 rounded-full border-2 ${boardTheme === theme ? 'border-brand-gold' : 'border-transparent'}`}
                      style={{ 
                        background: theme === 'brown' ? '#b58863' : theme === 'blue' ? '#8ca2ad' : '#86a666'
                      }}
                      title={`${theme} board`}
                    />
                  ))}
                </div>
                <span className="font-mono text-brand-gold text-sm">
                  {currentPuzzleIndex} / {puzzles.length || 0}
                </span>
              </div>
            </div>
            
            <div className="h-1.5 bg-bg-dark rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-brand-gold"
                initial={{ width: 0 }}
                animate={{ width: `${((currentPuzzleIndex) / (puzzles.length || 1)) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              disabled={loading || !currentPuzzle}
              onClick={() => {
                if (!currentPuzzle) return;
                let resetGame = new Chess();
                let initialMove = currentPuzzle.puzzle.initialMove;
                
                if (currentPuzzle.game && currentPuzzle.game.pgn) {
                  resetGame.loadPgn(currentPuzzle.game.pgn);
                  const lastMove = resetGame.undo();
                  if (lastMove) {
                    initialMove = lastMove.from + lastMove.to + (lastMove.promotion || '');
                  }
                } else if (currentPuzzle.puzzle.fen) {
                  resetGame = new Chess(currentPuzzle.puzzle.fen);
                }

                if (initialMove) {
                  resetGame.move({ from: initialMove.slice(0, 2), to: initialMove.slice(2, 4), promotion: 'q' });
                }
                setGame(resetGame);
                setMoveIndex(0);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-bg-card border border-border-dark text-text-muted hover:text-white transition-colors disabled:opacity-50"
            >
              <RotateCcw size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Reset</span>
            </button>
            <button 
              disabled={loading || !currentPuzzle}
              onClick={() => currentPuzzle && setHint(currentPuzzle.puzzle.solution[moveIndex])}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2A2218] border border-brand-gold/30 text-brand-gold hover:bg-[#3A2F22] transition-colors disabled:opacity-50"
            >
              <span className="text-xs font-bold uppercase tracking-widest">Hint</span>
            </button>
          </div>

          {hint && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-brand-gold/10 border border-brand-gold/30 p-3 rounded-xl text-center"
            >
              <p className="text-xs text-brand-gold font-bold uppercase tracking-widest">
                Hint: Move your piece to {hint.slice(2, 4)}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {status === 'completed' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-bg-card rounded-3xl p-8 w-full max-w-md border border-brand-gold/30 flex flex-col items-center text-center gap-6"
            >
              <div className="w-20 h-20 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
                <span className="text-4xl text-brand-gold">🏆</span>
              </div>
              <div className="space-y-2">
                <h2 className="font-serif text-3xl font-bold text-text-primary">Cycle Complete!</h2>
                <p className="text-text-muted">You've mastered the {activeSet?.openingDisplay} set.</p>
              </div>
              
              <div className="w-full grid grid-cols-2 gap-4">
                <div className="bg-bg-dark rounded-2xl p-4 border border-border-dark">
                  <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Accuracy</p>
                  <p className="text-2xl font-bold text-brand-gold">{Math.round((correctCount / puzzles.length) * 100)}%</p>
                </div>
                <div className="bg-bg-dark rounded-2xl p-4 border border-border-dark">
                  <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Time</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {Math.floor((startTime ? Date.now() - startTime : 0) / 60000)}m
                  </p>
                </div>
              </div>

              <button
                onClick={onBack}
                className="w-full py-4 rounded-2xl bg-brand-gold text-bg-dark font-bold text-sm tracking-[2px] uppercase shadow-lg"
              >
                Back to Dashboard
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
