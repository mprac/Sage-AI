/** Recognition results — persisted via AsyncStorage so an in-progress kitchen survives
 *  app cold-start, tab switches, and any navigation away from the recognition screen.
 *
 *  `byId` caches each recognition for instant reads on the detail screen.
 *  `activeId` is the most recently created recognition — the one the Cook tab surfaces as
 *  "Your kitchen". Taking a new photo replaces it via `save()`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DetectedFood, RecognitionResult } from '../types/api';

interface RecognitionState {
  byId: Record<string, RecognitionResult>;
  activeId: string | null;
  save: (r: RecognitionResult) => void;
  updateFoods: (id: string, foods: DetectedFood[]) => void;
  setActive: (id: string | null) => void;
  clearActive: () => void;
}

export const useRecognitions = create<RecognitionState>()(
  persist(
    (set) => ({
      byId: {},
      activeId: null,
      save: (r) =>
        set((s) => ({
          byId: { ...s.byId, [r.id]: r },
          activeId: r.id,
        })),
      updateFoods: (id, foods) =>
        set((s) => ({
          byId: s.byId[id] ? { ...s.byId, [id]: { ...s.byId[id], foods } } : s.byId,
        })),
      setActive: (id) => set({ activeId: id }),
      clearActive: () => set({ activeId: null }),
    }),
    {
      name: 'sage:recognitions',
      storage: createJSONStorage(() => AsyncStorage),
      // Limit persisted payload to what we actually need to hydrate.
      partialize: (s) => ({ byId: s.byId, activeId: s.activeId }),
    },
  ),
);
