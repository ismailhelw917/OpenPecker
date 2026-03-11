import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { CustomChessboard } from './CustomChessboard';
import { motion, AnimatePresence } from 'motion/react';
import { useChessStore } from '../lib/state/chessStore';
import { ChevronLeft, RotateCcw, CheckCircle2, XCircle, Timer } from 'lucide-react';

interface SessionScreenProps {
  onBack: () => void;
}

export default function SessionScreen({ onBack }: SessionScreenProps) {
  const { 
    puzzles, 
    setPuzzles,
    currentPuzzleIndex, 
    setCurrentPuzzleIndex,
    correctCount,
    setCorrectCount,
    startTime,
    setStartTime,
    updateSavedSet,
    savedSets,
    addCycleRecord,
    selectedOpening,
    targetPuzzleCount,
    targetCycles,
    addSavedSet,
    boardTheme,
    setBoardTheme,
    minRating,
    maxRating
  } = useChessStore();

  const [game, setGame] = useState(new Chess());
  const [debugInfo, setDebugInfo] = useState<{ before: string; after: string | null; initialMove: string | undefined; puzzleData: string; lastMoveAttempt: string }>({ before: '', after: null, initialMove: undefined, puzzleData: '', lastMoveAttempt: '' });
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'correct' | 'wrong' | 'completed' | 'solving'>('playing');
  const [hint, setHint] = useState<string | null>(null);
  const [lastMoveSan, setLastMoveSan] = useState<string | null>(null);
  const [isFirstTry, setIsFirstTry] = useState(true);
  const [shouldAutoSolve, setShouldAutoSolve] = useState(false);

  // Helper to convert UCI to SAN for readable hints
  const getSanFromUci = (uci: string, currentFen: string) => {
    try {
      const tempGame = new Chess(currentFen);
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
      const move = tempGame.move({ from, to, promotion });
      return move ? move.san : uci;
    } catch (e) {
      return uci;
    }
  };
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
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('SessionScreen mounted, puzzles length:', puzzles.length);
    // Force a resize event to ensure Chessboard calculates its size correctly
    const triggerResize = () => {
      window.dispatchEvent(new Event('resize'));
    };
    
    triggerResize();
    const timer = setTimeout(triggerResize, 500);
    const timer2 = setTimeout(triggerResize, 1000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [puzzles.length, currentPuzzleIndex]);

  const currentPuzzle = puzzles[currentPuzzleIndex];
  const activeSet = savedSets.find(s => s.status === 'active');
  
  console.log('SessionScreen render:', { currentPuzzleIndex, puzzlesLength: puzzles.length, currentPuzzle });

  useEffect(() => {
    console.log('Checking if puzzles need loading. Puzzles length:', puzzles.length, 'Active set:', activeSet);
    if (activeSet) {
      if (puzzles.length === 0) {
        console.log('Loading puzzles from active set');
        setPuzzles(activeSet.puzzles);
        setLoading(true);
        setTimeout(() => setLoading(false), 500);
      } else {
        console.log('Puzzles already loaded');
        setLoading(false);
      }
    } else {
      console.log('No active set found');
      setLoading(false);
    }
  }, [activeSet, setPuzzles]);

  const totalPuzzlesAcrossCycles = puzzles.length * (targetCycles === 999 ? 1 : targetCycles);
  const currentPuzzleOverall = (activeSet ? activeSet.cyclesCompleted : 0) * puzzles.length + currentPuzzleIndex + 1;

  const [orientation, setOrientation] = useState<'white' | 'black'>('white');

  // Initialize puzzle
  useEffect(() => {
    console.log('Puzzle initialization effect triggered', { currentPuzzleIndex, puzzlesLength: puzzles.length });
    if (!currentPuzzle) {
      console.log('No current puzzle, skipping initialization');
      return;
    }
    
    setLoading(true);
    
    // Use a small timeout to ensure loading state is visible and state updates are clean
    const timer = setTimeout(() => {
      try {
        console.log('Initializing puzzle:', currentPuzzle.puzzle.id);
        
        let gameInstance = new Chess();
        const puzzle = currentPuzzle.puzzle;
        
        // 1. Load the position
        // Lichess puzzles provide a FEN which is the position BEFORE the opponent's move.
        if (puzzle.fen) {
          const loaded = gameInstance.load(puzzle.fen);
          if (!loaded) {
            console.error('Failed to load FEN:', puzzle.fen);
            // Try to load starting position as fallback
            gameInstance = new Chess();
          }
        } else if (currentPuzzle.game?.pgn) {
          gameInstance.loadPgn(currentPuzzle.game.pgn);
          // If we have initialPly, we should go to that position.
          if (puzzle.initialPly) {
            const history = gameInstance.history({ verbose: true });
            // The puzzle starts at initialPly, so we need to replay moves up to that point.
            const movesToReplay = history.slice(0, puzzle.initialPly);
            gameInstance = new Chess();
            for (const move of movesToReplay) {
              gameInstance.move(move);
            }
          }
        }

        // 2. Identify the solution and user's first move
        const rawPuzzle = puzzle as any;
        const rawMoves = currentPuzzle.moves || rawPuzzle.moves || rawPuzzle.solution || [];
        const fullSolution = typeof rawMoves === 'string' ? rawMoves.split(' ') : rawMoves;
        const isLichessMoves = !!(currentPuzzle.moves || rawPuzzle.moves);
        
        // The move that led to this position (opponent's move)
        const opponentMove = isLichessMoves ? fullSolution[0] : puzzle.initialMove;

        console.log('Puzzle state before opponent move:', {
          fen: gameInstance.fen(),
          turn: gameInstance.turn(),
          opponentMove
        });

        // 3. Set the board to the position where the user has to move
        if (opponentMove) {
          try {
            // Try as UCI first (most common for Lichess)
            const from = opponentMove.slice(0, 2);
            const to = opponentMove.slice(2, 4);
            const promotion = opponentMove.length > 4 ? opponentMove.slice(4, 5) : undefined;
            
            const move = gameInstance.move({ from, to, promotion });
            if (move) {
              setLastMoveSan(move.san);
            } else {
              // Try as SAN
              try {
                const move2 = gameInstance.move(opponentMove);
                if (move2) setLastMoveSan(move2.san);
                else console.warn('Opponent move illegal as SAN:', opponentMove);
              } catch (e) {
                console.warn('Opponent move threw error as SAN:', opponentMove, e);
              }
            }
          } catch (e) {
            console.warn('Failed to play opponent move:', opponentMove, e);
          }
        } else {
          setLastMoveSan(null);
        }

        const finalFen = gameInstance.fen();
        const userTurn = gameInstance.turn();
        const userOrientation = userTurn === 'w' ? 'white' : 'black';

        console.log('Final initialization state:', {
          fen: finalFen,
          turn: userTurn,
          orientation: userOrientation
        });

        setGame(new Chess(finalFen));
        setOrientation(userOrientation);
        setMoveIndex(0);
        setStatus('playing');
        setHint(null);
        setIsFirstTry(true);
        setOptionSquares({});

        setDebugInfo({ 
          before: puzzle.fen || 'None', 
          after: finalFen, 
          initialMove: opponentMove || 'None',
          puzzleData: JSON.stringify(puzzle),
          lastMoveAttempt: `Initialized: ${finalFen}`
        });

        console.log('Puzzle initialization complete');
      } catch (error) {
        console.error('Error during puzzle initialization:', error);
        setDebugInfo(prev => ({ ...prev, lastMoveAttempt: `Error: ${error instanceof Error ? error.message : String(error)}` }));
      } finally {
        setLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentPuzzleIndex, puzzles, currentPuzzle]);

  const onPieceDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    console.log('onPieceDrop called:', { sourceSquare, targetSquare, piece, status, loading });
    if (status !== 'playing' || loading) {
      console.log('onPieceDrop rejected:', { status, loading, reason: status !== 'playing' ? 'status not playing' : 'still loading' });
      return false;
    }
    if (!currentPuzzle) {
      console.log('onPieceDrop rejected: no currentPuzzle');
      return false;
    }

    // Basic validation: must move own piece
    const chessPiece = game.get(sourceSquare as any);
    if (!chessPiece || chessPiece.color !== orientation[0]) {
      console.log('Invalid piece color:', { pieceColor: chessPiece?.color, orientation });
      return false;
    }

    const rawPuzzle = currentPuzzle.puzzle as any;
    const rawMoves = currentPuzzle.moves || rawPuzzle.moves || rawPuzzle.solution || [];
    
    // Ensure fullSolution is an array
    const solutionArray = typeof rawMoves === 'string' ? (rawMoves as string).split(' ') : rawMoves;
    
    const isLichessMoves = !!(currentPuzzle.moves || rawPuzzle.moves);
    const solution = isLichessMoves ? solutionArray.slice(1) : solutionArray;
    
    const expectedMove = solution[moveIndex];
    if (!expectedMove) {
      console.error('No expected move found at index:', moveIndex);
      return false;
    }

    // Convert expected move to UCI for robust comparison
    let expectedUCI = expectedMove.toLowerCase().trim();
    let solutionPromotion = 'q';
    const tempGame = new Chess(game.fen());
    try {
      // Try to play expected move to get its UCI and promotion
      const eMove = tempGame.move(expectedMove);
      if (eMove) {
        expectedUCI = (eMove.from + eMove.to + (eMove.promotion || '')).toLowerCase().trim();
        if (eMove.promotion) solutionPromotion = eMove.promotion;
      }
    } catch (e) {
      console.warn('Could not parse expected move as SAN/UCI:', expectedMove);
    }

    const newGame = new Chess(game.fen());
    let move;
    try {
      // Use the promotion piece from the solution if the user is moving to the promotion rank
      move = newGame.move({ from: sourceSquare, to: targetSquare, promotion: solutionPromotion });
      if (!move) {
        console.log('Move illegal according to chess.js:', { sourceSquare, targetSquare, promotion: solutionPromotion });
        return false;
      }
    } catch (e) {
      console.log('Move exception:', e);
      return false;
    }

    // Robust UCI comparison
    const userMoveUCI = (move.from + move.to + (move.promotion || '')).toLowerCase().trim();
    
    console.log('Move Comparison:', { userMoveUCI, expectedUCI, originalExpected: expectedMove, index: moveIndex });
    
    setDebugInfo(prev => ({ 
      ...prev, 
      lastMoveAttempt: `User: ${userMoveUCI}, Expected: ${expectedUCI}, Index: ${moveIndex}, Status: ${status}` 
    }));

    // Check if it's the correct solution move
    if (userMoveUCI === expectedUCI) {
      // CORRECT MOVE
      setGame(newGame);
      setMoveFrom(null);
      setOptionSquares({});

      if (moveIndex + 1 < solution.length) {
        // More moves in solution, play opponent's move
        const opponentMove = solution[moveIndex + 1];
        
        // Update move index immediately for the user's move
        setMoveIndex(prev => prev + 1);

        setTimeout(() => {
          const oppGame = new Chess(newGame.fen());
          
          let moveResult;
          try {
            const oFrom = opponentMove.slice(0, 2);
            const oTo = opponentMove.slice(2, 4);
            const oProm = opponentMove.length > 4 ? opponentMove.slice(4, 5) : undefined;
            moveResult = oppGame.move({ from: oFrom, to: oTo, promotion: oProm });
          } catch (e) {}
          
          if (!moveResult) {
            try {
              moveResult = oppGame.move(opponentMove);
            } catch (e) {}
          }

          if (moveResult) setLastMoveSan(moveResult.san);
          setGame(oppGame);
          
          // Update move index for the opponent's move
          const nextIndex = moveIndex + 2;
          setMoveIndex(nextIndex);

          // Check if the puzzle is now complete (after opponent's move)
          if (nextIndex >= solution.length) {
            handlePuzzleSuccess(false);
          }
        }, 400);
      } else {
        // Last move of the puzzle
        setMoveIndex(prev => prev + 1);
        handlePuzzleSuccess(false);
      }
    } else {
      // WRONG MOVE
      setGame(newGame);
      setStatus('wrong');
      setIsFirstTry(false);
      
      setTimeout(() => {
        revertMove();
        // Trigger auto-solve after reverting
        setShouldAutoSolve(true);
      }, 1000);
    }
    return true;
  };

  const advanceToNextPuzzle = useCallback(() => {
    if (currentPuzzleIndex + 1 < puzzles.length) {
      setCurrentPuzzleIndex(currentPuzzleIndex + 1);
    } else {
      handleSetCompletion();
    }
  }, [currentPuzzleIndex, puzzles.length]);

  const handlePuzzleSuccess = useCallback((isAutoSolve = false) => {
    setStatus('correct');
    if (!isAutoSolve && isFirstTry) {
      setCorrectCount(prev => prev + 1);
    }
    
    setTimeout(() => {
      advanceToNextPuzzle();
    }, 1500);
  }, [isFirstTry, advanceToNextPuzzle]);

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
        setId: activeSet.id,
        cycle: activeSet.cyclesCompleted + 1,
        totalPuzzles: puzzles.length,
        correctCount: correctCount,
        totalTimeMs: totalTimeMs,
        completedAt: new Date().toISOString()
      });
    }
  };

  const onSquareClick = (square: string) => {
    if (status !== 'playing' || loading) return;

    // from square
    if (!moveFrom) {
      const piece = game.get(square as any);
      if (piece && piece.color === orientation[0]) {
        setMoveFrom(square);
        // Highlight possible moves
        const moves = game.moves({
          square: square as any,
          verbose: true,
        });
        if (moves.length === 0) {
          setMoveFrom(square);
          setOptionSquares({ [square]: { background: 'rgba(255, 255, 0, 0.4)' } });
          return;
        }

        const newSquares: any = {};
        moves.map((move) => {
          newSquares[move.to] = {
            background:
              game.get(move.to as any) && game.get(move.to as any).color !== piece.color
                ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
                : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
            borderRadius: '50%',
          };
          return move;
        });
        newSquares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
        setOptionSquares(newSquares);
      }
      return;
    }

    // to square
    const result = onPieceDrop(moveFrom, square, '');
    if (result) {
      setMoveFrom(null);
      setOptionSquares({});
    } else {
      // If click on another piece of same color, change selection
      const piece = game.get(square as any);
      if (piece && piece.color === orientation[0]) {
        setMoveFrom(square);
        // Highlight possible moves
        const moves = game.moves({
          square: square as any,
          verbose: true,
        });
        const newSquares: any = {};
        moves.map((move) => {
          newSquares[move.to] = {
            background:
              game.get(move.to as any) && game.get(move.to as any).color !== piece.color
                ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
                : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
            borderRadius: '50%',
          };
          return move;
        });
        newSquares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
        setOptionSquares(newSquares);
      } else {
        setMoveFrom(null);
        setOptionSquares({});
      }
    }
  };

  const pieces = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];

  const revertMove = useCallback(() => {
    setGame(prevGame => {
      const newGame = new Chess(prevGame.fen());
      const move = newGame.undo();
      if (!move) {
        console.warn('Failed to undo move - already at start?');
      }
      return newGame;
    });
    setStatus('playing');
  }, []);

  const resetPuzzle = useCallback(() => {
    if (!currentPuzzle) return;
    
    setLoading(true);
    setTimeout(() => {
      try {
        const puzzle = currentPuzzle.puzzle;
        let gameInstance = new Chess();
        
        if (puzzle.fen) {
          gameInstance.load(puzzle.fen);
        }
        
        const rawPuzzle = puzzle as any;
        const rawMoves = currentPuzzle.moves || rawPuzzle.moves || rawPuzzle.solution || [];
        const fullSolution = typeof rawMoves === 'string' ? rawMoves.split(' ') : rawMoves;
        const isLichessMoves = !!(currentPuzzle.moves || rawPuzzle.moves);
        const opponentMove = isLichessMoves ? fullSolution[0] : puzzle.initialMove;

        if (opponentMove) {
          const from = opponentMove.slice(0, 2);
          const to = opponentMove.slice(2, 4);
          const promotion = opponentMove.length > 4 ? opponentMove.slice(4, 5) : undefined;
          gameInstance.move({ from, to, promotion });
        }

        setGame(new Chess(gameInstance.fen()));
        setMoveIndex(0);
        setStatus('playing');
        setHint(null);
        setOptionSquares({});
      } finally {
        setLoading(false);
      }
    }, 100);
  }, [currentPuzzle]);

  const solvePuzzle = useCallback(async (force = false) => {
    if (!force && (!currentPuzzle || (status !== 'playing' && status !== 'wrong'))) return;
    
    setStatus('solving');
    try {
      const puzzle = currentPuzzle.puzzle;
      const rawPuzzle = puzzle as any;
      const fullSolution = currentPuzzle.moves || rawPuzzle.solution || rawPuzzle.moves || [];
      const solutionArray = typeof fullSolution === 'string' ? (fullSolution as string).split(' ') : fullSolution;
      
      const isLichessMoves = !!(currentPuzzle.moves || rawPuzzle.moves);
      const solution = isLichessMoves ? solutionArray.slice(1) : solutionArray;
      const opponentInitialMove = isLichessMoves ? solutionArray[0] : puzzle.initialMove;

      // Reconstruct the game to the point where the user failed
      let localGame = new Chess();
      if (puzzle.fen) {
        localGame.load(puzzle.fen);
      }
      
      const playRobustMove = (game: Chess, moveStr: string) => {
        try {
          const from = moveStr.slice(0, 2);
          const to = moveStr.slice(2, 4);
          const promotion = moveStr.length > 4 ? moveStr.slice(4, 5) : 'q';
          const res = game.move({ from, to, promotion });
          if (res) return res;
        } catch (e) {}
        try {
          return game.move(moveStr);
        } catch (e) {
          return null;
        }
      };

      // Play the initial opponent move
      if (opponentInitialMove) {
        playRobustMove(localGame, opponentInitialMove);
      }

      // Play the correct moves up to moveIndex
      for (let i = 0; i < moveIndex; i++) {
        const m = solution[i];
        if (m) playRobustMove(localGame, m);
      }

      console.log('Auto-solve starting from index:', moveIndex, 'Solution length:', solution.length);

      let currentIdx = moveIndex;
      while (currentIdx < solution.length) {
        const moveStr = solution[currentIdx];
        
        let moveResult;
        try {
          // Try as object (UCI)
          const from = moveStr.slice(0, 2);
          const to = moveStr.slice(2, 4);
          const promotion = moveStr.length > 4 ? moveStr.slice(4, 5) : 'q';
          moveResult = localGame.move({ from, to, promotion });
          
          if (!moveResult) {
            // Try as string (SAN)
            moveResult = localGame.move(moveStr);
          }
        } catch (e) {
          try {
            // Fallback to SAN
            moveResult = localGame.move(moveStr);
          } catch (e2) {
            console.error('Auto-solve: Invalid move in solution:', moveStr, 'at index:', currentIdx);
          }
        }

        if (!moveResult) {
          console.error('Auto-solve: Could not play move:', moveStr, 'at index:', currentIdx);
          break;
        }
        
        setOptionSquares({
          [moveResult.from]: { background: 'rgba(255, 255, 0, 0.4)' },
          [moveResult.to]: { background: 'rgba(255, 255, 0, 0.4)' }
        });
        
        setGame(new Chess(localGame.fen()));
        if (moveResult) setLastMoveSan(moveResult.san);
        currentIdx++;
        setMoveIndex(currentIdx);
        
        if (currentIdx < solution.length) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
      
      setOptionSquares({});
      handlePuzzleSuccess(true);
    } catch (error) {
      console.error('Error in solvePuzzle:', error);
      setStatus('playing');
    }
  }, [currentPuzzle, status, moveIndex, handlePuzzleSuccess]);

  // Effect to handle auto-solving after a wrong move
  useEffect(() => {
    if (shouldAutoSolve) {
      setShouldAutoSolve(false);
      // Small delay to ensure the board has reverted and state is ready
      const timer = setTimeout(() => {
        solvePuzzle(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoSolve, solvePuzzle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status === 'completed') {
        if (e.key === 'Enter' || e.key === ' ') {
          if (activeSet && activeSet.cyclesCompleted < activeSet.targetCycles) {
            setCurrentPuzzleIndex(0);
            setCorrectCount(0);
            setStartTime(Date.now());
            setStatus('playing');
          } else {
            onBack();
          }
        }
        return;
      }

      if (status === 'playing') {
        if (e.key === 'r' || e.key === 'R') resetPuzzle();
        if (e.key === 's' || e.key === 'S') solvePuzzle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, activeSet, resetPuzzle, solvePuzzle, onBack]);

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
      <div className="relative border-b border-border-dark bg-bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h2 className="text-sm font-bold text-brand-gold uppercase tracking-widest">
              {activeSet?.openingDisplay || 'Training'}
            </h2>
            <p className="text-[10px] text-text-muted">
              {puzzles.length > 0 ? `Puzzle ${currentPuzzleOverall} of ${totalPuzzlesAcrossCycles}` : 'Loading Puzzles...'}
            </p>
          </div>
          <div className="w-10 flex items-center justify-end">
            <button 
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  resetPuzzle();
                  setLoading(false);
                }, 500);
              }} 
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-text-muted hover:text-white"
              title="Refresh Board"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
        
        {/* Progress Bar in Header */}
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-bg-dark overflow-hidden">
          <motion.div 
            className="h-full bg-brand-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentPuzzleOverall - 1) / (totalPuzzlesAcrossCycles || 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 overflow-hidden">
        {/* Chessboard Container */}
        <div 
          key={`puzzle-${currentPuzzleIndex}`}
          className="w-full max-w-[500px] aspect-square relative shadow-2xl shrink-0 border-2 border-white/5 rounded-xl bg-white/5"
        >
          <CustomChessboard 
            fen={game.fen()}
            orientation={orientation}
            onPieceDrop={(source, target) => { onPieceDrop(source, target, ''); }}
            boardColors={boardColors}
            optionSquares={optionSquares}
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

            {(status === 'correct' || (status === 'solving' && moveIndex >= (currentPuzzle?.puzzle?.moves?.length || 0) - 1)) && (
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
        <div className="w-full max-w-[500px] space-y-3">
          <div className="flex flex-row gap-3 items-stretch">
            {/* Next Button */}
            <button 
              onClick={advanceToNextPuzzle}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-bg-card border border-border-dark text-text-muted hover:text-white hover:border-brand-gold/30 transition-all group"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest group-hover:text-brand-gold">Next Puzzle</span>
            </button>

            {/* Show Solution Button */}
            <button 
              onClick={() => solvePuzzle(true)}
              disabled={status === 'solving' || status === 'correct'}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-bg-card border border-border-dark text-text-muted hover:text-white hover:border-brand-gold/30 transition-all group disabled:opacity-50"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest group-hover:text-brand-gold">Show Solution</span>
            </button>
          </div>

          {hint && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-brand-gold/10 border border-brand-gold/30 p-2 rounded-xl text-center"
            >
              <p className="text-[10px] text-brand-gold font-bold uppercase tracking-widest">
                Hint: {getSanFromUci(hint, game.fen())}
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

              <div className="w-full flex flex-col gap-3">
                {activeSet && activeSet.cyclesCompleted < activeSet.targetCycles && (
                  <button
                    onClick={() => {
                      setCurrentPuzzleIndex(0);
                      setCorrectCount(0);
                      setStartTime(Date.now());
                      setStatus('playing');
                    }}
                    className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm tracking-[2px] uppercase shadow-lg hover:bg-emerald-600 transition-colors"
                  >
                    Start Next Cycle
                  </button>
                )}
                <button
                  onClick={onBack}
                  className="w-full py-4 rounded-2xl bg-brand-gold text-bg-dark font-bold text-sm tracking-[2px] uppercase shadow-lg"
                >
                  Back to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
