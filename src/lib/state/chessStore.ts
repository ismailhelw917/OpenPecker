import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SavedSet, CycleRecord, PuzzleData } from '../../types';

interface ChessState {
  isPremium: boolean;
  setPremium: (isPremium: boolean) => void;
  
  deviceId: string | null;
  setDeviceId: (id: string) => void;

  puzzles: PuzzleData[];
  setPuzzles: (puzzles: PuzzleData[]) => void;
  
  currentPuzzleIndex: number;
  setCurrentPuzzleIndex: (index: number) => void;
  
  correctCount: number;
  setCorrectCount: (count: number) => void;
  
  startTime: number | null;
  setStartTime: (time: number | null) => void;
  
  savedSets: SavedSet[];
  addSavedSet: (set: SavedSet) => void;
  updateSavedSet: (id: string, updates: Partial<SavedSet>) => void;
  deleteSavedSet: (id: string) => void;
  
  cycleHistory: CycleRecord[];
  addCycleRecord: (record: CycleRecord) => void;
  
  cycle: number;
  setCycle: (cycle: number) => void;

  selectedOpening: string;
  setSelectedOpening: (opening: string) => void;
  
  targetPuzzleCount: number;
  setTargetPuzzleCount: (count: number) => void;
  
  targetCycles: number;
  setTargetCycles: (cycles: number) => void;

  boardTheme: 'brown' | 'blue' | 'green';
  setBoardTheme: (theme: 'brown' | 'blue' | 'green') => void;
}

export const useChessStore = create<ChessState>()(
  persist(
    (set) => ({
      isPremium: false,
      setPremium: (isPremium) => set({ isPremium }),
      
      deviceId: null,
      setDeviceId: (deviceId) => set({ deviceId }),

      puzzles: [],
      setPuzzles: (puzzles) => set({ puzzles }),
      
      currentPuzzleIndex: 0,
      setCurrentPuzzleIndex: (currentPuzzleIndex) => set({ currentPuzzleIndex }),
      
      correctCount: 0,
      setCorrectCount: (correctCount) => set({ correctCount }),
      
      startTime: null,
      setStartTime: (startTime) => set({ startTime }),
      
      savedSets: [],
      addSavedSet: (newSet) => set((state) => ({ savedSets: [...state.savedSets, newSet] })),
      updateSavedSet: (id, updates) => set((state) => ({
        savedSets: state.savedSets.map(s => s.id === id ? { ...s, ...updates } : s)
      })),
      deleteSavedSet: (id) => set((state) => ({
        savedSets: state.savedSets.filter(s => s.id !== id)
      })),
      
      cycleHistory: [],
      addCycleRecord: (record) => set((state) => ({ 
        cycleHistory: [...state.cycleHistory, record],
        cycle: state.cycle + 1
      })),
      
      cycle: 1,
      setCycle: (cycle) => set({ cycle }),

      selectedOpening: '',
      setSelectedOpening: (selectedOpening) => set({ selectedOpening }),
      
      targetPuzzleCount: 20,
      setTargetPuzzleCount: (targetPuzzleCount) => set({ targetPuzzleCount }),
      
      targetCycles: 3,
      setTargetCycles: (targetCycles) => set({ targetCycles }),

      boardTheme: 'brown',
      setBoardTheme: (boardTheme) => set({ boardTheme }),
    }),
    {
      name: 'openpecker-storage',
    }
  )
);

export const initDeviceId = async () => {
  const store = useChessStore.getState();
  if (!store.deviceId) {
    store.setDeviceId(crypto.randomUUID());
  }
};

export const loadPersistedHistory = async () => {
  // Handled by Zustand persist middleware automatically
};
