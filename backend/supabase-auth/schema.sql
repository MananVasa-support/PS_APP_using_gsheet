-- ============================================================================
-- Productivity Shastra — AUTH on Supabase (gsheets-backend branch)
-- ============================================================================
-- ONLY the `_System` users data lives here. Every tool's data (Time Auditor,
-- Time Finder, Meeting, Power Planner, Reasons Eliminator) STAYS in Google
-- Sheets — this file does not touch any of that.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. Safe to re-run (create-or-replace / if-not-exists throughout).
--
-- SECURITY MODEL: the table has RLS enabled with NO policies, so the public
-- anon/authenticated roles can NEVER read it directly (password_hash + salt
-- stay private). All access goes through the SECURITY DEFINER functions below,
-- which run as the table owner and return only safe columns. Login/signup hash
-- server-side with pgcrypto, so the plaintext password is only ever seen
-- in-transit over TLS and the hash never leaves the database.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Table: mirrors the old _System `users` sheet columns 1:1 ────────────────
create table if not exists public.app_users (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  email         text not null,
  phone         text,
  country       text,
  role          text not null default 'client' check (role in ('admin','consultant','client')),
  status        text not null default 'Active',
  title         text,
  department    text,
  timezone      text,
  avatar        text,
  preferences   jsonb not null default '{}',
  password_hash text not null,
  salt          text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One account per email (case-insensitive) and per phone (when present).
create unique index if not exists app_users_email_unique on public.app_users (lower(email));
create unique index if not exists app_users_phone_unique on public.app_users (phone)
  where phone is not null and phone <> '';

-- ── RLS: lock the table; the functions below are the ONLY way in ────────────
alter table public.app_users enable row level security;
revoke all on public.app_users from anon, authenticated;
-- (No policies created on purpose → zero direct access for the public roles.)

-- ── Helper: public projection (never exposes password_hash / salt) ──────────
create or replace function public._app_public(u public.app_users)
returns json language sql stable as $$
  select json_build_object(
    'id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone,
    'country', u.country, 'role', u.role, 'status', u.status, 'title', u.title,
    'department', u.department, 'timezone', u.timezone, 'avatar', u.avatar,
    'preferences', u.preferences, 'created_at', u.created_at, 'updated_at', u.updated_at
  );
$$;

-- SHA-256(salt || password) hex — IDENTICAL to the frontend's Web Crypto hash,
-- so users migrated from the sheet (with their existing hash+salt) verify.
-- Uses Postgres's BUILT-IN sha256(bytea) (pg_catalog, always in scope) — NOT
-- pgcrypto's digest(), which Supabase installs in the `extensions` schema and
-- would fail to resolve as `digest(text, unknown) does not exist`.
create or replace function public._app_hash(p_salt text, p_password text)
returns text language sql immutable as $$
  select encode(sha256(convert_to(p_salt || p_password, 'UTF8')), 'hex');
$$;

-- ── CREATE (signup) ─────────────────────────────────────────────────────────
create or replace function public.app_signup(
  p_name text, p_email text, p_phone text, p_country text, p_password text
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_salt text := gen_random_uuid()::text;
  v_row  public.app_users;
begin
  if coalesce(p_email,'') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address.';
  end if;
  if length(coalesce(p_password,'')) < 8 then
    raise exception 'Password must be at least 8 characters.';
  end if;
  if exists (select 1 from app_users where lower(email) = lower(p_email)) then
    raise exception 'An account already exists with this email.';
  end if;
  if coalesce(p_phone,'') <> '' and exists (select 1 from app_users where phone = p_phone) then
    raise exception 'An account already exists with this phone number.';
  end if;

  insert into app_users (name, email, phone, country, password_hash, salt)
  values (
    nullif(p_name,''), p_email, nullif(p_phone,''), nullif(p_country,''),
    _app_hash(v_salt, p_password), v_salt
  )
  returning * into v_row;

  return _app_public(v_row);
end $$;

-- ── READ (login) ────────────────────────────────────────────────────────────
create or replace function public.app_login(p_email text, p_password text)
returns json language plpgsql security definer set search_path = public as $$
declare v_row public.app_users;
begin
  select * into v_row from app_users where lower(email) = lower(p_email);
  if v_row.id is null or v_row.password_hash <> _app_hash(v_row.salt, p_password) then
    raise exception 'Invalid email or password.';
  end if;
  return _app_public(v_row);
end $$;

-- ── READ (single profile, e.g. session revalidation) ────────────────────────
create or replace function public.app_get_user(p_id uuid)
returns json language sql security definer set search_path = public as $$
  select _app_public(u) from app_users u where u.id = p_id;
$$;

-- ── READ (all profiles — admin/consultant lists + leaderboard) ──────────────
create or replace function public.app_list_users()
returns setof json language sql security definer set search_path = public as $$
  select _app_public(u) from app_users u order by u.created_at desc;
$$;

-- ── READ (signup duplicate check — booleans only) ───────────────────────────
create or replace function public.app_availability(p_email text, p_phone text)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'email_taken', exists (select 1 from app_users where coalesce(p_email,'') <> '' and lower(email) = lower(p_email)),
    'phone_taken', exists (select 1 from app_users where coalesce(p_phone,'') <> '' and phone = p_phone)
  );
$$;

-- ── UPDATE (own profile — whitelisted fields only) ──────────────────────────
create or replace function public.app_update_profile(p_id uuid, p_patch jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare v_row public.app_users;
begin
  -- A phone change must stay unique.
  if p_patch ? 'phone' and coalesce(p_patch->>'phone','') <> '' and exists (
    select 1 from app_users where phone = p_patch->>'phone' and id <> p_id
  ) then
    raise exception 'An account already exists with this phone number.';
  end if;

  update app_users set
    name        = coalesce(p_patch->>'name', name),
    title       = coalesce(p_patch->>'title', title),
    department  = coalesce(p_patch->>'department', department),
    phone       = coalesce(p_patch->>'phone', phone),
    country     = coalesce(p_patch->>'country', country),
    timezone    = coalesce(p_patch->>'timezone', timezone),
    avatar      = coalesce(p_patch->>'avatar', avatar),
    preferences = coalesce(p_patch->'preferences', preferences),
    updated_at  = now()
  where id = p_id
  returning * into v_row;

  if v_row.id is null then raise exception 'Account not found.'; end if;
  return _app_public(v_row);
end $$;

-- ── DELETE ──────────────────────────────────────────────────────────────────
create or replace function public.app_delete_user(p_id uuid)
returns json language sql security definer set search_path = public as $$
  delete from app_users where id = p_id;
  select json_build_object('deleted', true);
$$;

-- ── Grants: the public roles may only call the functions, never the table ───
grant execute on function
  public.app_signup(text,text,text,text,text),
  public.app_login(text,text),
  public.app_get_user(uuid),
  public.app_list_users(),
  public.app_availability(text,text),
  public.app_update_profile(uuid,jsonb),
  public.app_delete_user(uuid)
to anon, authenticated;

-- ============================================================================
-- DONE. Next: run the Apps Script migration (sync-users.gs) to copy existing
-- `_System` users into app_users, then set VITE_SUPABASE_URL +
-- VITE_SUPABASE_ANON_KEY in frontend/.env.  See README.md.
-- To make someone admin:  update public.app_users set role='admin' where email='you@x.com';
-- ============================================================================
