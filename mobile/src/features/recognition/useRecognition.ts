/** Read + edit a saved recognition. Reads from the persisted Zustand cache first;
 *  on a cache miss (e.g. fresh app launch), falls back to GET /recognitions/{id}.
 *  Edits are PATCHed to the backend with an optimistic update to the store. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import { useRecognitions } from '../../store/recognition';
import type { DetectedFood, RecognitionDetail, RecognitionResult } from '../../types/api';

function detailToResult(d: RecognitionDetail): RecognitionResult {
  // Re-use the same store row shape — credits/balance are irrelevant for a re-hydrated
  // recognition, so we zero them out (they're only meaningful immediately after POST /recognize).
  return {
    id: d.id,
    foods: d.foods,
    image_path: d.image_path ?? null,
    credits_spent: 0,
    balance: 0,
  };
}

export function useRecognition(id: string | null | undefined) {
  const qc = useQueryClient();
  const cached = useRecognitions((s) => (id ? s.byId[id] : undefined));
  const save = useRecognitions((s) => s.save);
  const updateFoods = useRecognitions((s) => s.updateFoods);

  const query = useQuery({
    queryKey: ['recognition', id],
    queryFn: async () => {
      const d = await api.get<RecognitionDetail>(`/recognitions/${id}`);
      save(detailToResult(d));
      return d;
    },
    enabled: !!id && !cached,
    staleTime: Infinity,
  });

  const patch = useMutation({
    mutationFn: (foods: DetectedFood[]) =>
      api.patch<RecognitionDetail>(`/recognitions/${id}`, { foods }),
    onMutate: (foods) => {
      if (id) updateFoods(id, foods);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recognition', id] });
    },
  });

  return {
    data: cached,
    isLoading: !cached && query.isLoading,
    isError: !cached && query.isError,
    patch,
  };
}
