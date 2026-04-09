-- Users table: anonymous identity with optional Quran.com link
create table users (
  id uuid primary key default gen_random_uuid(),
  anon_token text unique not null,
  qf_sub text unique,
  created_at timestamptz default now()
);

-- Game sessions: one row per completed game
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  game text not null,
  settings jsonb not null default '{}',
  score_correct int not null default 0,
  score_total int not null default 0,
  duration_seconds int not null default 0,
  created_at timestamptz default now()
);

create index idx_game_sessions_user on game_sessions(user_id);

-- Question results: one row per question answered
create table question_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  user_id uuid not null references users(id),
  game text not null,
  verse_key text not null,
  correct boolean not null,
  user_answer text,
  response_ms int not null default 0,
  created_at timestamptz default now()
);

create index idx_question_results_user on question_results(user_id);
create index idx_question_results_session on question_results(session_id);

-- Verse confidence: spaced repetition state per ayah per user
create table verse_confidence (
  user_id uuid not null references users(id),
  verse_key text not null,
  confidence float not null default 0,
  last_tested_at timestamptz not null default now(),
  times_tested int not null default 0,
  times_correct int not null default 0,
  primary key (user_id, verse_key)
);

create index idx_verse_confidence_user on verse_confidence(user_id);
