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
  
  puzzleDurations: number[];
  setPuzzleDurations: (durations: number[]) => void;
  addPuzzleDuration: (duration: number) => void;
  
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
  
  selectedThemes: string[];
  setSelectedThemes: (themes: string[]) => void;
  
  minRating: number;
  setMinRating: (rating: number) => void;
  
  maxRating: number;
  setMaxRating: (rating: number) => void;
  
  targetPuzzleCount: number;
  setTargetPuzzleCount: (count: number) => void;
  
  targetCycles: number;
  setTargetCycles: (cycles: number) => void;

  colorFilter: 'both' | 'white' | 'black';
  setColorFilter: (filter: 'both' | 'white' | 'black') => void;

  boardTheme: 'brown' | 'blue' | 'green';
  setBoardTheme: (theme: 'brown' | 'blue' | 'green') => void;

  fitToScreen: number;
  setFitToScreen: (fitToScreen: number) => void;

  user: { id: string; username: string; isPremium?: boolean } | null;
  setUser: (user: { id: string; username: string; isPremium?: boolean } | null) => void;

  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  fetchSavedSets: () => Promise<void>;
  fetchCycleHistory: () => Promise<void>;
}

export const useChessStore = create<ChessState>()(
  persist(
    (set, get) => ({
      isPremium: false,
      setPremium: (isPremium) => set({ isPremium }),
      
      deviceId: null,
      setDeviceId: (deviceId) => {
        set({ deviceId });
        get().fetchSavedSets();
        get().fetchCycleHistory();
      },

      user: null,
      setUser: (user) => {
        set({ user, isPremium: !!user?.isPremium });
        get().fetchSavedSets();
        get().fetchCycleHistory();
      },

      login: async (email, password) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error.message);
        get().setUser(result.data);
      },

      register: async (username, email, password) => {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error.message);
        get().setUser(result.data);
      },

      logout: () => {
        set({ user: null, isPremium: false });
        get().fetchSavedSets();
        get().fetchCycleHistory();
      },

      fetchUser: async () => {
        const user = get().user;
        if (!user) return;
        try {
          const response = await fetch(`/api/user/me?userId=${user.id}`);
          const result = await response.json();
          if (result.data) {
            get().setUser(result.data);
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
        }
      },

      fetchSavedSets: async () => {
        const { user, deviceId } = get();
        if (!user && !deviceId) return;

        try {
          const query = user ? `userId=${user.id}` : `deviceId=${deviceId}`;
          const response = await fetch(`/api/sets?${query}`);
          const result = await response.json();
          if (result.data) {
            set({ savedSets: result.data });
          }
        } catch (error) {
          console.error('Failed to fetch saved sets:', error);
        }
      },

      fetchCycleHistory: async () => {
        const { user, deviceId } = get();
        if (!user && !deviceId) return;

        try {
          const query = user ? `userId=${user.id}` : `deviceId=${deviceId}`;
          const response = await fetch(`/api/cycles?${query}`);
          const result = await response.json();
          if (result.data) {
            set({ cycleHistory: result.data });
          }
        } catch (error) {
          console.error('Failed to fetch cycle history:', error);
        }
      },

      puzzles: [],
      setPuzzles: (puzzles) => set({ puzzles }),
      
      currentPuzzleIndex: 0,
      setCurrentPuzzleIndex: (currentPuzzleIndex) => set({ currentPuzzleIndex }),
      
      correctCount: 0,
      setCorrectCount: (correctCount) => set({ correctCount }),
      
      puzzleDurations: [],
      setPuzzleDurations: (puzzleDurations) => set({ puzzleDurations }),
      addPuzzleDuration: (duration) => set((state) => ({ puzzleDurations: [...state.puzzleDurations, duration] })),
      
      startTime: null,
      setStartTime: (startTime) => set({ startTime }),
      
      savedSets: [],
      addSavedSet: async (newSet) => {
        const { user, deviceId } = get();
        
        // Optimistic update
        set((state) => ({ 
          savedSets: [
            ...state.savedSets.map(s => ({ ...s, status: (s.status === 'active' ? 'paused' : s.status) as 'active' | 'completed' | 'paused' })), 
            newSet
          ] 
        }));

        try {
          await fetch('/api/sets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...newSet,
              userId: user?.id,
              deviceId: deviceId
            })
          });
        } catch (error) {
          console.error('Failed to save set to server:', error);
        }
      },
      updateSavedSet: async (id, updates) => {
        // Optimistic update
        set((state) => ({
          savedSets: state.savedSets.map(s => {
            if (s.id === id) return { ...s, ...updates };
            if (updates.status === 'active' && s.status === 'active') return { ...s, status: 'paused' };
            return s;
          })
        }));

        try {
          await fetch(`/api/sets/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
        } catch (error) {
          console.error('Failed to update set on server:', error);
        }
      },
      deleteSavedSet: async (id) => {
        // Optimistic update
        set((state) => ({
          savedSets: state.savedSets.filter(s => s.id !== id)
        }));

        try {
          await fetch(`/api/sets/${id}`, {
            method: 'DELETE'
          });
        } catch (error) {
          console.error('Failed to delete set from server:', error);
        }
      },
      
      cycleHistory: [],
      addCycleRecord: async (record) => {
        const { user, deviceId } = get();
        
        // Optimistic update
        set((state) => ({ 
          cycleHistory: [...state.cycleHistory, record],
          cycle: state.cycle + 1
        }));

        try {
          await fetch('/api/cycles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...record,
              userId: user?.id,
              deviceId: deviceId
            })
          });
        } catch (error) {
          console.error('Failed to save cycle record to server:', error);
        }
      },
      
      cycle: 1,
      setCycle: (cycle) => set({ cycle }),

      selectedOpening: '',
      setSelectedOpening: (selectedOpening) => set({ selectedOpening }),
      
      selectedThemes: [],
      setSelectedThemes: (selectedThemes) => set({ selectedThemes }),
      
      minRating: 1000,
      setMinRating: (minRating) => set({ minRating }),
      
      maxRating: 2000,
      setMaxRating: (maxRating) => set({ maxRating }),
      
      targetPuzzleCount: 20,
      setTargetPuzzleCount: (targetPuzzleCount) => set({ targetPuzzleCount }),
      
      targetCycles: 3,
      setTargetCycles: (targetCycles) => set({ targetCycles }),
      
      colorFilter: 'both',
      setColorFilter: (colorFilter) => set({ colorFilter }),

      boardTheme: 'brown',
      setBoardTheme: (boardTheme) => set({ boardTheme }),

      fitToScreen: 100,
      setFitToScreen: (fitToScreen) => set({ fitToScreen }),
    }),
    {
      name: 'openpecker-storage',
    }
  )
);

export const initDeviceId = async () => {
  const store = useChessStore.getState();
  if (!store.deviceId) {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    store.setDeviceId(id);
  }
};

export const loadPersistedHistory = async () => {
  // Handled by Zustand persist middleware automatically
};
