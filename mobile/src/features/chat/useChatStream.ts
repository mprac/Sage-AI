/**
 * Streaming chat hook — consumes the backend's text/event-stream via `expo/fetch`
 * (whose Response.body is a real ReadableStream in Expo SDK 52+). Renders Claude's
 * reply token-by-token, the "pro" typing effect.
 */
import { fetch as expoFetch } from 'expo/fetch';
import { useCallback, useRef, useState } from 'react';

import { API_URL } from '../../lib/api';
import { getAccessToken } from '../../lib/supabase';
import { useWallet } from '../../store/wallet';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SendArgs {
  message: string;
  sessionId: string | null;
  recognitionId?: string | null;
}

export function useChatStream(initial: ChatMessage[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const setBalance = useWallet((s) => s.setBalance);

  const send = useCallback(
    async ({ message, sessionId, recognitionId }: SendArgs) => {
      setError(null);
      setStreaming(true);
      sessionIdRef.current = sessionId;

      // Optimistically render the user's turn + an empty assistant turn to fill in.
      setMessages((prev) => [...prev, { role: 'user', content: message }, { role: 'assistant', content: '' }]);

      const appendToAssistant = (text: string) =>
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: next[next.length - 1].content + text,
          };
          return next;
        });

      try {
        const token = await getAccessToken();
        const res = await expoFetch(`${API_URL}/api/v1/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message,
            session_id: sessionId,
            recognition_id: recognitionId ?? null,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Chat failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Parse the SSE stream: events are separated by a blank line; each carries a `data:` JSON.
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const line = chunk.split('\n').find((l) => l.startsWith('data:'));
            if (!line) continue;
            const payload = JSON.parse(line.slice(5).trim());

            if (payload.type === 'delta') appendToAssistant(payload.text);
            else if (payload.type === 'done') {
              sessionIdRef.current = payload.session_id;
              setBalance(payload.balance);
            } else if (payload.type === 'error') {
              setError(payload.message ?? 'Something went wrong.');
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      } finally {
        setStreaming(false);
      }
    },
    [setBalance],
  );

  return { messages, streaming, error, send, sessionId: sessionIdRef };
}
