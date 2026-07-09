create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_player_id uuid,
  status text not null default 'lobby' check (status in ('lobby', 'setup', 'playing', 'round_over', 'inactive')),
  category text not null default 'bollywood' check (category in ('bollywood', 'hollywood', 'mixed')),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard', 'expert')),
  life_word text not null default 'BOLLYWOOD' check (life_word in ('BOLLYWOOD', 'HOLLYWOOD')),
  life_remaining integer not null default 9 check (life_remaining >= 0),
  current_turn_player_id uuid,
  masked_movie text,
  guessed_letters text[] not null default '{}',
  wrong_letters text[] not null default '{}',
  settings jsonb not null default '{}',
  hint_mode text check (hint_mode in ('manual', 'random', 'smart_random', 'none', 'difficulty_auto')),
  hint_positions integer[] not null default '{}',
  hint_letters text[] not null default '{}',
  hint_settings jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  score integer not null default 0,
  is_host boolean not null default false,
  is_online boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.rooms
  add constraint rooms_host_player_fk foreign key (host_player_id) references public.players(id) deferrable initially deferred;

alter table public.rooms
  add constraint rooms_turn_player_fk foreign key (current_turn_player_id) references public.players(id) deferrable initially deferred;

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number integer not null,
  category text not null check (category in ('bollywood', 'hollywood', 'mixed')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard', 'expert')),
  movie_title_private text not null,
  movie_display text not null,
  initial_masked_movie text not null,
  masked_movie text not null,
  status text not null default 'playing' check (status in ('setup', 'playing', 'won', 'lost')),
  hint_mode text check (hint_mode in ('manual', 'random', 'smart_random', 'none', 'difficulty_auto')),
  hint_positions integer[] not null default '{}',
  hint_settings jsonb,
  winner_player_id uuid references public.players(id),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.guesses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  guess_type text not null check (guess_type in ('letter', 'full_movie', 'skip')),
  guess_value text,
  is_correct boolean not null default false,
  points_delta integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);
create index if not exists players_room_id_idx on public.players (room_id);
create unique index if not exists players_room_lower_name_idx on public.players (room_id, lower(name));
create index if not exists rounds_room_id_idx on public.rounds (room_id);
create index if not exists guesses_room_round_idx on public.guesses (room_id, round_id);


