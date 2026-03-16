export type Screen = 'home' | 'train' | 'paywall' | 'register' | 'session' | 'sets' | 'settings' | 'stats' | 'personalized';

export type SavedSet = {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'paused';
  // Add other properties as needed
};

export type CycleRecord = {
  id: string;
  totalPuzzles: number;
  correctCount: number;
  timestamp: number;
  completedAt: string;
  openingSlug: string;
  totalTimeMs: number;
};

export type PuzzleData = {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
};
