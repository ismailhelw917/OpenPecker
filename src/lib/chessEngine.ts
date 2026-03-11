export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type Color = 'white' | 'black';

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Board = (Piece | null)[][];

/**
 * Updates the board state by moving a piece.
 * Does not check for move validity (handle that in your validation layer).
 */
export const movePiece = (
  board: Board,
  from: [number, number],
  to: [number, number]
): Board => {
  const newBoard = board.map(row => [...row]);
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;

  newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
  newBoard[fromRow][fromCol] = null;

  return newBoard;
};

// Validation Strategy Pattern

export type MoveValidator = (
  from: [number, number],
  to: [number, number],
  board: Board
) => boolean;

export const isValidKnightMove: MoveValidator = (
  from: [number, number],
  to: [number, number]
): boolean => {
  const rowDiff = Math.abs(from[0] - to[0]);
  const colDiff = Math.abs(from[1] - to[1]);

  return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
};

// Map piece types to their validators
export const pieceValidators: Record<PieceType, MoveValidator> = {
  pawn: (from, to, board) => {
    // Basic pawn move logic would go here
    return false; 
  },
  rook: (from, to, board) => {
    // Basic rook move logic would go here
    return false;
  },
  knight: isValidKnightMove,
  bishop: (from, to, board) => {
    // Basic bishop move logic would go here
    return false;
  },
  queen: (from, to, board) => {
    // Basic queen move logic would go here
    return false;
  },
  king: (from, to, board) => {
    // Basic king move logic would go here
    return false;
  },
};

export const isValidMove = (
  from: [number, number],
  to: [number, number],
  board: Board
): boolean => {
  const piece = board[from[0]][from[1]];
  if (!piece) return false;
  
  const validator = pieceValidators[piece.type];
  return validator(from, to, board);
};
