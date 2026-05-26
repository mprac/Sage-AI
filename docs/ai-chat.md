# AI Chat — How Sage Works

How the streaming "personal chef" chat is built, and how it's constrained to **only** talk about
food. This is a reference for the existing implementation, not a spec for new work.

> **There is no training / fine-tuning.** Sage is a stock Anthropic model (Claude Sonnet) steered
> entirely by a **system prompt** + **per-user context** at request time. "How it was trained to be
> a chef" is really "how it's *prompted* to be a chef." That distinction matters: changing behavior
> means editing prompts/context, never retraining a model.

---

## The pieces (file map)

| Concern | File |
|---|---|
| **The persona + guardrails prompt** | [api/app/prompts/__init__.py](../api/app/prompts/__init__.py) — `CHAT_SYSTEM` |
| Chat orchestration (builds the request, streams) | [api/app/services/chat.py](../api/app/services/chat.py) |
| HTTP endpoint (SSE, session, history, metering) | [api/app/api/v1/routers/chat.py](../api/app/api/v1/routers/chat.py) |
| Request/event shapes | [api/app/schemas/chat.py](../api/app/schemas/chat.py) |
| User memory: taste profile + pgvector recall + learning | [api/app/services/memory.py](../api/app/services/memory.py) |
| Anthropic/Voyage SDK wrappers + token `Usage` | [api/app/services/anthropic_client.py](../api/app/services/anthropic_client.py) |
| Which model is used for what | [api/app/core/config.py](../api/app/core/config.py) |
| Mobile streaming consumer (typewriter reveal) | [mobile/src/features/chat/useChatStream.ts](../mobile/src/features/chat/useChatStream.ts) |

---

## What "makes it a chef" — the system prompt

The behavior lives in `CHAT_SYSTEM` in [api/app/prompts/__init__.py](../api/app/prompts/__init__.py).
It does three jobs:

1. **Persona** — "You are Sage, a warm, encouraging personal chef… speak like a friendly friend in
   the kitchen."
2. **Scope of job** — decide what to cook from on-hand ingredients, suggest meals, give step-by-step
   recipes, remember tastes.
3. **STRICT TOPIC GUARDRAILS** — this is the on-topic enforcement:
   > Only discuss food, cooking, recipes, ingredients, meal planning, nutrition, and kitchen
   > technique. If the user asks about anything off-topic (coding, politics, general trivia, etc.),
   > politely decline in one short sentence and steer back to food. Do not answer off-topic
   > questions, even partially — it wastes the user's credits.

So the "food-only" restriction is **prompt-level**, not a code filter. There is no keyword
blocklist or classifier rejecting messages before they hit the model — the model itself is
instructed to decline. (Worth knowing for its limits: a determined user can still attempt
jailbreaks; the guardrail is a strong instruction, not a hard gate.)

The prompts module header note is important: **these strings are the cached prompt prefix — keep
them stable.** Editing `CHAT_SYSTEM` busts the prompt cache for everyone.

---

## How a single chat turn flows

`POST /api/v1/chat` → [chat.py](../api/app/api/v1/routers/chat.py) `chat()`:

1. **Credit gate** — `credits.ensure_can_start(...)` rejects if the wallet is below
   `min_credits_to_start`.
2. **Resolve session** — continue `session_id` (owner-checked) or create a new `ChatSession`,
   titled from the first 60 chars of the message.
3. **Assemble context** (the per-user part of the brain):
   - `memory.get_profile(...)` → structured taste profile (likes, allergies, skill, etc.).
   - `memory.recall(...)` → up to 4 semantically-relevant past notes via **pgvector** cosine search.
   - `_load_foods(...)` → ingredients from a linked `Recognition` (the photo scan) or client-sent list.
   - `sage_pet.get_or_create(...)` → the companion's live mood/level/streak.
4. **Load history** — last `chat_history_limit` (20) messages for this session, chronological.
5. **Persist the user turn** + commit.
6. **Stream** via `stream_chat(...)`, emitting Server-Sent Events. On completion: persist the
   assistant turn, **charge credits** from token usage, then run a best-effort **preference-learning**
   pass (not billed).

### The SSE event protocol
Each event is `data: {json}\n\n`. Three payload types (defined in
[schemas/chat.py](../api/app/schemas/chat.py)):
- `{"type":"delta","text":"…"}` — a chunk of the reply.
- `{"type":"done","session_id","credits_spent","balance"}` — final, with the new wallet balance.
- `{"type":"error","message","code"}` — a clean failure the client can show.

---

## How the system prompt is constructed (and cached)

In [services/chat.py](../api/app/services/chat.py) `stream_chat(...)`, the `system` field is a list
of **three blocks**, ordered deliberately so the expensive part is cacheable:

```
[ block 1 ]  CHAT_SYSTEM            ← frozen persona + guardrails (same for everyone)
[ block 2 ]  per-user context       ← taste profile + memory summary + recalls + on-hand foods
             cache_control: ephemeral   ← breakpoint caches blocks 1+2 as the prefix
[ block 3 ]  mood directive          ← volatile (changes as the pet's hunger decays) — NOT cached
```

- **Block 2** (`_build_context_block`) renders the taste profile into instructions, e.g. allergies
  become "Allergies (NEVER suggest): …". The `cache_control` breakpoint sits here, so the whole
  prefix (persona + this user's profile) is cached and reused cheaply across turns in a session.
  Verify cache hits via `usage.cache_read_input_tokens`.
- **Block 3** (`_build_mood_directive`) makes Sage's *voice* reflect the companion's state (thriving,
  hungry, fainted…). It's placed **after** the cache breakpoint precisely because it changes often —
  putting it inside the cached prefix would invalidate the cache. It also re-states "never break the
  food-only rule" so mood can't be used to derail scope.

Then `messages = [*history, {user message}]` and we call `get_anthropic().messages.stream(...)` with
`model=settings.model_chat` (Sonnet), `max_tokens=2048`. Text deltas are yielded as they arrive;
the final `Usage` (with cache tokens folded into input) is appended to `usage_sink` for metering.

---

## Memory — how Sage "remembers" your tastes

[services/memory.py](../api/app/services/memory.py) — three mechanisms:

1. **Structured taste profile** (`taste_profiles` table) — `get_profile` / `apply_update`. List
   fields (likes, dislikes, allergies, dietary_restrictions, favorite_cuisines) **merge as a union**;
   scalars (spice_tolerance, cooking_skill, household_size) overwrite.
2. **Semantic recall** (`recall`) — embeds the incoming message with **Voyage** (`voyage-3`, 1024-d)
   and runs a pgvector cosine search (`embedding <=> :vec`) over the user's `memories`, returning the
   top `k=4` notes. Embedding failures degrade gracefully to "no recalls."
3. **Learning after each turn** (`learn_from_conversation`) — a cheap **Haiku** pass (`model_extract`)
   with forced tool-use (`report_preferences`) extracts *durable* preferences from the
   `User:/Chef:` exchange, merges them into the profile, and embeds a one-sentence `note` into
   `memories` for future recall. Driven by `EXTRACT_SYSTEM` ("only stable preferences… never invent").
   This is best-effort and **not billed** to the user.

So Sage's apparent personalization is: structured profile (always injected) + semantic recall
(query-relevant) — both rendered into the cached context block, plus continuous extraction that
grows the profile over time.

---

## Model tiering (config)

From [core/config.py](../api/app/core/config.py):

| Setting | Model | Used for |
|---|---|---|
| `model_chat` | `claude-sonnet-4-6` | The chat itself (quality matters) |
| `model_vision` | `claude-haiku-4-5` | Photo → ingredient recognition |
| `model_extract` | `claude-haiku-4-5` | Post-chat preference extraction |
| `embedding_model` | `voyage-3` (1024-d) | pgvector memory recall |

Pattern: **Sonnet for the user-facing conversation, cheap Haiku for the frequent background jobs.**

---

## Mobile side — smooth streaming

[mobile/src/features/chat/useChatStream.ts](../mobile/src/features/chat/useChatStream.ts) consumes
the SSE stream with `expo/fetch` (its `Response.body` is a real `ReadableStream` on Expo SDK 52+).
It **decouples network arrival from display**: deltas accumulate into a target buffer, and a steady
~45 fps reveal loop drips out 1–2 chars/tick for a calm typewriter feel regardless of how the
network chunks the data. On `done` it updates the wallet balance; on `error` it surfaces the message.

---

## How to change Sage's behavior

- **Tweak personality / scope / guardrails** → edit `CHAT_SYSTEM` in
  [prompts/__init__.py](../api/app/prompts/__init__.py). Remember it busts the prompt cache.
- **Change what user context is injected** → `_build_context_block` in
  [services/chat.py](../api/app/services/chat.py).
- **Change the mood voice** → `_build_mood_directive` (same file).
- **Change what gets remembered** → `EXTRACT_SYSTEM` + `_EXTRACT_TOOL` in
  [memory.py](../api/app/services/memory.py).
- **Swap models / costs** → [config.py](../api/app/core/config.py).

There is no model weight to retrain — all behavior is prompt + context + tool-use.
