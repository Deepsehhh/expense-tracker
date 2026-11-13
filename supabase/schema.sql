-- Run in the Supabase SQL editor.
create table if not exists expenses (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('normal','debit')),
  title text not null,
  amount numeric not null,
  category text not null,
  date date not null,
  updated_at bigint not null
);
create table if not exists credit_cards (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  cycle_start date,
  cycle_end date,
  due_date date,
  updated_at bigint not null
);
create table if not exists credit_expenses (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null references credit_cards(id) on delete cascade,
  topic text not null,
  amount numeric not null,
  date date not null,
  updated_at bigint not null
);

alter table expenses enable row level security;
alter table credit_cards enable row level security;
alter table credit_expenses enable row level security;

create policy "own rows" on expenses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on credit_cards for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on credit_expenses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- In-app account deletion (required by Google Play for apps that create accounts).
-- Removes the signed-in user; all their rows go too via "on delete cascade".
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
