# CLAUDE.md — Sage project standards

Authoritative rules for working in this repo. **Read before making changes.** These encode hard-won
fixes — violating them reintroduces bugs we already solved.

---

## What this is
**Sage** — an AI personal-chef mobile app. Snap a photo of your ingredients → AI identifies them →
streaming chat suggests meals → generates full recipes with a step-by-step Cook Mode → a
Tamagotchi-style chef companion you feed by cooking. Metered by a credit wallet.

- **`mobile/`** — Expo + React Native (TypeScript), Expo Router.
- **`api/`** — FastAPI (async), SQLAlchemy + asyncpg.
- **Supabase** — Postgres (+pgvector) + Auth + Storage.
- **Claude/Anthropic** — Haiku (vision + extraction), Sonnet (chat + recipes). **Voyage** embeddings.
- **RevenueCat** — credit-pack IAP.

---

## 🔴 CRITICAL RULES (these caused real outages — do not break)

### 1. Expo SDK is pinned to 54 — keep it matched to Expo Go
- The physical phone's **Expo Go is SDK 54**. The project **must** stay SDK 54.
- **NEVER** run `npm install expo@latest` or `npx expo install expo` — they jump the SDK (we got
  silently bumped to 56 → RN 0.85 → codegen crash). `expo` stays `~54.0.0`.
- Install ANY native/Expo package with **`npx expo install <pkg>`** (never bare `npm install` for
  them) so the version matches SDK 54.
- After dependency changes, **verify**: `npm ls expo react-native` → must show `expo@54.x` and
  `react-native@0.81.x`. If you see 56 / 0.85, stop and fix before bundling.

### 2. Mobile auth uses a custom REST client, NOT supabase-js
- `mobile/src/lib/supabase.ts` talks to the Supabase Auth REST API directly with RN's global
  `fetch`. supabase-js's GoTrue client is **broken in Expo Go SDK 54** (ignores storage/fetch
  options; `Network request failed` / `_returnResult is not a function`). **Do not reintroduce
  `@supabase/supabase-js` for auth.** Session persists via `expo-secure-store` + token refresh.

### 3. Icons, not emojis
- No decorative emojis in UI. Use `<Icon name=… />` (`mobile/src/components/ui/Icon.tsx`, wraps
  **lucide-react-native**) and `<Markdown>` for AI text. Add new glyphs to `Icon.tsx`'s `ICONS` map.
- Exceptions: the pre-auth "🌿 Sage" wordmark and playful cosmetic-shop items.

### 4. `.npmrc` has `legacy-peer-deps=true` — keep it
- React 19 / RN 0.81: several libs (lucide, markdown-display, purchases) ship stale React 16–18
  peer ranges. The `.npmrc` lets installs resolve. Don't remove it.

### 5. Backend DATABASE_URL must use the Supabase **Session Pooler** (IPv4)
- Direct host `db.<ref>.supabase.co` is **IPv6-only** → `getaddrinfo failed` on most networks.
- Use the **Session pooler** URI (`...pooler.supabase.com:5432`, user `postgres.<ref>`) and the
  **`postgresql+asyncpg://`** scheme (async driver — not `postgresql://`, which needs psycopg2).

### 6. Supabase keys + token validation
- **Publishable** key (`sb_publishable_…`) → `mobile/.env` `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Secret** key (`sb_secret_…`) → `api/.env` `SUPABASE_SERVICE_KEY` (server only).
- Backend validates user tokens via `GET {SUPABASE_URL}/auth/v1/user` (works with the new
  asymmetric JWT signing keys) — **no `SUPABASE_JWT_SECRET` needed**. See `api/app/core/security.py`.

### 7. Phone ↔ backend networking
- Backend binds `0.0.0.0` (via `api/run.ps1`). Phone reaches it at `http://<PC-LAN-IPv4>:8000`
  (`mobile/.env` `EXPO_PUBLIC_API_URL`) — never `localhost`/`127.0.0.1` from the device.
- Ignore VirtualBox/Hyper-V adapter IPs (`192.168.56.*`); use the Wi-Fi IPv4. Allow inbound TCP 8000
  in Windows Firewall. Tunnel mode (`npx expo start --tunnel`) only loads the JS bundle — backend
  calls still go over the LAN.

### 8. Row-Level Security stays ON
- Every table has RLS enabled; clients read only their own rows. The backend uses the **service
  role** key (bypasses RLS) for writes. **Never disable RLS.** `api/supabase/schema.sql` is
  re-runnable but its top `drop table` block **wipes data** — don't run it against real data.

### 9. This workspace blocks Bash
- `.claude/settings.json` denies `Bash`. Build/scaffold by **writing files directly**; put
  install/run commands in docs for the user to execute.

---

## Architecture conventions
- **Backend:** thin routers → fat services → db/clients. Pydantic schemas in `app/schemas/`,
  business logic in `app/services/`, models in `app/db/models.py`. Config via `pydantic-settings`
  (`app/core/config.py`). All AI calls metered through `services/credits.py`.
- **AI:** model tiering (`config.model_vision` Haiku, `config.model_chat` Sonnet); **tool-use** for
  structured output (recognition, recipe, preference extraction); **prompt caching** on the chat
  system/profile prefix. Read token `usage` and convert to credits.
- **Mobile:** Expo Router file routes in `app/`; shared themed primitives in
  `src/components/ui/`; TanStack Query for server state, Zustand for client state; SSE chat via
  `expo/fetch` streaming in `src/features/chat/useChatStream.ts`.
- **Theming:** `mobile/src/theme/tokens.ts` is the single source of branding — **no raw hex or
  magic numbers** in components; everything reads `useTheme()`. Changing `palette.brand500` rebrands
  the app.
- **Types:** `mobile/src/types/api.ts` mirrors backend schemas; regenerate with `npm run gen:api`
  (openapi-typescript) when the API changes.

---

## Commands
| Task | Command |
|---|---|
| Run backend | `cd api ; .\run.ps1` (binds 0.0.0.0; prints the phone URL) |
| Backend tests | `cd api ; .\run.ps1 -Test` (offline pytest) |
| Start mobile | `cd mobile ; npx expo start --tunnel -c` (`-c` clears cache) |
| Add a native/Expo dep | `cd mobile ; npx expo install <pkg>` (never bare npm install) |
| Regenerate API types | `cd mobile ; npm run gen:api` (backend must be running) |
| Apply DB schema | paste `api/supabase/schema.sql` into the Supabase SQL editor |

---

## Before you ship a change (checklist)
- [ ] `npm ls expo react-native` shows **54.x / 0.81.x**.
- [ ] No new emojis in UI (used `Icon`); AI text rendered via `Markdown`.
- [ ] New UI reads theme tokens (no hardcoded colors/sizes).
- [ ] New backend table has **RLS enabled** + owner policy in `schema.sql`.
- [ ] AI endpoints are **metered** (credits charged) and **owner-checked**.
- [ ] Added native/Expo deps via `npx expo install`, not bare `npm install`.
