-- ============================================================================
-- Productivity Shastra — Supabase schema  (DRAFT / PREP — review before running)
-- ============================================================================
-- HOW TO RUN (tomorrow, once the Supabase project exists):
--   Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
-- It is safe to re-run (everything uses IF NOT EXISTS / drop-then-create).
--
-- WHAT IT BUILDS:
--   • profiles                — one row per user (identity + role + status)
--   • consultant_assignments  — which consultant advises which client
--   • one table per tool      — every row tagged with user_id
--   • Row-Level Security       — client = own data, consultant = assigned
--                                clients (read-only), admin = everything
--
-- DATA MODEL REMINDER: we do NOT make a table per user. Each tool has ONE
-- table; each user's entries are ROWS in it, identified by user_id. Filling a
-- tool 5 times = 5 rows (history kept). Editing the same item updates its row.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) IDENTITY — profiles, linked to Supabase's built-in auth.users
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  name        text,
  phone       text,
  role        text not null default 'client'  check (role in ('admin','consultant','client')),
  status      text not null default 'Active'  check (status in ('Active','Pending')),
  created_at  timestamptz not null default now()
);

-- One account per phone number (blank/null phones are not constrained).
create unique index if not exists profiles_phone_unique
  on public.profiles (phone) where phone is not null and phone <> '';

-- Auto-create a profile row whenever a new auth user signs up (copies the phone
-- the user entered on the form, passed via signup metadata).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.email),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Lets the (logged-out) signup form ask "is this email/phone already taken?"
-- without being able to read any actual profile data — returns only booleans.
create or replace function public.signup_availability(p_email text, p_phone text)
returns table (email_taken boolean, phone_taken boolean)
language sql security definer set search_path = public as $$
  select
    exists (select 1 from public.profiles where lower(email) = lower(p_email)),
    exists (select 1 from public.profiles where phone = p_phone and p_phone is not null and p_phone <> '');
$$;
grant execute on function public.signup_availability(text, text) to anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 2) CONSULTANT ↔ CLIENT assignments  (admin manages these)
-- ----------------------------------------------------------------------------
create table if not exists public.consultant_assignments (
  id            uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references public.profiles (id) on delete cascade,
  client_id     uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (consultant_id, client_id)
);


-- ----------------------------------------------------------------------------
-- 3) HELPER FUNCTIONS  (security definer → used safely inside RLS policies)
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_consultant_of(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.consultant_assignments ca
    where ca.consultant_id = auth.uid() and ca.client_id = target
  );
$$;


-- ----------------------------------------------------------------------------
-- 4) TOOL TABLES — one per tool, every row tagged with user_id.
--    jsonb 'data' blobs first (mirrors today's localStorage); can be split into
--    proper columns later, per tool, once the live shapes are confirmed.
-- ----------------------------------------------------------------------------

-- Power Planner ---------------------------------------------------------------
create table if not exists public.power_planner_weeks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  week_start  date not null,
  data        jsonb not null default '{}',
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)            -- editing same week updates this row
);

create table if not exists public.power_planner_settings (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  start_date     date,
  schedule       jsonb,
  custom_options jsonb,
  updated_at     timestamptz not null default now()
);

-- Reasons Eliminator ----------------------------------------------------------
create table if not exists public.reasons_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.reasons_grip_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.reasons_grip_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Meeting Success Maximizer ---------------------------------------------------
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  meeting jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Time Finder -----------------------------------------------------------------
create table if not exists public.time_finder_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  assessment jsonb not null default '{}',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Time Auditor (shell) --------------------------------------------------------
create table if not exists public.time_auditor_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Shell flow tools (shapes to confirm when wired) -----------------------------
create table if not exists public.personal_space_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.totality_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.sales_cultivator_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 5) INDEXES — fast "give me everything for this user" lookups
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'power_planner_weeks','reasons_sessions','reasons_grip_tests',
    'reasons_grip_history','meetings','time_finder_assessments',
    'time_auditor_entries','personal_space_entries','totality_entries',
    'sales_cultivator_entries'
  ] loop
    execute format('create index if not exists idx_%1$s_user on public.%1$I (user_id);', t);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 6) ROW-LEVEL SECURITY
--    Client  → own rows.   Consultant → assigned clients' rows (READ only).
--    Admin   → everything.  Enforced by the database itself.
-- ----------------------------------------------------------------------------

-- profiles
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin() or public.is_consultant_of(id));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid() or public.is_admin());

-- consultant_assignments
alter table public.consultant_assignments enable row level security;
drop policy if exists ca_select on public.consultant_assignments;
create policy ca_select on public.consultant_assignments for select
  using (consultant_id = auth.uid() or client_id = auth.uid() or public.is_admin());
drop policy if exists ca_admin_write on public.consultant_assignments;
create policy ca_admin_write on public.consultant_assignments for all
  using (public.is_admin()) with check (public.is_admin());

-- Every tool table gets the same trio of policies, applied in a loop.
--   SELECT  : own OR admin OR (consultant assigned to that row's user)
--   INSERT  : own OR admin            (consultants are read-only on clients)
--   UPDATE  : own OR admin
--   DELETE  : own OR admin
do $$
declare t text;
begin
  foreach t in array array[
    'power_planner_weeks','power_planner_settings','reasons_sessions',
    'reasons_grip_tests','reasons_grip_history','meetings',
    'time_finder_assessments','time_auditor_entries','personal_space_entries',
    'totality_entries','sales_cultivator_entries'
  ] loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %1$s_select on public.%1$I;', t);
    execute format($f$create policy %1$s_select on public.%1$I for select
      using (user_id = auth.uid() or public.is_admin() or public.is_consultant_of(user_id));$f$, t);

    execute format('drop policy if exists %1$s_insert on public.%1$I;', t);
    execute format($f$create policy %1$s_insert on public.%1$I for insert
      with check (user_id = auth.uid() or public.is_admin());$f$, t);

    execute format('drop policy if exists %1$s_update on public.%1$I;', t);
    execute format($f$create policy %1$s_update on public.%1$I for update
      using (user_id = auth.uid() or public.is_admin())
      with check (user_id = auth.uid() or public.is_admin());$f$, t);

    execute format('drop policy if exists %1$s_delete on public.%1$I;', t);
    execute format($f$create policy %1$s_delete on public.%1$I for delete
      using (user_id = auth.uid() or public.is_admin());$f$, t);
  end loop;
end $$;

-- ============================================================================
-- END. After running: Table Editor shows all tables (empty). Sign up a test
-- user in the app → a row appears in `profiles` automatically.
-- To make someone an admin:  update public.profiles set role='admin' where email='you@company.com';
-- ============================================================================
