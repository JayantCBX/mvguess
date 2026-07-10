-- Advanced modes, player lifecycle, private per-player round state, and safe actions.

alter table public.rooms
  add column if not exists guess_visibility_mode text not null default 'shared_public'
    check (guess_visibility_mode in ('shared_public', 'private_secret')),
  add column if not exists secret_score_reveal_mode text not null default 'round_end'
    check (secret_score_reveal_mode in ('live', 'round_end')),
  add column if not exists last_player_standing_rule text not null default 'continue'
    check (last_player_standing_rule in ('continue', 'auto_win'));

alter table public.players
  add column if not exists status text not null default 'active'
    check (status in ('active', 'left', 'eliminated', 'kicked')),
  add column if not exists eliminated_at timestamptz,
  add column if not exists left_at timestamptz,
  add column if not exists kicked_at timestamptz,
  add column if not exists kicked_by_player_id uuid references public.players(id),
  add column if not exists device_id text;

drop index if exists public.players_room_lower_name_idx;
create unique index if not exists players_room_active_lower_name_idx
  on public.players (room_id, lower(name))
  where status not in ('left', 'kicked');
create index if not exists players_room_device_idx on public.players(room_id, device_id) where device_id is not null;

create table if not exists public.player_round_states (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  masked_movie text not null,
  guessed_letters text[] not null default '{}',
  wrong_letters text[] not null default '{}',
  life_remaining integer not null check (life_remaining >= 0),
  is_eliminated boolean not null default false,
  pending_score integer not null default 0,
  last_guess_status text check (last_guess_status is null or last_guess_status in ('correct', 'wrong', 'skipped', 'solved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, player_id)
);

create table if not exists public.room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_id uuid references public.rounds(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  event_type text not null,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.player_round_states enable row level security;
alter table public.room_events enable row level security;
revoke all on public.player_round_states from anon;
revoke all on public.room_events from anon;
revoke select on public.rounds from anon;
revoke select on public.guesses from anon;

create or replace view public.rooms_public as
select
  id, code, host_player_id, status, category, difficulty, life_word, life_remaining,
  current_turn_player_id, masked_movie, guessed_letters, wrong_letters, settings,
  hint_mode, hint_positions, hint_letters, hint_settings, created_at, updated_at,
  guess_visibility_mode, secret_score_reveal_mode, last_player_standing_rule
from public.rooms;

create or replace view public.rounds_public as
select
  id, room_id, round_number, category, difficulty,
  case when status in ('won', 'lost') then movie_display else null end as movie_display,
  initial_masked_movie,
  case when status in ('won', 'lost') then masked_movie else initial_masked_movie end as masked_movie,
  status, hint_mode, hint_positions, hint_settings, winner_player_id, created_at, ended_at,
  movie_giver_player_id
from public.rounds;

grant select on public.rooms_public, public.rounds_public to anon;

create or replace view public.players_public as
select id, room_id, name, score, is_host, is_online, joined_at, last_seen_at,
  status, eliminated_at, left_at, kicked_at, kicked_by_player_id,
  null::text as device_id
from public.players;
grant select on public.players_public to anon;
revoke select on public.players from anon;

create or replace function public.get_available_player_id_rpc(p_preferred_player_id uuid, p_target_room_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_room_id uuid;
begin
  select room_id into v_room_id from public.players where id = p_preferred_player_id;
  if not found or (p_target_room_id is not null and v_room_id = p_target_room_id) then return p_preferred_player_id; end if;
  return gen_random_uuid();
end;
$$;

create or replace function public.next_turn_player_excluding(room_uuid uuid, current_player uuid, excluded_player uuid default null)
returns uuid language sql stable as $$
  with ordered as (
    select p.id, row_number() over (order by p.joined_at asc) as rn
    from public.players p
    where p.room_id = room_uuid
      and p.is_online = true
      and p.status = 'active'
      and (excluded_player is null or p.id <> excluded_player)
      and not exists (
        select 1 from public.player_round_states prs
        where prs.player_id = p.id and prs.room_id = room_uuid and prs.is_eliminated = true
      )
  ), current_row as (select rn from ordered where id = current_player)
  select coalesce(
    (select id from ordered where rn > coalesce((select rn from current_row), 0) order by rn limit 1),
    (select id from ordered order by rn limit 1)
  );
$$;

create or replace function public.get_my_player_round_state_rpc(p_room_id uuid, p_player_id uuid)
returns table (
  room_id uuid, round_id uuid, player_id uuid, masked_movie text, guessed_letters text[],
  wrong_letters text[], life_remaining integer, is_eliminated boolean, pending_score integer,
  last_guess_status text, updated_at timestamptz
)
language sql security definer set search_path = public stable as $$
  select prs.room_id, prs.round_id, prs.player_id, prs.masked_movie, prs.guessed_letters,
    prs.wrong_letters, prs.life_remaining, prs.is_eliminated, prs.pending_score,
    prs.last_guess_status, prs.updated_at
  from public.player_round_states prs
  join public.players p on p.id = prs.player_id and p.room_id = prs.room_id
  where prs.room_id = p_room_id and prs.player_id = p_player_id;
$$;

create or replace function public.get_visible_guess_history_rpc(p_room_id uuid, p_player_id uuid)
returns table (
  id uuid, room_id uuid, round_id uuid, player_id uuid, guess_type text,
  guess_value text, is_correct boolean, visibility text, created_at timestamptz
)
language sql security definer set search_path = public stable as $$
  select g.id,g.room_id,g.round_id,g.player_id,g.guess_type,
    g.guess_value,g.is_correct,
    case when coalesce(r.settings->>'guessVisibilityMode',r.guess_visibility_mode,'shared_public')='private_secret' then 'private' else 'public' end,
    g.created_at
  from public.guesses g join public.rooms r on r.id=g.room_id
  where g.room_id=p_room_id
    and (coalesce(r.settings->>'guessVisibilityMode',r.guess_visibility_mode,'shared_public')<>'private_secret' or g.player_id=p_player_id)
  union all
  select e.id,e.room_id,e.round_id,e.player_id,coalesce(e.payload->>'guessType','letter'),null,null,'public',e.created_at
  from public.room_events e join public.rooms r on r.id=e.room_id
  where e.room_id=p_room_id and e.visibility='public'
    and coalesce(r.settings->>'guessVisibilityMode',r.guess_visibility_mode,'shared_public')='private_secret'
  order by created_at;
$$;

create or replace function public.return_to_lobby_rpc(p_room_id uuid, p_player_id uuid)
returns public.rooms_public language plpgsql security definer set search_path = public as $$
declare v_room public.rooms%rowtype; v_next_giver uuid;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if v_room.status not in ('round_over', 'lobby') then raise exception 'The round has not ended'; end if;
  v_next_giver := public.next_movie_giver(p_room_id);
  if v_room.host_player_id <> p_player_id and v_next_giver is distinct from p_player_id then
    raise exception 'Waiting for host or next movie giver';
  end if;
  update public.players set status = 'active' where room_id = p_room_id and is_online and status = 'eliminated';
  update public.rooms set status = 'lobby', current_turn_player_id = null, updated_at = now() where id = p_room_id;
  return (select r from public.rooms_public r where r.id = p_room_id);
end;
$$;

create or replace function public.transfer_host_rpc(p_room_id uuid, p_current_host_player_id uuid, p_new_host_player_id uuid)
returns public.rooms_public language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.rooms where id = p_room_id and host_player_id = p_current_host_player_id) then
    raise exception 'Only the host can transfer host';
  end if;
  if not exists (select 1 from public.players where id = p_new_host_player_id and room_id = p_room_id and is_online and status = 'active') then
    raise exception 'New host must be online and active';
  end if;
  update public.players set is_host = (id = p_new_host_player_id) where room_id = p_room_id;
  update public.rooms set host_player_id = p_new_host_player_id, updated_at = now() where id = p_room_id;
  return (select r from public.rooms_public r where r.id = p_room_id);
end;
$$;

create or replace function public.eliminate_player_rpc(p_room_id uuid, p_host_player_id uuid, p_target_player_id uuid)
returns public.rooms_public language plpgsql security definer set search_path = public as $$
declare v_room public.rooms%rowtype; v_round_id uuid;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if v_room.host_player_id <> p_host_player_id then raise exception 'Only the host can eliminate players'; end if;
  if coalesce((v_room.settings->>'allowHostEliminate')::boolean, true) = false then raise exception 'Host elimination is disabled'; end if;
  if p_target_player_id = p_host_player_id then raise exception 'Transfer host before removing yourself'; end if;
  update public.players set status = 'eliminated', eliminated_at = now() where id = p_target_player_id and room_id = p_room_id;
  select id into v_round_id from public.rounds where room_id = p_room_id and status = 'playing' order by created_at desc limit 1;
  update public.player_round_states set is_eliminated = true, updated_at = now() where round_id = v_round_id and player_id = p_target_player_id;
  if v_room.current_turn_player_id = p_target_player_id then
    update public.rooms set current_turn_player_id = public.next_turn_player_excluding(p_room_id, p_target_player_id, null), updated_at = now() where id = p_room_id;
  end if;
  return (select r from public.rooms_public r where r.id = p_room_id);
end;
$$;

create or replace function public.kick_player_rpc(p_room_id uuid, p_host_player_id uuid, p_target_player_id uuid)
returns public.rooms_public language plpgsql security definer set search_path = public as $$
declare v_room public.rooms%rowtype;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if v_room.host_player_id <> p_host_player_id then raise exception 'Only the host can kick players'; end if;
  if coalesce((v_room.settings->>'allowHostKick')::boolean, true) = false then raise exception 'Host kick is disabled'; end if;
  if p_target_player_id = p_host_player_id then raise exception 'Transfer host before removing yourself'; end if;
  if v_room.status = 'playing' then perform public.eliminate_player_rpc(p_room_id, p_host_player_id, p_target_player_id); end if;
  update public.players set status = 'kicked', is_online = false, kicked_at = now(), kicked_by_player_id = p_host_player_id, last_seen_at = now()
  where id = p_target_player_id and room_id = p_room_id;
  if v_room.status = 'setup' and v_room.current_turn_player_id = p_target_player_id then
    update public.rooms set status = case when exists(select 1 from public.rounds where room_id = p_room_id) then 'round_over' else 'lobby' end,
      current_turn_player_id = null, updated_at = now() where id = p_room_id;
  end if;
  return (select r from public.rooms_public r where r.id = p_room_id);
end;
$$;

create or replace function public.leave_room_rpc(p_room_id uuid, p_player_id uuid)
returns public.rooms_public language plpgsql security definer set search_path = public as $$
declare v_room public.rooms%rowtype; v_next_host uuid; v_round_id uuid;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if v_room.status = 'playing' and coalesce((v_room.settings->>'allowLeaveDuringGame')::boolean, true) = false then raise exception 'Leaving during a round is disabled'; end if;
  update public.players set is_online = false,
    status = case when v_room.status = 'playing' then 'eliminated' else 'left' end,
    eliminated_at = case when v_room.status = 'playing' then now() else eliminated_at end,
    left_at = case when v_room.status <> 'playing' then now() else left_at end,
    last_seen_at = now() where id = p_player_id and room_id = p_room_id;
  if v_room.status = 'playing' then
    select id into v_round_id from public.rounds where room_id = p_room_id and status = 'playing' order by created_at desc limit 1;
    update public.player_round_states set is_eliminated = true, updated_at = now() where round_id = v_round_id and player_id = p_player_id;
    if v_room.current_turn_player_id = p_player_id then
      update public.rooms set current_turn_player_id = public.next_turn_player_excluding(p_room_id, p_player_id, null) where id = p_room_id;
    end if;
  elsif v_room.status = 'setup' and v_room.current_turn_player_id = p_player_id then
    update public.rooms set status = case when exists(select 1 from public.rounds where room_id = p_room_id) then 'round_over' else 'lobby' end,
      current_turn_player_id = null where id = p_room_id;
  end if;
  if v_room.host_player_id = p_player_id then
    select id into v_next_host from public.players where room_id = p_room_id and is_online and status = 'active' order by joined_at limit 1;
    update public.players set is_host = (id = v_next_host) where room_id = p_room_id;
    update public.rooms set host_player_id = v_next_host where id = p_room_id;
  end if;
  update public.rooms set updated_at = now() where id = p_room_id;
  return (select r from public.rooms_public r where r.id = p_room_id);
end;
$$;

create or replace function public.begin_round_setup_rpc(p_room_id uuid, p_player_id uuid)
returns public.rooms_public language plpgsql security definer set search_path = public as $$
declare v_room public.rooms%rowtype; v_giver uuid; v_giver_name text;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if v_room.status not in ('lobby','round_over') then raise exception 'Round setup is not available'; end if;
  update public.players set status = 'active' where room_id = p_room_id and is_online and status = 'eliminated';
  if (select count(*) from public.players where room_id=p_room_id and is_online and status='active') < 2 then raise exception 'Minimum 2 players required'; end if;
  v_giver := public.next_movie_giver(p_room_id);
  if v_giver is null then raise exception 'No online movie giver available'; end if;
  if v_giver <> p_player_id then
    select name into v_giver_name from public.players where id=v_giver;
    raise exception 'Only % can set the next movie',coalesce(v_giver_name,'the next movie giver');
  end if;
  update public.rooms set status='setup',current_turn_player_id=v_giver,masked_movie=null,guessed_letters='{}',wrong_letters='{}',updated_at=now() where id=p_room_id;
  return (select r from public.rooms_public r where r.id=p_room_id);
end;
$$;

-- Replace round start so secret rounds create one state row per guesser.
create or replace function public.start_round_rpc(
  p_room_id uuid, p_player_id uuid, p_movie_title text, p_movie_display text,
  p_masked_movie text, p_hint_mode text, p_hint_positions integer[],
  p_hint_letters text[], p_hint_settings jsonb
)
returns public.rooms_public language plpgsql security definer set search_path = public as $$
declare v_room public.rooms%rowtype; v_round_id uuid; v_round_number integer; v_giver uuid; v_mode text;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if v_room.status not in ('setup','lobby','round_over') then raise exception 'Round setup is not available'; end if;
  if (select count(*) from public.players where room_id=p_room_id and is_online and status='active') < 2 then raise exception 'Minimum 2 players required'; end if;
  v_giver := case when v_room.status = 'setup' then v_room.current_turn_player_id else public.next_movie_giver(p_room_id) end;
  if v_giver is distinct from p_player_id then raise exception 'Only the assigned movie giver can start this round'; end if;
  if trim(coalesce(p_movie_title,'')) !~* '[a-z]' or char_length(trim(p_movie_title)) < 2 then raise exception 'Movie title is required'; end if;
  select coalesce(max(round_number),0)+1 into v_round_number from public.rounds where room_id = p_room_id;
  insert into public.rounds(room_id,round_number,category,difficulty,movie_giver_player_id,movie_title_private,movie_display,initial_masked_movie,masked_movie,status,hint_mode,hint_positions,hint_settings)
  values(p_room_id,v_round_number,v_room.category,v_room.difficulty,v_giver,trim(p_movie_title),trim(coalesce(p_movie_display,p_movie_title)),p_masked_movie,p_masked_movie,'playing',p_hint_mode,coalesce(p_hint_positions,'{}'),p_hint_settings)
  returning id into v_round_id;
  v_mode := coalesce(v_room.settings->>'guessVisibilityMode', v_room.guess_visibility_mode, 'shared_public');
  if v_mode = 'private_secret' then
    insert into public.player_round_states(room_id,round_id,player_id,masked_movie,life_remaining)
    select p_room_id,v_round_id,id,p_masked_movie,char_length(v_room.life_word)
    from public.players where room_id = p_room_id and is_online and status = 'active' and id <> v_giver;
  end if;
  update public.rooms set status='playing', life_remaining=char_length(life_word), current_turn_player_id=public.next_turn_player_excluding(p_room_id,null,v_giver),
    masked_movie=p_masked_movie, guessed_letters='{}', wrong_letters='{}', hint_mode=p_hint_mode, hint_positions=coalesce(p_hint_positions,'{}'),
    hint_letters=coalesce(p_hint_letters,'{}'), hint_settings=p_hint_settings, guess_visibility_mode=v_mode,
    secret_score_reveal_mode=coalesce(v_room.settings->>'secretScoreRevealMode',v_room.secret_score_reveal_mode,'round_end'),
    last_player_standing_rule=coalesce(v_room.settings->>'lastPlayerStandingRule',v_room.last_player_standing_rule,'continue'), updated_at=now()
  where id=p_room_id;
  return (select r from public.rooms_public r where r.id=p_room_id);
end;
$$;

-- Shared mode keeps room-level state. Secret mode only changes the actor's private row.
create or replace function public.submit_guess_rpc(p_room_code text,p_player_id uuid,p_guess_type text,p_guess_value text default null)
returns public.rooms_public language plpgsql security definer set search_path = public as $$
declare
  v_room public.rooms%rowtype; v_round public.rounds%rowtype; v_state public.player_round_states%rowtype;
  v_guess text:=upper(trim(coalesce(p_guess_value,''))); v_correct boolean:=false; v_points integer:=0;
  v_mask text; v_life integer; v_next uuid; v_mode text; v_reveal text; v_remaining integer; v_last uuid;
begin
  select * into v_room from public.rooms where code=upper(p_room_code) for update;
  if not found then raise exception 'Room not found'; end if;
  if v_room.status<>'playing' then raise exception 'Round is not active'; end if;
  if v_room.current_turn_player_id<>p_player_id then raise exception 'It is not your turn'; end if;
  select * into v_round from public.rounds where room_id=v_room.id and status='playing' order by created_at desc limit 1 for update;
  if v_round.movie_giver_player_id=p_player_id then raise exception 'Movie giver cannot guess their own movie'; end if;
  v_mode:=coalesce(v_room.settings->>'guessVisibilityMode',v_room.guess_visibility_mode,'shared_public');
  v_reveal:=coalesce(v_room.settings->>'secretScoreRevealMode',v_room.secret_score_reveal_mode,'round_end');
  if v_mode='private_secret' then
    select * into v_state from public.player_round_states where round_id=v_round.id and player_id=p_player_id for update;
    if not found or v_state.is_eliminated then raise exception 'You are not active in this round'; end if;
    v_mask:=v_state.masked_movie; v_life:=v_state.life_remaining;
    if p_guess_type='letter' then
      if v_guess !~ '^[A-Z]$' then raise exception 'Invalid alphabet'; end if;
      if v_guess=any(v_state.guessed_letters) then raise exception 'Guess already used'; end if;
      v_correct:=position(v_guess in upper(v_round.movie_title_private))>0;
      v_points:=case when v_correct then 10 when coalesce((v_room.settings->>'wrongGuessPenalty')::boolean,false) then -5 else 0 end;
      if v_correct then v_mask:=public.reveal_letter(v_round.movie_title_private,v_mask,v_guess); else v_life:=greatest(0,v_life-1); end if;
      update public.player_round_states set guessed_letters=array_append(guessed_letters,v_guess), wrong_letters=case when v_correct then wrong_letters else array_append(wrong_letters,v_guess) end,
        masked_movie=v_mask,life_remaining=v_life,is_eliminated=(not v_correct and v_life=0),pending_score=pending_score+case when v_reveal='round_end' then v_points else 0 end,
        last_guess_status=case when v_correct and public.normalize_movie(v_mask)=public.normalize_movie(v_round.movie_title_private) then 'solved' when v_correct then 'correct' else 'wrong' end,updated_at=now()
      where id=v_state.id;
    elsif p_guess_type='full_movie' then
      if char_length(v_guess)<2 or char_length(v_guess)>80 then raise exception 'Invalid movie guess'; end if;
      v_correct:=public.normalize_movie(v_guess)=public.normalize_movie(v_round.movie_title_private); v_points:=case when v_correct then 50 else 0 end;
      if v_correct then v_mask:=v_round.movie_title_private; else v_life:=greatest(0,v_life-2); end if;
      update public.player_round_states set masked_movie=v_mask,life_remaining=v_life,is_eliminated=(not v_correct and v_life=0),
        pending_score=pending_score+case when v_reveal='round_end' then v_points else 0 end,last_guess_status=case when v_correct then 'solved' else 'wrong' end,updated_at=now() where id=v_state.id;
    elsif p_guess_type='skip' then
      update public.player_round_states set last_guess_status='skipped',updated_at=now() where id=v_state.id;
    else raise exception 'Invalid guess type'; end if;
    if v_reveal='live' and v_points<>0 then update public.players set score=score+v_points where id=p_player_id; end if;
    insert into public.room_events(room_id,round_id,player_id,event_type,visibility,payload) values(v_room.id,v_round.id,p_player_id,'guess_completed','public',jsonb_build_object('guessType',p_guess_type));
    if p_guess_type<>'skip' then insert into public.guesses(room_id,round_id,player_id,guess_type,guess_value,is_correct,points_delta) values(v_room.id,v_round.id,p_player_id,p_guess_type,v_guess,v_correct,v_points); end if;
    if v_correct and (p_guess_type='full_movie' or public.normalize_movie(v_mask)=public.normalize_movie(v_round.movie_title_private)) then
      if v_reveal='round_end' then update public.players p set score=p.score+prs.pending_score from public.player_round_states prs where prs.round_id=v_round.id and p.id=prs.player_id; end if;
      update public.rounds set status='won',masked_movie=v_round.movie_title_private,winner_player_id=p_player_id,ended_at=now() where id=v_round.id;
      update public.rooms set status='round_over',masked_movie=v_round.movie_title_private,current_turn_player_id=null,updated_at=now() where id=v_room.id;
    else
      select count(*),(array_agg(prs.player_id order by p.joined_at))[1] into v_remaining,v_last from public.player_round_states prs join public.players p on p.id=prs.player_id where prs.round_id=v_round.id and not prs.is_eliminated and p.is_online and p.status='active';
      if v_remaining=0 or (v_remaining=1 and v_room.last_player_standing_rule='auto_win') then
        if v_reveal='round_end' then update public.players p set score=p.score+prs.pending_score from public.player_round_states prs where prs.round_id=v_round.id and p.id=prs.player_id; end if;
        update public.rounds set status=case when v_remaining=0 then 'lost' else 'won' end,winner_player_id=case when v_remaining=1 then v_last else null end,ended_at=now() where id=v_round.id;
        update public.rooms set status='round_over',masked_movie=v_round.movie_title_private,current_turn_player_id=null,updated_at=now() where id=v_room.id;
      else update public.rooms set current_turn_player_id=public.next_turn_player_excluding(v_room.id,p_player_id,v_round.movie_giver_player_id),updated_at=now() where id=v_room.id; end if;
    end if;
  else
    -- Delegate shared behavior inline so existing public mode remains unchanged.
    v_mask:=v_room.masked_movie; v_life:=v_room.life_remaining; v_next:=public.next_turn_player_excluding(v_room.id,p_player_id,v_round.movie_giver_player_id);
    if p_guess_type='letter' then
      if v_guess !~ '^[A-Z]$' then raise exception 'Invalid alphabet'; end if;
      if v_guess=any(v_room.guessed_letters) then raise exception 'Guess already used'; end if;
      v_correct:=position(v_guess in upper(v_round.movie_title_private))>0;
      v_points:=case when v_correct then 10 when coalesce((v_room.settings->>'wrongGuessPenalty')::boolean,false) then -5 else 0 end;
      if v_correct then v_mask:=public.reveal_letter(v_round.movie_title_private,v_mask,v_guess); else v_life:=greatest(0,v_life-1); end if;
      update public.rooms set guessed_letters=array_append(guessed_letters,v_guess),wrong_letters=case when v_correct then wrong_letters else array_append(wrong_letters,v_guess) end,masked_movie=v_mask,life_remaining=v_life,current_turn_player_id=v_next,updated_at=now() where id=v_room.id;
    elsif p_guess_type='full_movie' then
      v_correct:=public.normalize_movie(v_guess)=public.normalize_movie(v_round.movie_title_private); v_points:=case when v_correct then 50 else 0 end;
      if v_correct then v_mask:=v_round.movie_title_private; else v_life:=greatest(0,v_life-2); end if;
      update public.rooms set masked_movie=v_mask,life_remaining=v_life,current_turn_player_id=v_next,updated_at=now() where id=v_room.id;
    elsif p_guess_type='skip' then update public.rooms set current_turn_player_id=v_next,updated_at=now() where id=v_room.id;
    else raise exception 'Invalid guess type'; end if;
    if v_points<>0 then update public.players set score=score+v_points where id=p_player_id; end if;
    insert into public.guesses(room_id,round_id,player_id,guess_type,guess_value,is_correct,points_delta) values(v_room.id,v_round.id,p_player_id,p_guess_type,v_guess,v_correct,v_points);
    if v_correct and (p_guess_type='full_movie' or public.normalize_movie(v_mask)=public.normalize_movie(v_round.movie_title_private)) then
      update public.rounds set status='won',masked_movie=v_mask,winner_player_id=p_player_id,ended_at=now() where id=v_round.id;
      update public.rooms set status='round_over',masked_movie=v_round.movie_title_private,current_turn_player_id=null,updated_at=now() where id=v_room.id;
    elsif v_life=0 then update public.rounds set status='lost',ended_at=now() where id=v_round.id; update public.rooms set status='round_over',current_turn_player_id=null,updated_at=now() where id=v_room.id; end if;
  end if;
  return (select r from public.rooms_public r where r.id=v_room.id);
end;
$$;

grant execute on function public.get_my_player_round_state_rpc(uuid,uuid) to anon;
grant execute on function public.get_visible_guess_history_rpc(uuid,uuid) to anon;
grant execute on function public.get_available_player_id_rpc(uuid,uuid) to anon;
grant execute on function public.return_to_lobby_rpc(uuid,uuid) to anon;
grant execute on function public.kick_player_rpc(uuid,uuid,uuid) to anon;
grant execute on function public.eliminate_player_rpc(uuid,uuid,uuid) to anon;
grant execute on function public.transfer_host_rpc(uuid,uuid,uuid) to anon;
grant execute on function public.leave_room_rpc(uuid,uuid) to anon;
grant execute on function public.begin_round_setup_rpc(uuid,uuid) to anon;
grant execute on function public.start_round_rpc(uuid,uuid,text,text,text,text,integer[],text[],jsonb) to anon;
grant execute on function public.submit_guess_rpc(text,uuid,text,text) to anon;
