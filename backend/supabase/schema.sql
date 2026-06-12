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

-- One account per email (case-insensitive). This is the hard guarantee — even
-- if Supabase Auth ever lets a duplicate email through, the profile insert (run
-- by the signup trigger below) fails, which rolls the whole signup back. Blank/
-- null emails are not constrained.
create unique index if not exists profiles_email_unique
  on public.profiles (lower(email)) where email is not null and email <> '';

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
-- Only a CONFIRMED account counts as "taken" — so a half-finished signup that
-- never entered the email code does NOT lock the email/phone out of being used
-- (retrying just re-sends the code). Joins auth.users for the confirmation flag.
create or replace function public.signup_availability(p_email text, p_phone text)
returns table (email_taken boolean, phone_taken boolean)
language sql security definer set search_path = public as $$
  select
    exists (
      select 1 from public.profiles pr
      join auth.users u on u.id = pr.id
      where lower(pr.email) = lower(p_email)
        and u.email_confirmed_at is not null
    ),
    exists (
      select 1 from public.profiles pr
      join auth.users u on u.id = pr.id
      where pr.phone = p_phone and p_phone is not null and p_phone <> ''
        and u.email_confirmed_at is not null
    );
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
  gcal_event_ids jsonb not null default '{}',  -- planner row id → Google Calendar event id (cross-device de-dupe)
  updated_at     timestamptz not null default now()
);
-- (added 2026-06-11 — safe when the table already exists)
alter table public.power_planner_settings
  add column if not exists gcal_event_ids jsonb not null default '{}';

-- Weekly REVIEW scoreboard — auto-computed projection of each week's plan.
-- Numbers live in real columns so admin/consultant/analytics can query
-- "completion % for all clients last week" without parsing the plan jsonb.
-- The full plan stays in power_planner_weeks (source of truth).
create table if not exists public.power_planner_reviews (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  week_start         date not null,
  completion_pct     int not null default 0,
  productivity_score int not null default 0,
  total_commitments  int not null default 0,
  planned_hours      numeric not null default 0,
  delegated_count    int not null default 0,
  insights           jsonb not null default '{}',  -- the A/C/D/E learning blocks
  updated_at         timestamptz not null default now(),
  unique (user_id, week_start)              -- one scoreboard per user-week
);

-- Reasons Eliminator ----------------------------------------------------------
-- One-time migration: the original placeholder tables used a generic
-- `payload jsonb` shape and were never written to. If that old shape is still
-- present (a `payload` column exists), drop all three so the real shapes
-- below are created fresh. Future re-runs skip this (no `payload` column).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reasons_sessions'
      and column_name = 'payload'
  ) then
    drop table if exists public.reasons_sessions cascade;
    drop table if exists public.reasons_grip_tests cascade;
    drop table if exists public.reasons_grip_history cascade;
  end if;
end $$;

-- One row per ASSESSMENT SESSION. `id` is the client-generated id (text — the
-- Power Planner review sync uses 'pp:<weekStart>'); the (user_id, id) key makes
-- every save an in-place upsert. `reasons` holds the session's reasons array
-- (text, categories, subcategories/details, powerWord, archived flag, …).
create table if not exists public.reasons_sessions (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  id         text not null,
  status     text not null default 'draft',     -- draft | assessed | completed
  source     text,                              -- null = typed in the tool; 'power-planner' = synced from a weekly review
  week_start date,                              -- set on power-planner sessions
  reasons    jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- One row per reason's LATEST grip score (0–5). `score`/`status` are real
-- columns so admin/consultant views can query and chart them directly.
create table if not exists public.reasons_grip_tests (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  reason_id   text not null,
  session_id  text,
  seq         int,
  reason_text text,
  reason_date timestamptz,
  score       int,                              -- 0..5
  status      text,                             -- 'No Grip' … 'Too Much Grip'
  updated_at  timestamptz not null default now(),
  primary key (user_id, reason_id)
);

-- One row per completed GRIP TEST RUN (append-only history; re-ending the
-- same visit updates its run, a new visit adds a new run).
create table if not exists public.reasons_grip_history (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  id         text not null,
  run_date   timestamptz not null default now(),
  month      text,                              -- 'YYYY-MM' the run covered
  archived   boolean not null default false,
  entries    jsonb not null default '[]',       -- [{reasonId, seq, text, score, status}]
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
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

-- Time Auditor Level-2 challenges — one row per challenge RUN (history kept;
-- a user can do challenges any number of times). Status moves
-- Active Challenge → Completed Challenge (or Abandoned on reset).
create table if not exists public.level2_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  days int not null check (days > 0),
  status text not null default 'Active Challenge'
    check (status in ('Active Challenge','Completed Challenge','Abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- CROSS-USER challenge leaderboard. RLS (rightly) stops one client reading
-- another's rows, so the ranking is computed HERE, server-side, and returns
-- only safe aggregates (name + scores) — never raw assessment data.
--
-- Challenge Score (0–100) per participant, fair across challenge lengths:
--   50% consistency — share of elapsed challenge days with ≥1 Time Auditor audit
--   50% quality     — avg productivity % of audits inside the challenge window
-- Participants = each user's most recent non-abandoned run. Everyone sees the
-- SAME list; only actual participants appear.
create or replace function public.challenge_leaderboard()
returns table (
  rank int, user_id uuid, name text, days int, status text,
  days_elapsed int, coverage_pct int, avg_productivity int, score int
)
language sql stable security definer set search_path = public as $$
  with latest_run as (
    select distinct on (c.user_id)
      c.user_id, c.days, c.status, c.started_at::date as start_day,
      least(
        c.days,
        greatest(1, (extract(epoch from (coalesce(c.completed_at, now()) - c.started_at)) / 86400)::int + 1)
      ) as days_elapsed
    from level2_challenges c
    where c.status in ('Active Challenge','Completed Challenge')
    order by c.user_id, c.started_at desc
  ),
  audits as (
    select t.user_id,
           ((t.entry->>'date')::timestamptz)::date as audit_day,
           coalesce((t.entry->'stats'->>'productivityPct')::numeric, 0) as pct
    from time_auditor_entries t
    where t.entry->>'date' is not null
  ),
  joined as (
    select lr.user_id, lr.days, lr.status, lr.days_elapsed,
           count(distinct a.audit_day) as audit_days,
           coalesce(avg(a.pct), 0) as avg_pct
    from latest_run lr
    left join audits a
      on a.user_id = lr.user_id
     and a.audit_day >= lr.start_day
     and a.audit_day <  lr.start_day + lr.days
    group by lr.user_id, lr.days, lr.status, lr.days_elapsed
  ),
  scored as (
    select j.*,
           round(100.0 * least(j.audit_days, j.days_elapsed) / j.days_elapsed)::int as coverage_pct,
           round(j.avg_pct)::int as avg_productivity,
           round(
             0.5 * (100.0 * least(j.audit_days, j.days_elapsed) / j.days_elapsed)
             + 0.5 * j.avg_pct
           )::int as score
    from joined j
  )
  select row_number() over (order by s.score desc, s.days_elapsed desc, p.name asc)::int as rank,
         s.user_id, coalesce(p.name, 'Anonymous') as name, s.days, s.status,
         s.days_elapsed, s.coverage_pct, s.avg_productivity, s.score
  from scored s
  join profiles p on p.id = s.user_id
  order by 1;
$$;
grant execute on function public.challenge_leaderboard() to authenticated;

-- ----------------------------------------------------------------------------
-- Google Calendar "sign in once" — server-held refresh tokens (Edge Function).
-- RLS is enabled with NO client policies on purpose: ONLY the gcal Edge
-- Function (service role) can read/write tokens. The browser never sees them.
-- ----------------------------------------------------------------------------
create table if not exists public.google_tokens (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);
alter table public.google_tokens enable row level security;

-- Short-lived state nonces for the OAuth redirect (ties the Google callback
-- back to the signed-in user). Service-role only, same as above.
create table if not exists public.gcal_oauth_states (
  state      uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.gcal_oauth_states enable row level security;

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
    'power_planner_weeks','power_planner_reviews','reasons_sessions',
    'reasons_grip_tests','reasons_grip_history','meetings',
    'time_finder_assessments','time_auditor_entries','level2_challenges',
    'personal_space_entries','totality_entries','sales_cultivator_entries'
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
    'power_planner_weeks','power_planner_settings','power_planner_reviews',
    'reasons_sessions','reasons_grip_tests','reasons_grip_history','meetings',
    'time_finder_assessments','time_auditor_entries','level2_challenges',
    'personal_space_entries','totality_entries','sales_cultivator_entries'
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
