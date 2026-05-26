/** Holds recognition results in-memory so the results screen can read by id without a refetch. */
import { create } from 'zustand';

import type { RecognitionResult } from '../types/api';

interface RecognitionState {
  byId: Record<string, RecognitionResult>;
  save: (r: RecognitionResult) => void;
}

export const useRecognitions = create<RecognitionState>((set) => ({
  byId: {},
  save: (r) => set((state) => ({ byId: { ...state.byId, [r.id]: r } })),
}));
