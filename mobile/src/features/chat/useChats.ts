/** Chat history hooks: list past conversations + load one session's messages. */
import { useQuery } from '@tanstack/react-query';

import { api } from '../../lib/api';
import type { ChatMessage } from './useChatStream';

export interface ChatSummary {
  id: string;
  title: string;
  created_at: string;
}

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: () => api.get<ChatSummary[]>('/chats'),
    staleTime: 10_000,
  });
}

export function useChatMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ['chat-messages', sessionId],
    queryFn: () => api.get<ChatMessage[]>(`/chats/${sessionId}/messages`),
    enabled: !!sessionId,
  });
}
