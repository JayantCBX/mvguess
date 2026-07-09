create or replace view public.rooms_public as
select
  id,
  code,
  host_player_id,
  status,
  category,
  difficulty,
  life_word,
  life_remaining,
  current_turn_player_id,
  masked_movie,
  guessed_letters,
  wrong_letters,
  settings,
  hint_mode,
  hint_positions,
  hint_letters,
  hint_settings,
  created_at,
  updated_at
from public.rooms;

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
  ended_at
from public.rounds;

grant select on public.rooms_public to anon;
grant select on public.rounds_public to anon;

create or replace function public.normalize_movie(value text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(value, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

create or replace function public.reveal_letter(title text, current_mask text, guessed_letter text)
returns text
language plpgsql
immutable
as $$
declare
  result text := '';
  idx integer;
  ch text;
  mask_ch text;
begin
  for idx in 1..char_length(title) loop
    ch := substr(title, idx, 1);
    mask_ch := substr(current_mask, idx, 1);
    if ch ~* '^[a-z]$' and upper(ch) = upper(guessed_letter) then
      result := result || upper(ch);
    elsif ch !~* '^[a-z]$' then
      result := result || ch;
    elsif mask_ch is not null and mask_ch <> '_' then
      result := result || mask_ch;
    else
      result := result || '_';
    end if;
  end loop;
  return result;
end;
$$;

create or replace function public.next_turn_player(room_uuid uuid, current_player uuid)
returns uuid
language sql
stable
as $$
  with ordered as (
    select id, row_number() over (order by joined_at asc) as rn
    from public.players
    where room_id = room_uuid and is_online = true
  ),
  current_row as (
    select rn from ordered where id = current_player
  )
  select coalesce(
    (select id from ordered where rn > coalesce((select rn from current_row), 0) order by rn asc limit 1),
    (select id from ordered order by rn asc limit 1)
  );
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
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'Room not found';
  end if;
  if v_room.host_player_id <> p_player_id then
    raise exception 'Only host can start a round';
  end if;
  if (select count(*) from public.players where room_id = p_room_id) < 2 then
    raise exception 'Minimum 2 players required';
  end if;

  select coalesce(max(round_number), 0) + 1 into v_round_number
  from public.rounds
  where room_id = p_room_id;

  insert into public.rounds (
    room_id,
    round_number,
    category,
    difficulty,
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
    p_movie_title,
    p_movie_display,
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
    current_turn_player_id = public.next_turn_player(p_room_id, null),
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

  v_mask := v_room.masked_movie;
  v_life := v_room.life_remaining;
  v_next_player := public.next_turn_player(v_room.id, p_player_id);

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

grant execute on function public.start_round_rpc(uuid, uuid, text, text, text, text, integer[], text[], jsonb) to anon;
grant execute on function public.submit_guess_rpc(text, uuid, text, text) to anon;
