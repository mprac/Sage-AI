# Plate — Architecture

This document explains how the pieces fit together and the principles behind them.

## Principles
- **DRY & shared components.** UI is built from a small set of themed primitives; backend logic
  lives in services, not routers. Cross-language API types are generated, never hand-copied.
- **Config-driven branding.** One theme token file is the single source of truth for color,
  spacing, radius, and typography.
- **Cost-aware by design.** AI is the only meaningful variable cost, so every AI call is metered,
  model-tiered, and prompt-cached.
- **Thin routers, fat services.** HTTP handlers validate + delegate; business logic is testable
  in isolation.

---

## System diagram

```
┌──────────────────────────┐         HTTPS / SSE          ┌────────────────────────────┐
│  Expo React Native app   │ ───────────────────────────▶ │      FastAPI backend       │
│  • Expo Router           │   Bearer = Supabase JWT      │  routers → services → db   │
│  • TanStack Query/Zustand│ ◀─────────────────────────── │                            │
│  • expo-camera           │      text/event-stream        └────────────┬───────────────┘
│  • react-native-purchases│                                            │
└──────────┬───────────────┘                          ┌─────────────────┼──────────────────┐
           │ supabase-js (auth)                        │                 │                  │
           ▼                                           ▼                 ▼                  ▼
   ┌──────────────────┐                        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  Supabase Auth   │                        │  Anthropic   │  │  Voyage AI   │  │  RevenueCat  │
   └──────────────────┘                        │  (Claude)    │  │ (embeddings) │  │  (webhook)   │
                                               └──────────────┘  └──────────────┘  └──────────────┘
   ┌──────────────────────────────────────────────────────────────────────────────────────────┐
   │  Supabase Postgres (+ pgvector) + Storage  — profiles, taste_profiles, wallets, ledger,    │
   │  recognitions, chat_sessions/messages, memories(vector), purchases                          │
   └──────────────────────────────────────────────────────────────────────────────────────────┘
```

## Auth flow
1. Mobile authenticates with Supabase (`@supabase/supabase-js`) — email or Google/Apple.
2. Supabase returns a JWT; the app stores the session in secure storage and sends it as
   `Authorization: Bearer <jwt>` to FastAPI.
3. FastAPI verifies the JWT (`SUPABASE_JWT_SECRET`) in `core/security.py:get_current_user`
   and injects the user id. The backend never sees passwords.

## Credits & metering
- `credit_wallets.balance` is the live balance; `credit_ledger` is the immutable audit log.
- Each AI route: **pre-check** balance → run AI → read **actual token usage** from the Anthropic
  response → convert tokens→credits via per-model rates (`services/credits.py`) → **atomically
  deduct** + append a ledger row inside one DB transaction.
- New users receive **free starter credits** (a `+grant` ledger row) on first sign-in.
- Purchases: RevenueCat webhook → `services/billing.py` verifies + grants credits, idempotent by
  transaction id (`purchases` table).

## AI design
- **Model tiering:** Haiku for vision recognition + preference extraction (cheap, frequent);
  Sonnet for the chat experience (quality). Configurable in `core/config.py`.
- **Prompt caching:** the system prompt + persona + taste profile + memory summary are sent with
  `cache_control` so multi-turn chats reuse the cached prefix.
- **Guardrails:** the system prompt scopes the assistant to food/cooking/recipes and instructs a
  polite redirect for off-topic requests — no paid tokens wasted on unrelated essays.
- **Structured output:** `/recognize` uses Anthropic tool-use bound to a Pydantic schema so the
  detected-foods response is always valid JSON.

## Personal-chef memory
- **Structured** (`taste_profiles`): likes, dislikes, allergies, diet, cuisines, spice, skill.
- **Summary** (`taste_profiles.memory_summary`): a short running narrative.
- **Semantic** (`memories.embedding` via Voyage + pgvector): top-k recall of past meals/feedback
  injected into the chat prompt.
- After a session, a Haiku pass extracts new preferences → updates the profile + writes embeddings.

## Streaming
- Backend: `StreamingResponse(media_type="text/event-stream")` wrapping
  `AsyncAnthropic().messages.stream(...)`; text deltas emitted as `data: {json}\n\n`, terminated
  with `event: done` carrying credits spent.
- Mobile: `features/chat/useChatStream.ts` reads `response.body` from **`expo/fetch`** and appends
  deltas to the UI for the token-by-token typing effect.

## Type safety across the stack
FastAPI emits an OpenAPI schema → `openapi-typescript` generates `mobile/src/types/api.ts`.
Request/response shapes have a single source of truth.
