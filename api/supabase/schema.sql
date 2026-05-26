-- ============================================================================
--  Sage — full Supabase schema (re-runnable clean install)
--  Paste this whole file into the Supabase SQL Editor and Run.
--
--  ⚠️  The DROP section below DELETES ALL DATA in these app tables (not your
--      auth.users / accounts). Safe during development; remove the DROP block
--      once you have real data you want to keep.
-- ============================================================================

create extension if not exists vector;

-- ── DROP (clean slate) ───────────────────────────────────────────────────────
drop table if exists care_events     cascade;
drop table if exists sage_pets       cascade;
drop table if exists memories        cascade;
drop table if exists chat_messages   cascade;
drop table if exists chat_sessions   cascade;
drop table if exists recognitions    cascade;
drop table if exists purchases       cascade;
drop table if exists credit_ledger   cascade;
drop table if exists credit_wallets  cascade;
drop table if exists taste_profiles  cascade;
drop table if exists profiles        cascade;

-- ── Profile (1:1 with auth.users) ──────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

-- ── Taste profile (the "personal chef" structured memory) ───────────────────
create table taste_profiles (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  likes                jsonb not null default '[]',
  dislikes             jsonb not null default '[]',
  allergies            jsonb not null default '[]',
  dietary_restrictions jsonb not null default '[]',
  favorite_cuisines    jsonb not null default '[]',
  spice_tolerance      text,
  cooking_skill        text,
  household_size       int,
  memory_summary       text not null default '',
  updated_at           timestamptz not null default now()
);

-- ── Credit wallet + immutable ledger ────────────────────────────────────────
create table credit_wallets (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  balance    int  not null default 0,
  updated_at timestamptz not null default now()
);

create table credit_ledger (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  delta         int  not null,
  reason        text not null,
  model         text,
  input_tokens  int,
  output_tokens int,
  meta          jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index credit_ledger_user_idx on credit_ledger (user_id, created_at desc);

-- ── Purchases (RevenueCat) — transaction_id PK gives idempotency ────────────
create table purchases (
  transaction_id  text primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  product_id      text not null,
  credits_granted int  not null,
  raw_event       jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

-- ── Recognitions ────────────────────────────────────────────────────────────
create table recognitions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  image_path text,
  foods      jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index recognitions_user_idx on recognitions (user_id, created_at desc);

-- ── Chat sessions + messages ────────────────────────────────────────────────
create table chat_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  recognition_id uuid references recognitions (id) on delete set null,
  title          text,
  created_at     timestamptz not null default now()
);

create table chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions (id) on delete cascade,
  role       text not null,
  content    text not null,
  created_at timestamptz not null default now()
);
create index chat_messages_session_idx on chat_messages (session_id, created_at);

-- ── Semantic memory (pgvector; Voyage voyage-3 = 1024 dims) ─────────────────
create table memories (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  content    text not null,
  kind       text not null default 'note',
  embedding  vector(1024),
  created_at timestamptz not null default now()
);
create index memories_user_idx on memories (user_id);
create index memories_embedding_idx
  on memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ── "Keep Sage Alive" — companion ───────────────────────────────────────────
create table sage_pets (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  name               text not null default 'Sage',
  vitality           int  not null default 100,
  last_update_at     timestamptz not null default now(),
  xp                 int  not null default 0,
  level              int  not null default 1,
  streak_days        int  not null default 0,
  longest_streak     int  not null default 0,
  last_feed_date     date,
  bond_xp            int  not null default 0,
  is_dormant         boolean not null default false,
  unlocked_cosmetics jsonb not null default '[]',
  equipped           jsonb not null default '{}',
  created_at         timestamptz not null default now()
);

create table care_events (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  type           text not null,
  vitality_delta int  not null default 0,
  xp_delta       int  not null default 0,
  meta           jsonb not null default '{}',
  created_at     timestamptz not null default now()
);
create index care_events_user_idx on care_events (user_id, created_at desc);

-- ============================================================================
--  Row-Level Security  (clients read their own rows; backend service role
--  bypasses RLS for all writes)
-- ============================================================================
alter table profiles        enable row level security;
alter table taste_profiles  enable row level security;
alter table credit_wallets  enable row level security;
alter table credit_ledger   enable row level security;
alter table purchases       enable row level security;
alter table recognitions    enable row level security;
alter table chat_sessions   enable row level security;
alter table chat_messages   enable row level security;
alter table memories        enable row level security;
alter table sage_pets       enable row level security;
alter table care_events     enable row level security;

create policy "own profile"        on profiles       for select using (auth.uid() = id);
create policy "own taste"          on taste_profiles for select using (auth.uid() = user_id);
create policy "own wallet"         on credit_wallets for select using (auth.uid() = user_id);
create policy "own ledger"         on credit_ledger  for select using (auth.uid() = user_id);
create policy "own recognitions"   on recognitions   for select using (auth.uid() = user_id);
create policy "own sessions"       on chat_sessions  for select using (auth.uid() = user_id);
create policy "own messages"       on chat_messages  for select using (
  exists (select 1 from chat_sessions s where s.id = session_id and s.user_id = auth.uid())
);
create policy "own memories"       on memories       for select using (auth.uid() = user_id);
create policy "own sage"           on sage_pets      for select using (auth.uid() = user_id);
create policy "own care events"    on care_events    for select using (auth.uid() = user_id);

create policy "upsert own profile" on profiles for insert with check (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);

-- ── Storage bucket for food photos (private; backend uploads via service role) ──
insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', false)
on conflict (id) do nothing;
