# 🌿 Sage — AI Food Recognition & Personal-Chef Recipe App

> **Sage** is your personal AI chef: snap your ingredients and Sage tells you what to cook.

Snap a photo of the food you have → get instant ideas, recipes, and a **streaming AI chat**
that acts as your **personal chef**. It remembers your tastes, stays on topic, and is metered by
a transparent **credit wallet** (buy credit packs via in-app purchase).

> Core loop: **sign up → take a picture → get suggestions → chat.**

---

## Architecture at a glance

| Layer | Tech | Why |
|-------|------|-----|
| Mobile | **Expo + React Native (TypeScript)** | One codebase, iOS + Android, fast iteration |
| Backend | **FastAPI** (async, SSE) on Fly.io/Railway | Streaming-native, Pydantic AI, full control |
| Auth + DB + Storage | **Supabase** (Postgres + pgvector) | Managed, scalable, cheap to start |
| AI | **Claude / Anthropic** (Haiku vision + Sonnet chat, prompt caching) | Quality + cost control |
| Embeddings | **Voyage AI** → pgvector | Semantic "personal chef" memory |
| Payments | **RevenueCat + native IAP** | Required for in-app digital credits |

A single theming file (`mobile/src/theme/tokens.ts`) drives **all** colors/branding.
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

---

## Repo layout

```
food_recipe_app/
├── mobile/   # Expo React Native app
├── api/      # FastAPI backend
└── docs/     # architecture & ops notes
```

---

## Getting started

### Prerequisites
- Node 20+ and `npm`
- Python 3.11+ (and [`uv`](https://github.com/astral-sh/uv) recommended)
- A [Supabase](https://supabase.com) project, [Anthropic](https://console.anthropic.com) key,
  [Voyage AI](https://voyageai.com) key, and a [RevenueCat](https://www.revenuecat.com) account
- The Expo Go app on your phone

### 1) Backend (`api/`)

**Windows (PowerShell) — one command:**
```powershell
cd api
copy .env.example .env     # then fill in your keys
.\run.ps1                  # creates .venv, installs deps, launches the server
# .\run.ps1 -Install       # force a dependency (re)install
# .\run.ps1 -Test          # run pytest instead of the server
```

**macOS / Linux (or manual):**
```bash
cd api
python -m venv .venv && . .venv/bin/activate   # Windows: .\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"                        # installs from pyproject.toml
cp .env.example .env                           # then fill in your keys
python -m uvicorn app.main:app --reload        # http://127.0.0.1:8000/docs
```

### 2) Mobile (`mobile/`)
```bash
cd mobile
npm install
cp .env.example .env                      # fill EXPO_PUBLIC_* values
npx expo start                            # scan the QR code with Expo Go
```

### 3) Database (Supabase)
Run the SQL in [`api/supabase/schema.sql`](api/supabase/schema.sql) in the Supabase SQL editor
(or apply via the Supabase MCP). It creates the tables, enables `pgvector`, sets Row-Level
Security, and creates the Storage bucket.

### 4) Generate typed API client (after the backend is running)
```bash
cd mobile
npm run gen:api        # openapi-typescript → src/types/api.ts
```

### 5) Run backend tests
```bash
cd api
uv pip install -e ".[dev]"
pytest                 # offline unit tests (credit math, billing mapping)
```

### 6) Native build for RevenueCat (in-app purchases)
RevenueCat needs a native build — it does **not** run in Expo Go. Use an EAS dev client:
```bash
cd mobile
npm install -g eas-cli
eas build --profile development --platform ios   # or android
```
The rest of the app (auth, camera, recognition, streaming chat) works in Expo Go;
the wallet screen simply shows no purchasable packs there.

---

## Environment variables

**Backend** (`api/.env`) — see [`api/.env.example`](api/.env.example):
`ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
`SUPABASE_JWT_SECRET`, `DATABASE_URL`, `REVENUECAT_WEBHOOK_SECRET`.

**Mobile** (`mobile/.env`) — see [`mobile/.env.example`](mobile/.env.example):
`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
`EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.

---

## Rebranding in one place
Edit `mobile/src/theme/tokens.ts` — change `palette.brand500` (and friends) and the entire app
re-colors. No component hardcodes a hex value.
