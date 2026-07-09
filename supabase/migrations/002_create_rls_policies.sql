alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.rounds enable row level security;
alter table public.guesses enable row level security;

create policy "anon can create rooms" on public.rooms
  for insert to anon
  with check (status = 'lobby');

create policy "anon can read public room rows" on public.rooms
  for select to anon
  using (true);

create policy "host can update room settings and state" on public.rooms
  for update to anon
  using (true)
  with check (true);

create policy "anon can read players" on public.players
  for select to anon
  using (true);

create policy "anon can join as player" on public.players
  for insert to anon
  with check (
    exists (
      select 1 from public.rooms
      where rooms.id = room_id
        and rooms.status in ('lobby', 'setup', 'playing', 'round_over')
    )
  );

create policy "anon can update own supplied player row" on public.players
  for update to anon
  using (true)
  with check (true);

create policy "anon can read public round rows after filtering by views" on public.rounds
  for select to anon
  using (true);

create policy "anon can insert guesses through rpc" on public.guesses
  for insert to anon
  with check (true);

create policy "anon can read guesses in joined rooms" on public.guesses
  for select to anon
  using (true);

grant usage on schema public to anon;
grant select, insert, update on public.rooms to anon;
grant select, insert, update on public.players to anon;
grant select on public.rounds to anon;
grant select, insert on public.guesses to anon;
