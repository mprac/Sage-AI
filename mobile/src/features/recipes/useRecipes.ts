/** Recipe hooks: generate from chat, save to cookbook, list, fetch, delete. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import { useWallet } from '../../store/wallet';
import type { GeneratedRecipe, Recipe, RecipeSummary } from '../../types/api';

export function useGenerateRecipe() {
  const setBalance = useWallet((s) => s.setBalance);
  return useMutation({
    mutationFn: (input: { session_id?: string | null; recognition_id?: string | null; request?: string }) =>
      api.post<GeneratedRecipe>('/recipes/generate', input),
    onSuccess: (res) => setBalance(res.balance),
  });
}

export function useSaveRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recipe: Recipe) => api.post<{ id: string }>('/recipes', recipe),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  });
}

export function useRecipes() {
  return useQuery({ queryKey: ['recipes'], queryFn: () => api.get<RecipeSummary[]>('/recipes') });
}

export function useRecipe(id: string | null) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => api.get<Recipe>(`/recipes/${id}`),
    enabled: !!id,
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/recipes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  });
}
