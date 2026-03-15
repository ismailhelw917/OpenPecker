import { Chess, Move } from 'chess.js';

export interface BoardAnalysis {
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  legalMoves: Move[];
  turn: 'w' | 'b';
  fen: string;
}

export const analyzeBoard = (fen: string): BoardAnalysis => {
  const game = new Chess(fen);
  return {
    isCheck: game.inCheck(),
    isCheckmate: game.isCheckmate(),
    isStalemate: game.isStalemate(),
    isDraw: game.isDraw(),
    legalMoves: game.moves({ verbose: true }),
    turn: game.turn(),
    fen: game.fen()
  };
};

export const validateAndExecuteMove = (fen: string, from: string, to: string, promotion?: string) => {
  const game = new Chess(fen);
  
  try {
    const move = game.move({ from, to, promotion });
    
    // Return the new authoritative FEN and move details
    return {
      isValid: !!move,
      move: move,
      newFen: game.fen(), // Authoritative state
      isEnPassant: move ? move.flags.includes('e') : false,
      error: move ? null : 'Invalid move'
    };
  } catch (e) {
    return {
      isValid: false,
      move: null,
      newFen: fen, // Revert to original FEN
      isEnPassant: false,
      error: e instanceof Error ? e.message : 'Invalid move'
    };
  }
};
