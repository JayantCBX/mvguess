alter table public.rounds
  add column if not exists movie_giver_player_id uuid references public.players(id);

create or replace view public.rounds_public as
select
  id,
  room_id,
  round_number,
  category,
  difficulty,
  movie_display,
  initial_masked_movie,
  masked_movie,
  status,
  hint_mode,
  hint_positions,
  hint_settings,
  winner_player_id,
  created_at,
  ended_at,
  movie_giver_player_id
from public.rounds;

grant select on public.rounds_public to anon;

create or replace function public.next_turn_player_excluding(
  room_uuid uuid,
  current_player uuid,
  excluded_player uuid default null
)
returns uuid
language sql
stable
as $$
  with ordered as (
    select id, row_number() over (order by joined_at asc) as rn
    from public.players
    where room_id = room_uuid
      and is_online = true
      and (excluded_player is null or id <> excluded_player)
  ),
  current_row as (
    select rn from ordered where id = current_player
  )
  select coalesce(
    (select id from ordered where rn > coalesce((select rn from current_row), 0) order by rn asc limit 1),
    (select id from ordered order by rn asc limit 1)
  );
$$;

create or replace function public.next_movie_giver(room_uuid uuid)
returns uuid
language plpgsql
stable
as $$
declare
  v_room public.rooms%rowtype;
  v_previous_giver uuid;
  v_next_giver uuid;
begin
  select * into v_room from public.rooms where id = room_uuid;
  if not found then
    return null;
  end if;

  select movie_giver_player_id into v_previous_giver
  from public.rounds
  where room_id = room_uuid
  order by round_number desc, created_at desc
  limit 1;

  if v_previous_giver is null then
    select id into v_next_giver
    from public.players
    where room_id = room_uuid
      and is_online = true
      and id = v_room.host_player_id
    limit 1;

    if v_next_giver is not null then
      return v_next_giver;
    end if;

    select id into v_next_giver
    from public.players
    where room_id = room_uuid and is_online = true
    order by joined_at asc
    limit 1;

    return v_next_giver;
  end if;

  return public.next_turn_player(room_uuid, v_previous_giver);
end;
$$;

create or replace function public.begin_round_setup_rpc(
  p_room_id uuid,
  p_player_id uuid
)
returns public.rooms_public
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms%rowtype;
  v_movie_giver uuid;
  v_movie_giver_name text;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'Room not found';
  end if;
  if v_room.status not in ('lobby', 'round_over') then
    raise exception 'Round setup is not available';
  end if;
  if (select count(*) from public.players where room_id = p_room_id) < 2 then
    raise exception 'Minimum 2 players required';
  end if;

  v_movie_giver := public.next_movie_giver(p_room_id);
  if v_movie_giver is null then
    raise exception 'No online movie giver available';
  end if;
  if v_movie_giver <> p_player_id then
    select name into v_movie_giver_name from public.players where id = v_movie_giver;
    raise exception 'Only % can set the next movie', coalesce(v_movie_giver_name, 'the next movie giver');
  end if;

  update public.rooms
  set
    status = 'setup',
    current_turn_player_id = v_movie_giver,
    masked_movie = null,
    guessed_letters = '{}',
    wrong_letters = '{}',
    updated_at = now()
  where id = p_room_id;

  return (select r from public.rooms_public r where r.id = p_room_id);
end;
$$;

create or replace function public.cancel_round_setup_rpc(
  p_room_id uuid,
  p_player_id uuid
)
returns public.rooms_public
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms%rowtype;
  v_next_status text;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'Room not found';
  end if;
  if v_room.status <> 'setup' then
    raise exception 'Room is not in setup';
  end if;
  if v_room.current_turn_player_id <> p_player_id and v_room.host_player_id <> p_player_id then
    raise exception 'Only the movie giver or host can cancel setup';
  end if;

  v_next_status := case
    when exists (select 1 from public.rounds where room_id = p_room_id) then 'round_over'
    else 'lobby'
  end;

  update public.rooms
  set
    status = v_next_status,
    current_turn_player_id = null,
    updated_at = now()
  where id = p_room_id;

  return (select r from public.rooms_public r where r.id = p_room_id);
end;
$$;

create or replace function public.start_round_rpc(
  p_room_id uuid,
  p_player_id uuid,
  p_movie_title text,
  p_movie_display text,
  p_masked_movie text,
  p_hint_mode text,
  p_hint_positions integer[],
  p_hint_letters text[],
  p_hint_settings jsonb
)
returns public.rooms_public
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms%rowtype;
  v_round_number integer;
  v_movie_giver uuid;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'Room not found';
  end if;
  if v_room.status not in ('setup', 'lobby', 'round_over') then
    raise exception 'Round setup is not available';
  end if;
  if (select count(*) from public.players where room_id = p_room_id) < 2 then
    raise exception 'Minimum 2 players required';
  end if;
  if trim(coalesce(p_movie_title, '')) !~* '[a-z]' or char_length(trim(coalesce(p_movie_title, ''))) < 2 then
    raise exception 'Movie title is required';
  end if;

  v_movie_giver := case
    when v_room.status = 'setup' then v_room.current_turn_player_id
    else public.next_movie_giver(p_room_id)
  end;

  if v_movie_giver is null then
    raise exception 'No movie giver available';
  end if;
  if v_movie_giver <> p_player_id then
    raise exception 'Only the assigned movie giver can start this round';
  end if;

  select coalesce(max(round_number), 0) + 1 into v_round_number
  from public.rounds
  where room_id = p_room_id;

  insert into public.rounds (
    room_id,
    round_number,
    category,
    difficulty,
    movie_giver_player_id,
    movie_title_private,
    movie_display,
    initial_masked_movie,
    masked_movie,
    status,
    hint_mode,
    hint_positions,
    hint_settings
  )
  values (
    p_room_id,
    v_round_number,
    v_room.category,
    v_room.difficulty,
    v_movie_giver,
    trim(p_movie_title),
    trim(coalesce(p_movie_display, p_movie_title)),
    p_masked_movie,
    p_masked_movie,
    'playing',
    p_hint_mode,
    coalesce(p_hint_positions, '{}'),
    p_hint_settings
  );

  update public.rooms
  set
    status = 'playing',
    life_remaining = char_length(life_word),
    current_turn_player_id = public.next_turn_player_excluding(p_room_id, null, v_movie_giver),
    masked_movie = p_masked_movie,
    guessed_letters = '{}',
    wrong_letters = '{}',
    hint_mode = p_hint_mode,
    hint_positions = coalesce(p_hint_positions, '{}'),
    hint_letters = coalesce(p_hint_letters, '{}'),
    hint_settings = p_hint_settings,
    updated_at = now()
  where id = p_room_id;

  return (select r from public.rooms_public r where r.id = p_room_id);
end;
$$;

create or replace function public.submit_guess_rpc(
  p_room_code text,
  p_player_id uuid,
  p_guess_type text,
  p_guess_value text default null
)
returns public.rooms_public
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms%rowtype;
  v_round public.rounds%rowtype;
  v_guess text := upper(trim(coalesce(p_guess_value, '')));
  v_correct boolean := false;
  v_points integer := 0;
  v_mask text;
  v_life integer;
  v_next_player uuid;
begin
  select * into v_room from public.rooms where code = upper(p_room_code) for update;
  if not found then raise exception 'Room not found'; end if;
  if v_room.status <> 'playing' then raise exception 'Round is not active'; end if;
  if v_room.current_turn_player_id <> p_player_id then raise exception 'It is not your turn'; end if;

  select * into v_round
  from public.rounds
  where room_id = v_room.id and status = 'playing'
  order by created_at desc
  limit 1
  for update;
  if not found then raise exception 'Round not found'; end if;
  if v_round.movie_giver_player_id = p_player_id then raise exception 'Movie giver cannot guess their own movie'; end if;

  v_mask := v_room.masked_movie;
  v_life := v_room.life_remaining;
  v_next_player := public.next_turn_player_excluding(v_room.id, p_player_id, v_round.movie_giver_player_id);

  if p_guess_type = 'letter' then
    if v_guess !~ '^[A-Z]$' then raise exception 'Invalid alphabet'; end if;
    if v_guess = any(v_room.guessed_letters) then raise exception 'Guess already used'; end if;

    v_correct := position(v_guess in upper(v_round.movie_title_private)) > 0;
    if v_correct then
      v_points := 10;
      v_mask := public.reveal_letter(v_round.movie_title_private, v_room.masked_movie, v_guess);
    else
      v_life := greatest(0, v_room.life_remaining - 1);
    end if;

    update public.rooms
    set
      guessed_letters = array_append(guessed_letters, v_guess),
      wrong_letters = case when v_correct then wrong_letters else array_append(wrong_letters, v_guess) end,
      masked_movie = v_mask,
      life_remaining = v_life,
      current_turn_player_id = v_next_player,
      updated_at = now()
    where id = v_room.id;
  elsif p_guess_type = 'full_movie' then
    v_correct := public.normalize_movie(v_guess) = public.normalize_movie(v_round.movie_title_private);
    if v_correct then
      v_points := 50;
      v_mask := v_round.movie_display;
    else
      v_life := greatest(0, v_room.life_remaining - 2);
    end if;

    update public.rooms
    set
      masked_movie = v_mask,
      life_remaining = v_life,
      current_turn_player_id = v_next_player,
      updated_at = now()
    where id = v_room.id;
  elsif p_guess_type = 'skip' then
    update public.rooms
    set current_turn_player_id = v_next_player, updated_at = now()
    where id = v_room.id;
  else
    raise exception 'Invalid guess type';
  end if;

  if v_points <> 0 then
    update public.players set score = score + v_points where id = p_player_id;
  end if;

  insert into public.guesses(room_id, round_id, player_id, guess_type, guess_value, is_correct, points_delta)
  values (v_room.id, v_round.id, p_player_id, p_guess_type, v_guess, v_correct, v_points);

  if v_correct and (p_guess_type = 'full_movie' or public.normalize_movie(v_mask) = public.normalize_movie(v_round.movie_title_private)) then
    update public.rounds
    set status = 'won', masked_movie = v_mask, winner_player_id = p_player_id, ended_at = now()
    where id = v_round.id;
    update public.rooms
    set status = 'round_over', masked_movie = v_round.movie_display, updated_at = now()
    where id = v_room.id;
  elsif v_life = 0 then
    update public.rounds
    set status = 'lost', ended_at = now()
    where id = v_round.id;
    update public.rooms
    set status = 'round_over', updated_at = now()
    where id = v_room.id;
  end if;

  return (select r from public.rooms_public r where r.id = v_room.id);
end;
$$;

grant execute on function public.begin_round_setup_rpc(uuid, uuid) to anon;
grant execute on function public.cancel_round_setup_rpc(uuid, uuid) to anon;
grant execute on function public.start_round_rpc(uuid, uuid, text, text, text, text, integer[], text[], jsonb) to anon;
grant execute on function public.submit_guess_rpc(text, uuid, text, text) to anon;
