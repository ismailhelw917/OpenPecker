export interface Puzzle {
  id: string;
  fen: string;
  solution: string[];
  moves?: string[];
  initialMove?: string;
  rating?: number;
  plays?: number;
  themes?: string[];
}

export interface PuzzleData {
  puzzle: Puzzle;
  game?: {
    pgn: string;
  };
}

export interface SavedSet {
  id: string;
  openingSlug: string;
  openingDisplay: string;
  puzzleCount: number;
  targetCycles: number;
  cyclesCompleted: number;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  lastPlayedAt: string;
  bestAccuracy: number;
  totalAttempts: number;
  puzzles: PuzzleData[];
}

export interface CycleRecord {
  setId?: string;
  cycle: number;
  totalPuzzles: number;
  correctCount: number;
  totalTimeMs: number;
  completedAt: string;
}
