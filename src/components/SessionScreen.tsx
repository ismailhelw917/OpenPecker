import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { CustomChessboard } from './CustomChessboard';
import { motion, AnimatePresence } from 'motion/react';
import { useChessStore } from '../lib/state/chessStore';
import { CheckCircle2, XCircle, Timer } from 'lucide-react';
import BottomNav from './BottomNav';
import { Screen } from '../types';
import { BoardAnalysis } from '../lib/chessEngine';

const parsePuzzleData = (currentPuzzle: any) => {
  if (!currentPuzzle) return { fen: '', opponentMove: '', solution: [] };
  
  const puzzle = currentPuzzle.puzzle || currentPuzzle;
  const rawPuzzle = puzzle as any;
  
  let fen = '';
  let opponentMove = '';
  let solution: string[] = [];
  
  if (currentPuzzle.game?.pgn && puzzle.initialPly) {
    // DB format (Lichess API JSON)
    const tempGame = new Chess();
    tempGame.loadPgn(currentPuzzle.game.pgn);
    const history = tempGame.history({ verbose: true });
    
    // Replay up to initialPly
    const movesToReplay = history.slice(0, puzzle.initialPly);
    const setupGame = new Chess();
    for (const move of movesToReplay) {
      setupGame.move(move);
    }
    
    fen = setupGame.fen();
    
    if (history.length > puzzle.initialPly) {
      const move = history[puzzle.initialPly];
      opponentMove = move.from + move.to + (move.promotion || '');
    }
    
    solution = puzzle.solution || [];
  } else {
    // CSV format
    fen = puzzle.fen || rawPuzzle.fen;
    const rawMoves = currentPuzzle.moves || rawPuzzle.moves || rawPuzzle.solution || [];
    const solutionArray = typeof rawMoves === 'string' ? rawMoves.split(' ') : rawMoves;
    
    if (solutionArray.length > 0) {
      opponentMove = solutionArray[0];
      solution = solutionArray.slice(1);
    }
    
    // Fix FEN turn if necessary
    if (fen && opponentMove) {
      const from = opponentMove.slice(0, 2);
      const fenParts = fen.split(' ');
      const board = fenParts[0];
      
      const row = 8 - parseInt(from[1]);
      const col = from.charCodeAt(0) - 'a'.charCodeAt(0);
      
      let pieceAtFrom = '';
      let currentRow = 0;
      let currentCol = 0;
      for (let char of board) {
        if (char === '/') { currentRow++; currentCol = 0; continue; }
        if (/\d/.test(char)) { 
          if (currentRow === row && col >= currentCol && col < currentCol + parseInt(char)) {
            pieceAtFrom = 'empty';
            break;
          }
          currentCol += parseInt(char); 
          continue; 
        }
        if (currentRow === row && currentCol === col) { pieceAtFrom = char; break; }
        currentCol++;
      }
      
      const isBlackMove = pieceAtFrom === pieceAtFrom.toLowerCase() && pieceAtFrom !== 'empty';
      const fenTurn = fenParts[1];
      
      if ((isBlackMove && fenTurn === 'w') || (!isBlackMove && fenTurn === 'b')) {
        fenParts[1] = isBlackMove ? 'b' : 'w';
        fen = fenParts.join(' ');
      }
    }
  }
  
  return { fen, opponentMove, solution };
};

interface SessionScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function SessionScreen({ onNavigate }: SessionScreenProps) {
  const { 
    puzzles, 
    setPuzzles,
    currentPuzzleIndex, 
    setCurrentPuzzleIndex,
    correctCount,
    setCorrectCount,
    startTime,
    setStartTime,
    puzzleDurations,
    addPuzzleDuration,
    updateSavedSet,
    savedSets,
    addCycleRecord,
    targetPuzzleCount,
    targetCycles,
    boardTheme,
    minRating,
    maxRating
  } = useChessStore();

  const [puzzleStartTime, setPuzzleStartTime] = useState<number | null>(null);

  const [game, setGame] = useState(new Chess());
  const [boardAnalysis, setBoardAnalysis] = useState<BoardAnalysis | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ before: string; after: string | null; initialMove: string | undefined; puzzleData: string; lastMoveAttempt: string }>({ before: '', after: null, initialMove: undefined, puzzleData: '', lastMoveAttempt: '' });
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch('/api/chess/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fen: game.fen() })
        });
        const result = await response.json();
        setBoardAnalysis(result.data);
      } catch (error) {
        console.error('Failed to fetch analysis:', error);
      }
    };
    fetchAnalysis();
  }, [game]);
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
  const [captureSquare, setCaptureSquare] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (status === 'playing' && puzzleStartTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - puzzleStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [status, puzzleStartTime]);

  const averageTime = puzzleDurations.length > 0
    ? Math.round(puzzleDurations.reduce((a, b) => a + b, 0) / puzzleDurations.length / 1000)
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    console.log('Game state changed:', game.fen());
  }, [game]);

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
  const activeSet = useMemo(() => savedSets.find(s => s.status === 'active'), [savedSets]);

  useEffect(() => {
    console.log('Checking if puzzles need loading. Active set:', activeSet ? 'found' : 'none');
    if (activeSet && activeSet.puzzles && activeSet.puzzles.length > 0) {
      console.log('Loading puzzles from active set, count:', activeSet.puzzles.length);
      setPuzzles(activeSet.puzzles);
      setLoading(false);
    } else {
      console.log('No puzzles to load');
      setLoading(false);
    }
  }, [activeSet, setPuzzles]);

  useEffect(() => {
    if (puzzles.length > 0) {
      setPuzzleStartTime(Date.now());
    }
  }, [puzzles, currentPuzzleIndex]);

  const totalPuzzlesAcrossCycles = puzzles.length * (targetCycles === 999 ? 1 : targetCycles);
  const currentPuzzleOverall = (activeSet ? activeSet.cyclesCompleted : 0) * puzzles.length + currentPuzzleIndex + 1;

  const legalMovesForSquare = useMemo(() => {
    if (!boardAnalysis) return [];
    const source = moveFrom;
    if (!source) return [];
    return boardAnalysis.legalMoves.filter(m => m.from === source).map(m => m.to);
  }, [boardAnalysis, moveFrom]);

  const [orientation, setOrientation] = useState<'white' | 'black'>('white');

  useEffect(() => {
    if (game) {
      const turn = game.turn();
      setOrientation(turn === 'w' ? 'white' : 'black');
    }
  }, [game]);

  // Initialize puzzle
  useEffect(() => {
    console.log('Puzzle initialization effect triggered', { currentPuzzleIndex, puzzlesLength: puzzles.length, currentPuzzle: !!currentPuzzle });
    if (!currentPuzzle) {
      console.log('No current puzzle, skipping initialization');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log('Set loading to true');
    
    try {
      console.log('Initializing puzzle:', currentPuzzle.puzzle.id);
      console.log('Full puzzle object:', JSON.stringify(currentPuzzle.puzzle, null, 2));
      console.log('Puzzle moves:', currentPuzzle.moves || (currentPuzzle.puzzle as any).moves || (currentPuzzle.puzzle as any).solution);
      console.log('Puzzle FEN:', currentPuzzle.puzzle.fen);
      
      let gameInstance = new Chess();
      const puzzle = currentPuzzle.puzzle || currentPuzzle;
      if (!puzzle) {
        throw new Error('Puzzle data is missing');
      }
      
      // 1. Load the position
      const puzzleData = parsePuzzleData(currentPuzzle);
      const { fen, opponentMove, solution } = puzzleData;
      
      if (fen) {
        try {
          gameInstance.load(fen);
        } catch (e) {
          console.error('Failed to load FEN:', fen, e);
        }
      }

      console.log('Puzzle position loaded, FEN:', gameInstance.fen());
      console.log('Puzzle state before opponent move:', {
        fen: gameInstance.fen(),
        turn: gameInstance.turn(),
        opponentMove
      });

      // 3. Set the board to the position where the user has to move
      if (opponentMove) {
        let movePlayed = false;
        try {
          // Try as UCI first
          const from = opponentMove.slice(0, 2);
          const to = opponentMove.slice(2, 4);
          const promotion = opponentMove.length > 4 ? opponentMove.slice(4, 5) : undefined;
          
          const moves = gameInstance.moves({ verbose: true });
          const uciMove = moves.find(m => m.from === from && m.to === to && (promotion ? m.promotion === promotion : true));
          
          if (uciMove) {
            const move = gameInstance.move({ from, to, promotion });
            if (move) {
              setLastMoveSan(move.san);
              movePlayed = true;
            }
          }
        } catch (e) {
          // Ignore UCI parse errors
        }
        
        if (!movePlayed) {
          // Try as SAN
          try {
            const move2 = gameInstance.move(opponentMove);
            if (move2) {
              setLastMoveSan(move2.san);
              movePlayed = true;
            } else {
              console.warn('Opponent move illegal as SAN:', opponentMove);
            }
          } catch (e) {
            console.warn('Opponent move threw error as SAN:', opponentMove, e);
          }
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
      console.log('Current game FEN:', game.fen());

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
      console.log('Set loading to false');
    }
  }, [currentPuzzleIndex, puzzles, currentPuzzle]);

  const onPieceDrop = async (sourceSquare: string, targetSquare: string, piece?: string) => {
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
    console.log('onPieceDrop validation:', { 
      sourceSquare, 
      targetSquare, 
      piece: chessPiece,
      fen: game.fen(),
      turn: game.turn(),
      orientation, 
      orientationChar: orientation[0] 
    });
    if (!chessPiece || chessPiece.color !== orientation[0]) {
      console.log('Invalid piece color:', { pieceColor: chessPiece?.color, orientation });
      return false;
    }

    const { solution } = parsePuzzleData(currentPuzzle);
    
    console.log('onPieceDrop: solution array:', solution, 'moveIndex:', moveIndex);
    
    const expectedMove = solution[moveIndex];
    if (!expectedMove) {
      console.error('No expected move found at index:', moveIndex);
      return false;
    }

    // Convert expected move to UCI for robust comparison
    let expectedUCI = expectedMove.toLowerCase().trim();
    let solutionPromotion = 'q';
    
    const parseMove = (moveStr: string) => {
      console.log('Attempting to parse move:', moveStr, 'Current FEN:', game.fen());
      const tempGame = new Chess(game.fen());
      
      const tryMove = (g: Chess, m: string) => {
        try {
          // Try as UCI
          const from = m.slice(0, 2);
          const to = m.slice(2, 4);
          const promotion = m.length > 4 ? m.slice(4, 5) : undefined;
          
          const moves = g.moves({ verbose: true });
          const move = moves.find(x => x.from === from && x.to === to && (promotion ? x.promotion === promotion : true));
          
          if (move) {
            return g.move({ from, to, promotion });
          }
          
          // Try as SAN
          return g.move(m);
        } catch (e) {
          return null;
        }
      };

      let res = tryMove(tempGame, moveStr);
      if (res) return res;

      // Try changing turn
      const fen = tempGame.fen();
      const parts = fen.split(' ');
      parts[1] = parts[1] === 'w' ? 'b' : 'w';
      const newFen = parts.join(' ');
      const tempGame2 = new Chess(newFen);
      
      res = tryMove(tempGame2, moveStr);
      if (res) {
        console.log('Fixed turn issue for move:', moveStr);
        return res;
      }

      console.log('Failed to parse move:', moveStr);
      return null;
    };

    const eMove = parseMove(expectedMove);
    if (eMove) {
      expectedUCI = (eMove.from + eMove.to + (eMove.promotion || '')).toLowerCase().trim();
      if (eMove.promotion) solutionPromotion = eMove.promotion;
    } else {
      console.warn('Could not parse expected move as SAN/UCI:', expectedMove);
    }

    const newGame = new Chess(game.fen());
    let move;
    let newFen: string;
    let authoritativeGame: Chess;
    try {
      // Validate inputs
      if (!sourceSquare || !targetSquare) {
        console.error('Invalid source or target square:', { sourceSquare, targetSquare });
        return false;
      }

      // Call backend validation
      console.log('DEBUG: Frontend - Sending move:', { fen: game.fen(), from: sourceSquare, to: targetSquare, promotion: solutionPromotion });
      const response = await fetch('/api/chess/validate-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: game.fen(), from: sourceSquare, to: targetSquare, promotion: solutionPromotion })
      });
      const result = await response.json();
      if (!result.data.isValid) {
        console.log('Move illegal according to backend:', result.data.error);
        return false;
      }
      move = result.data.move;
      newFen = result.data.newFen;
      
      // Update game state with authoritative FEN from backend
      authoritativeGame = new Chess(newFen);
      setGame(authoritativeGame);
      
      if (move.captured) {
        setCaptureSquare(move.to);
        setTimeout(() => setCaptureSquare(null), 300);
      }
      
      // Handle en passant specifically if needed
      if (result.data.isEnPassant) {
        console.log('En passant move detected');
        // You might need to trigger specific UI logic here
      }
    } catch (e) {
      console.log('Move exception:', e);
      return false;
    }

    // Robust UCI comparison
    const userMoveUCI = (move.from + move.to + (move.promotion || '')).toLowerCase().trim();
    console.log('Move parsed successfully:', { userMoveUCI, expectedUCI, fen: newFen });
    
    // Check if it's the correct solution move
    if (userMoveUCI === expectedUCI) {
      // CORRECT MOVE
      // authoritativeGame is already set via setGame above
      setMoveFrom(null);
      setOptionSquares({});

      if (moveIndex + 1 < solution.length) {
        // More moves in solution, play opponent's move
        const opponentMove = solution[moveIndex + 1];
        
        // Update move index immediately for the user's move
        setMoveIndex(prev => prev + 1);

        setTimeout(() => {
          // USE authoritativeGame.fen() INSTEAD OF newGame.fen()
          const oppGame = new Chess(authoritativeGame.fen());
          
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

          if (moveResult) {
            setLastMoveSan(moveResult.san);
            if (moveResult.captured) {
              setCaptureSquare(moveResult.to);
              setTimeout(() => setCaptureSquare(null), 300);
            }
          }
          setGame(oppGame);
          
          // Update move index for the opponent's move
          const nextIndex = moveIndex + 2;
          setMoveIndex(nextIndex);

          // Check if the puzzle is now complete (after opponent's move)
          if (nextIndex >= solution.length) {
            handlePuzzleSuccess(false);
          }
        }, 150);
      } else {
        // Last move of the puzzle
        setMoveIndex(prev => prev + 1);
        handlePuzzleSuccess(false);
      }
    } else {
      // WRONG MOVE
      setStatus('wrong');
      setIsFirstTry(false);
      
      // Immediately move to next puzzle after a short delay
      setTimeout(() => {
        advanceToNextPuzzle();
      }, 1000);
    }
    return true;
  };

  const advanceToNextPuzzle = useCallback(() => {
    console.log('advanceToNextPuzzle called, currentPuzzleIndex:', currentPuzzleIndex, 'puzzles.length:', puzzles.length);
    if (currentPuzzleIndex + 1 < puzzles.length) {
      console.log('Advancing to index:', currentPuzzleIndex + 1);
      setCurrentPuzzleIndex(currentPuzzleIndex + 1);
      setPuzzleStartTime(Date.now());
    } else {
      console.log('Set complete, calling handleSetCompletion');
      handleSetCompletion();
    }
  }, [currentPuzzleIndex, puzzles.length]);

  const handlePuzzleSuccess = useCallback((isAutoSolve = false, autoAdvance = true) => {
    console.log('handlePuzzleSuccess called', { isAutoSolve, autoAdvance });
    setStatus('correct');
    if (!isAutoSolve && isFirstTry) {
      setCorrectCount(correctCount + 1);
      if (puzzleStartTime) {
        addPuzzleDuration(Date.now() - puzzleStartTime);
      }
    }
    
    if (autoAdvance) {
      advanceToNextPuzzle();
    }
  }, [isFirstTry, advanceToNextPuzzle, puzzleStartTime, addPuzzleDuration]);

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
        id: Date.now().toString(),
        setId: activeSet.id,
        cycle: activeSet.cyclesCompleted + 1,
        totalPuzzles: puzzles.length,
        correctCount: correctCount,
        totalTimeMs: totalTimeMs,
        completedAt: new Date().toISOString(),
        timestamp: Date.now(),
        openingSlug: activeSet.openingSlug,
        accuracy: accuracy
      });
    }
  };

  const onSquareClick = async (square: string) => {
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
              game.get(move.to as any) && game.get(move.to as any)?.color !== piece.color
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
    const result = await onPieceDrop(moveFrom, square, '');
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
              game.get(move.to as any) && game.get(move.to as any)?.color !== piece.color
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
        if (debugInfo.after) {
          setGame(new Chess(debugInfo.after));
          setMoveIndex(0);
          setStatus('playing');
          setHint(null);
          setOptionSquares({});
          
          // Re-set the last move SAN if possible
          const { fen, opponentMove } = parsePuzzleData(currentPuzzle);
          
          if (opponentMove) {
            let tempGame = new Chess();
            if (fen) {
              try { tempGame.load(fen); } catch(e) {}
            }
            try {
              // Try to play the opponent move to get its SAN
              const from = opponentMove.slice(0, 2);
              const to = opponentMove.slice(2, 4);
              const promotion = opponentMove.length > 4 ? opponentMove.slice(4, 5) : undefined;
              
              const moves = tempGame.moves({ verbose: true });
              const uciMove = moves.find(m => m.from === from && m.to === to && (promotion ? m.promotion === promotion : true));
              
              if (uciMove) {
                const move = tempGame.move({ from, to, promotion });
                if (move) setLastMoveSan(move.san);
              } else {
                const move2 = tempGame.move(opponentMove);
                if (move2) setLastMoveSan(move2.san);
              }
            } catch (e) {
              // Ignore
            }
          } else {
            setLastMoveSan(null);
          }
        }
      } finally {
        setLoading(false);
      }
    }, 100);
  }, [currentPuzzle, debugInfo.after]);

  const solvePuzzle = useCallback(async (force = false) => {
    if (!force && (!currentPuzzle || (status !== 'playing' && status !== 'wrong'))) return;
    
    setStatus('solving');
    try {
      const { fen, opponentMove: opponentInitialMove, solution } = parsePuzzleData(currentPuzzle);
      
      console.log('solvePuzzle: solution array:', solution);

      // Reconstruct the game to the point where the user failed
      let localGame = new Chess();
      if (fen) {
        try { localGame.load(fen); } catch(e) {}
      }
      
      const playRobustMove = (game: Chess, moveStr: string) => {
        try {
          const from = moveStr.slice(0, 2);
          const to = moveStr.slice(2, 4);
          const promotion = moveStr.length > 4 ? moveStr.slice(4, 5) : 'q';
          
          const moves = game.moves({ verbose: true });
          const move = moves.find(m => m.from === from && m.to === to && (promotion ? m.promotion === promotion : true));
          
          if (move) {
            const res = game.move({ from, to, promotion });
            if (res) return res;
          }
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
      console.log('Solution moves:', solution);

      let currentIdx = moveIndex;
      while (currentIdx < solution.length) {
        const moveStr = solution[currentIdx];
        
        const moveResult = playRobustMove(localGame, moveStr);
        if (!moveResult) {
          console.error('Auto-solve: Invalid move in solution:', moveStr, 'at index:', currentIdx);
        }

        if (!moveResult) {
          console.error('Auto-solve: Could not play move:', moveStr, 'at index:', currentIdx);
          break;
        }
        
        setOptionSquares({
          [moveResult.from]: { background: 'rgba(255, 255, 0, 0.4)' },
          [moveResult.to]: { background: 'rgba(255, 255, 0, 0.4)' }
        });
        
        if (moveResult.captured) {
          setCaptureSquare(moveResult.to);
          setTimeout(() => setCaptureSquare(null), 200);
        }
        
        console.log('Auto-solving move:', moveStr, 'at index:', currentIdx, 'New FEN:', localGame.fen());
        setGame(new Chess(localGame.fen()));
        if (moveResult) setLastMoveSan(moveResult.san);
        currentIdx++;
        setMoveIndex(currentIdx);
        
        if (currentIdx < solution.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Wait a bit before showing success
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setOptionSquares({});
      handlePuzzleSuccess(true, false);
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
            onNavigate('home');
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
  }, [status, activeSet, resetPuzzle, solvePuzzle, onNavigate]);

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
          <div className="text-center flex-1">
            <h2 className="text-sm font-bold text-brand-gold uppercase tracking-widest">
              {activeSet?.openingDisplay || 'Training'}
            </h2>
            <p className="text-[10px] text-text-muted">
              {puzzles.length > 0 ? `Puzzle ${currentPuzzleOverall} of ${totalPuzzlesAcrossCycles}` : 'Loading Puzzles...'}
            </p>
          </div>
          <div className="flex flex-col items-end text-brand-gold font-mono text-[10px]">
            <div className="flex items-center gap-1">
              <span>{formatTime(elapsedTime)}</span>
            </div>
            <div className="text-text-muted">
              Avg: {averageTime}s
            </div>
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
            game={game}
            orientation={orientation}
            onPieceDrop={(source, target) => {
              return onPieceDrop(source, target, '');
            }}
            boardColors={boardColors}
            optionSquares={optionSquares}
            legalMoves={legalMovesForSquare}
            captureSquare={captureSquare}
          />
          
          <AnimatePresence>
            {loading && (
              <motion.div 
                key="loading"
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
                key="no-puzzles"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-bg-dark/80 backdrop-blur-[2px] z-30 p-8 text-center"
              >
                <h2 className="text-xl font-bold text-text-primary mb-2">No puzzles loaded</h2>
                <p className="text-sm text-text-muted mb-6">Something went wrong while loading the puzzles. Please try again.</p>
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
                  <span className="font-bold text-xl text-red-500">WRONG!</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info & Controls */}
        <div className="w-full max-w-[500px] space-y-3">
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <BottomNav activeScreen="session" onNavigate={onNavigate} />
    </div>
  );
}
