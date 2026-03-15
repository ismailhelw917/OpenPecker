import { Chess, Move } from 'chess.js';

export class Board {
  private game: Chess;

  constructor(fen?: string) {
    this.game = fen ? new Chess(fen) : new Chess();
  }

  // Returns the board as a 64-square array (inspired by your C# engine)
  public getBoardArray(): (string | null)[] {
    const board = this.game.board();
    return board.flat().map(piece => piece ? `${piece.color}${piece.type}` : null);
  }

  // Explicitly generate valid moves for a piece (GenerateValidMoves)
  public generateValidMoves(square: string): Move[] {
    return this.game.moves({ square: square as any, verbose: true });
  }

  // Explicitly move a piece (MovePiece)
  public movePiece(from: string, to: string, promotion?: string): { success: boolean; move: Move | null; error: string | null } {
    try {
      const move = this.game.move({ from, to, promotion });
      if (move) {
        return { success: true, move, error: null };
      }
      return { success: false, move: null, error: 'Invalid move' };
    } catch (e) {
      return { success: false, move: null, error: e instanceof Error ? e.message : 'Invalid move' };
    }
  }

  public getFen(): string {
    return this.game.fen();
  }

  public getTurn(): 'w' | 'b' {
    return this.game.turn();
  }
}
