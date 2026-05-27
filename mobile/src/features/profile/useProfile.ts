/** Taste-profile hook: the personal-chef preferences the AI has learned about the user. */
import { useQuery } from '@tanstack/react-query';

import { api } from '../../lib/api';
import type { TasteProfile } from '../../types/api';

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: () => api.get<TasteProfile>('/profile') });
}
