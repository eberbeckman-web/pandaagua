-- PandaÁgua: estrutura inicial para Supabase/Postgres
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  daily_goal_ml integer not null default 2000 check (daily_goal_ml between 500 and 10000),
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Meu grupo',
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id,user_id)
);

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_ml integer not null check (amount_ml > 0 and amount_ml <= 5000),
  consumed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.water_logs enable row level security;

-- As políticas de grupo serão adicionadas junto ao fluxo de convite.
-- Registros individuais: cada usuário lê/cria apenas os próprios registros.
create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users read own logs" on public.water_logs for select using (auth.uid() = user_id);
create policy "users insert own logs" on public.water_logs for insert with check (auth.uid() = user_id);
create policy "users delete own logs" on public.water_logs for delete using (auth.uid() = user_id);
