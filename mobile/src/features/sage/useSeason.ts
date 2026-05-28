/**
 * Seasonal Journey hook — the user's current season + harvest progress.
 *
 * Reads `/seasons/current` which returns the season name, year, hemisphere,
 * the 12 in-season hero produce items, and the user's progress filling the
 * harvest. Background refresh stays invisible (no loading flicker).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import type { AlmanacEntry, Hemisphere, SeasonOut, TasteProfile } from '../../types/api';

export function useSeason() {
  const query = useQuery({
    queryKey: ['season', 'current'],
    queryFn: () => api.get<SeasonOut>('/seasons/current'),
    // Seasons roll over ~quarterly, so once-per-hour is plenty.
    refetchInterval: 60 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
  });

  const isInSeason = (ingredient: string): boolean => {
    if (!query.data) return false;
    const needle = ingredient.toLowerCase();
    return query.data.produce.some(
      (p) =>
        needle.includes(p.display_name.toLowerCase()) ||
        needle.includes(p.slug.replace(/-/g, ' ')),
    );
  };

  return { ...query, isInSeason };
}

export function useAlmanac(year?: number) {
  return useQuery({
    queryKey: ['season', 'almanac', year ?? 'all'],
    queryFn: () => {
      const qs = year !== undefined ? `?year=${year}` : '';
      return api.get<AlmanacEntry[]>(`/seasons/almanac${qs}`);
    },
    staleTime: 60_000,
  });
}

export function useSetHemisphere() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hemisphere: Hemisphere) =>
      api.patch<TasteProfile>('/seasons/hemisphere', { hemisphere }),
    onSuccess: (profile) => {
      qc.setQueryData(['profile'], profile);
      // Hemisphere change flips the catalog — invalidate current season.
      qc.invalidateQueries({ queryKey: ['season'] });
    },
  });
}
