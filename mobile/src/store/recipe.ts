/** Holds a freshly-generated (not-yet-saved) recipe so the detail screen can render it. */
import { create } from 'zustand';

import type { Recipe } from '../types/api';

interface RecipeState {
  draft: Recipe | null;
  setDraft: (r: Recipe | null) => void;
}

export const useRecipeDraft = create<RecipeState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
}));
