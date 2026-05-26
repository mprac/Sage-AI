/**
 * Streaming chat hook — consumes the backend's text/event-stream via `expo/fetch`
 * (whose Response.body is a real ReadableStream in Expo SDK 52+).
 *
 * For a calm, smooth "flow" instead of chunky bursts, we DECOUPLE network arrival from display:
 * incoming deltas accumulate into a target buffer, and a steady reveal loop unveils the text
 * character-by-character at a gentle, near-constant pace (with mild catch-up so long replies
 * never lag). This gives a dreamy typewriter feel regardless of how Claude chunks the stream.
 */
import { fetch as expoFetch } from 'expo/fetch';
import { useCallback, useEffect, useRef, useState } from 'react';

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

// Reveal pacing — a near-constant, capped drip (like Claude/ChatGPT) so it never lurches in
// blocks even when the network delivers big chunks at once.
const TICK_MS = 22; // unveil cadence (~45 fps)
const MIN_STEP = 1; // chars per tick at minimum
const MAX_STEP = 2; // hard cap so a backlog can't reveal a whole block at once
const CATCHUP_DIVISOR = 60; // only nudges toward MAX_STEP on a large backlog

export function useChatStream(initial: ChatMessage[] = [], initialSessionId: string | null = null) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(initialSessionId);
  const setBalance = useWallet((s) => s.setBalance);

  // Smooth-reveal state (refs so the loop reads the latest without re-binding).
  const targetRef = useRef(''); // full text received so far for the active reply
  const revealedRef = useRef(0); // how many chars are currently shown
  const networkDoneRef = useRef(false); // server finished sending this reply
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (initial.length) setMessages(initial);
  }, [initial.length]);
  useEffect(() => {
    if (initialSessionId) sessionIdRef.current = initialSessionId;
  }, [initialSessionId]);

  // Clean up the reveal timer if the screen unmounts mid-stream.
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const setAssistant = (text: string) =>
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { role: 'assistant', content: text };
      return next;
    });

  const startRevealLoop = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      const target = targetRef.current;
      if (revealedRef.current < target.length) {
        const remaining = target.length - revealedRef.current;
        // Steady drip: 1 char/tick, nudging to at most MAX_STEP only on a large backlog.
        const step = Math.min(MAX_STEP, Math.max(MIN_STEP, Math.ceil(remaining / CATCHUP_DIVISOR)));
        revealedRef.current = Math.min(target.length, revealedRef.current + step);
        setAssistant(target.slice(0, revealedRef.current));
      } else if (networkDoneRef.current) {
        // Fully revealed and the server is done — stop.
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setStreaming(false);
      }
    }, TICK_MS);
  }, []);

  const send = useCallback(
    async ({ message, sessionId, recognitionId }: SendArgs) => {
      setError(null);
      setStreaming(true);
      sessionIdRef.current = sessionId;

      // Reset reveal state for this reply.
      targetRef.current = '';
      revealedRef.current = 0;
      networkDoneRef.current = false;

      setMessages((prev) => [...prev, { role: 'user', content: message }, { role: 'assistant', content: '' }]);
      startRevealLoop();

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

            // Append to the buffer — the reveal loop drips it out smoothly.
            if (payload.type === 'delta') targetRef.current += payload.text;
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
        // Tell the reveal loop the network is done; it stops once it finishes unveiling.
        networkDoneRef.current = true;
      }
    },
    [setBalance, startRevealLoop],
  );

  return { messages, streaming, error, send, sessionId: sessionIdRef };
}
