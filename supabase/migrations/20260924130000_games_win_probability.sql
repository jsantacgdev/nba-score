create or replace function games_win_probability(target_ids text[])
returns table (game_id text, prob_home numeric)
language sql
stable
as $$
  select u.id, p.prob_home
  from unnest(target_ids) u(id)
  cross join lateral game_win_probability(u.id) p;
$$;

grant execute on function games_win_probability(text[]) to anon;
grant execute on function games_win_probability(text[]) to authenticated;
