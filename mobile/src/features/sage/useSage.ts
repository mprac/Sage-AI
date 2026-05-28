/** Sage companion data hook: fetch state + feed/treat/buy/rename mutations. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import { useWallet } from '../../store/wallet';
import type { Cosmetic, FeedResult, SagePet } from '../../types/api';

/** Credit cost of a treat — mirrors the backend's `TREAT_COST_CREDITS` (api/app/services/sage_pet.py). */
export const TREAT_COST = 40;

export function useSage() {
  const qc = useQueryClient();
  const setBalance = useWallet((s) => s.setBalance);

  const query = useQuery({
    queryKey: ['sage'],
    queryFn: () => api.get<SagePet>('/sage'),
    // Sage decays in real time, so keep it reasonably fresh.
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const onResult = (r: FeedResult) => {
    qc.setQueryData(['sage'], r.pet);
    if (typeof r.credits_balance === 'number') setBalance(r.credits_balance);
    // A successful cook with seasonal ingredients moves the harvest — refresh it so the
    // home tab's harvest meter ticks up without a manual reload.
    if (r.harvest_delta && r.harvest_delta.new_slugs.length > 0) {
      qc.invalidateQueries({ queryKey: ['season'] });
    }
  };

  const feed = useMutation({
    mutationFn: (args: { source: 'cook' | 'snack' | 'checkin'; recipe_id?: string }) =>
      api.post<FeedResult>('/sage/feed', args),
    onSuccess: onResult,
  });

  const treat = useMutation({
    mutationFn: () => api.post<FeedResult>('/sage/treat', {}),
    onSuccess: onResult,
  });

  const buyCosmetic = useMutation({
    mutationFn: (id: string) => api.post<FeedResult>(`/sage/cosmetics/${id}/buy`, {}),
    onSuccess: onResult,
  });

  const rename = useMutation({
    mutationFn: (name: string) => api.patch<SagePet>('/sage', { name }),
    onSuccess: (pet) => qc.setQueryData(['sage'], pet),
  });

  return { ...query, feed, treat, buyCosmetic, rename };
}

export function useCosmetics() {
  return useQuery({ queryKey: ['cosmetics'], queryFn: () => api.get<Cosmetic[]>('/sage/cosmetics') });
}
