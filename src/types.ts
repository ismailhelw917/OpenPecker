export type Screen = 'home' | 'train' | 'paywall' | 'register' | 'session' | 'sets' | 'settings' | 'stats' | 'personalized';

export type SavedSet = {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'paused';
  openingDisplay: string;
  openingSlug: string;
  puzzles: any[];
  cyclesCompleted: number;
  targetCycles: number;
  bestAccuracy: number;
  lastPlayedAt: string;
  totalAttempts: number;
};

export type CycleRecord = {
  id: string;
  setId: string;
  cycle: number;
  totalPuzzles: number;
  correctCount: number;
  timestamp: number;
  completedAt: string;
  openingSlug: string;
  totalTimeMs: number;
  accuracy: number;
};

export type PuzzleData = any;
