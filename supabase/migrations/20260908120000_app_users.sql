-- Shared app users so admin can see accounts created from any device.
-- Run this in the Supabase SQL editor after the init migration.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  full_name text not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.app_sessions (
  token uuid primary key default gen_random_uuid(),
  username text not null,
  role text not null check (role in ('admin', 'user')),
  user_id uuid references public.app_users (id) on delete cascade,
  expires_at timestamptz not null default timezone('utc', now()) + interval '30 days'
);

create index if not exists idx_app_users_username on public.app_users (username);
create index if not exists idx_app_sessions_expires on public.app_sessions (expires_at);

drop trigger if exists app_users_set_updated_at on public.app_users;
create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;

revoke all on public.app_users from anon, authenticated, public;
revoke all on public.app_sessions from anon, authenticated, public;

create or replace function public.normalize_app_username(value text)
returns text
language sql
immutable
as $$
  select lower(trim(value));
$$;

create or replace function public.is_demo_admin(p_username text, p_password text)
returns boolean
language sql
immutable
as $$
  select public.normalize_app_username(p_username) = 'admin'
    and (
      trim(p_password) = 'admin 123'
      or replace(trim(p_password), ' ', '') = 'admin123'
    );
$$;

create or replace function public.read_app_session(p_token uuid)
returns table (username text, role text, user_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
    select s.username, s.role, s.user_id
    from public.app_sessions s
    where s.token = p_token
      and s.expires_at > timezone('utc', now())
    limit 1;
end;
$$;

create or replace function public.issue_app_session(p_username text, p_role text, p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  issued uuid;
begin
  insert into public.app_sessions (username, role, user_id)
  values (public.normalize_app_username(p_username), p_role, p_user_id)
  returning token into issued;
  return issued;
end;
$$;

create or replace function public.require_admin_session(p_token uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  session_role text;
begin
  select s.role into session_role
  from public.app_sessions s
  where s.token = p_token
    and s.expires_at > timezone('utc', now())
  limit 1;

  if session_role is distinct from 'admin' then
    raise exception 'Only an admin can manage users.';
  end if;
end;
$$;

create or replace function public.login_app_user(p_username text, p_password text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  account public.app_users%rowtype;
  issued uuid;
  uname text := public.normalize_app_username(p_username);
begin
  if public.is_demo_admin(p_username, p_password) then
    issued := public.issue_app_session('admin', 'admin', null);
    return json_build_object(
      'id', 'demo-admin',
      'username', 'admin',
      'fullName', 'visal_finance',
      'role', 'admin',
      'createdAt', timezone('utc', now()),
      'token', issued
    );
  end if;

  select * into account
  from public.app_users
  where username = uname
  limit 1;

  if account.id is null or account.password_hash <> crypt(p_password, account.password_hash) then
    raise exception 'Incorrect username or password.';
  end if;

  issued := public.issue_app_session(account.username, account.role, account.id);
  return json_build_object(
    'id', account.id,
    'username', account.username,
    'fullName', account.full_name,
    'role', account.role,
    'createdAt', account.created_at,
    'token', issued
  );
end;
$$;

create or replace function public.register_app_user(
  p_full_name text,
  p_username text,
  p_password text,
  p_role text default 'user',
  p_admin_token uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  account public.app_users%rowtype;
  next_role text := coalesce(nullif(trim(p_role), ''), 'user');
  uname text := public.normalize_app_username(p_username);
  issued uuid;
begin
  if length(coalesce(trim(p_full_name), '')) = 0 then
    raise exception 'Full name is required.';
  end if;
  if length(uname) < 3 then
    raise exception 'Username must be at least 3 characters.';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;
  if uname = 'admin' then
    raise exception 'That username is already taken.';
  end if;
  if next_role not in ('admin', 'user') then
    next_role := 'user';
  end if;
  if next_role = 'admin' then
    perform public.require_admin_session(p_admin_token);
  end if;
  if exists (select 1 from public.app_users where username = uname) then
    raise exception 'That username is already taken.';
  end if;

  insert into public.app_users (username, full_name, password_hash, role)
  values (uname, trim(p_full_name), crypt(p_password, gen_salt('bf')), next_role)
  returning * into account;

  issued := public.issue_app_session(account.username, account.role, account.id);
  return json_build_object(
    'id', account.id,
    'username', account.username,
    'fullName', account.full_name,
    'role', account.role,
    'createdAt', account.created_at,
    'token', issued
  );
end;
$$;

create or replace function public.admin_list_app_users(p_token uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_admin_session(p_token);
  return coalesce(
    (
      select json_agg(json_build_object(
        'id', u.id,
        'username', u.username,
        'fullName', u.full_name,
        'role', u.role,
        'createdAt', u.created_at,
        'builtIn', false
      ) order by u.created_at desc)
      from public.app_users u
    ),
    '[]'::json
  );
end;
$$;

create or replace function public.admin_update_app_user_role(p_token uuid, p_user_id uuid, p_role text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  account public.app_users%rowtype;
  next_role text := trim(p_role);
begin
  perform public.require_admin_session(p_token);
  if next_role not in ('admin', 'user') then
    raise exception 'Role must be admin or user.';
  end if;

  update public.app_users
    set role = next_role
    where id = p_user_id
  returning * into account;

  if account.id is null then
    raise exception 'User not found.';
  end if;

  update public.app_sessions
    set role = account.role
    where user_id = account.id;

  return json_build_object(
    'id', account.id,
    'username', account.username,
    'fullName', account.full_name,
    'role', account.role,
    'createdAt', account.created_at,
    'builtIn', false
  );
end;
$$;

create or replace function public.admin_delete_app_user(p_token uuid, p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  session_user uuid;
begin
  perform public.require_admin_session(p_token);
  select s.user_id into session_user
  from public.app_sessions s
  where s.token = p_token
  limit 1;

  if session_user is not null and session_user = p_user_id then
    raise exception 'You cannot delete your own account.';
  end if;

  delete from public.app_finance_stores where owner_key = p_user_id::text;
  delete from public.app_users where id = p_user_id;
  if not found then
    raise exception 'User not found.';
  end if;

  return json_build_object('ok', true);
end;
$$;

create table if not exists public.app_finance_stores (
  owner_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_finance_stores enable row level security;
revoke all on public.app_finance_stores from anon, authenticated, public;

create or replace function public.app_owner_key(p_token uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sess record;
begin
  select s.username, s.role, s.user_id
    into sess
  from public.app_sessions s
  where s.token = p_token
    and s.expires_at > timezone('utc', now())
  limit 1;

  if sess.username is null then
    raise exception 'You need to be signed in.';
  end if;
  if sess.user_id is not null then
    return sess.user_id::text;
  end if;
  if sess.username = 'admin' then
    return 'demo-admin';
  end if;
  raise exception 'You need to be signed in.';
end;
$$;

create or replace function public.load_app_finance(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  key text := public.app_owner_key(p_token);
  stored jsonb;
begin
  insert into public.app_finance_stores (owner_key, payload)
  values (key, '{}'::jsonb)
  on conflict (owner_key) do nothing;

  select payload into stored
  from public.app_finance_stores
  where owner_key = key;

  return coalesce(stored, '{}'::jsonb);
end;
$$;

create or replace function public.save_app_finance(p_token uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  key text := public.app_owner_key(p_token);
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Unable to save your data.';
  end if;

  insert into public.app_finance_stores (owner_key, payload, updated_at)
  values (key, p_payload, timezone('utc', now()))
  on conflict (owner_key) do update
    set payload = excluded.payload,
        updated_at = timezone('utc', now());

  return p_payload;
end;
$$;

create or replace function public.update_app_user_name(p_token uuid, p_full_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  sess record;
  account public.app_users%rowtype;
begin
  if length(coalesce(trim(p_full_name), '')) = 0 then
    raise exception 'Full name is required.';
  end if;

  select s.username, s.role, s.user_id
    into sess
  from public.app_sessions s
  where s.token = p_token
    and s.expires_at > timezone('utc', now())
  limit 1;

  if sess.username is null then
    raise exception 'You need to be signed in.';
  end if;

  if sess.user_id is null then
    return json_build_object(
      'id', 'demo-admin',
      'username', 'admin',
      'fullName', trim(p_full_name),
      'role', 'admin'
    );
  end if;

  update public.app_users
    set full_name = trim(p_full_name)
    where id = sess.user_id
  returning * into account;

  if account.id is null then
    raise exception 'User not found.';
  end if;

  return json_build_object(
    'id', account.id,
    'username', account.username,
    'fullName', account.full_name,
    'role', account.role
  );
end;
$$;

create or replace function public.update_app_user_password(p_token uuid, p_password text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  sess record;
begin
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;

  select s.username, s.role, s.user_id
    into sess
  from public.app_sessions s
  where s.token = p_token
    and s.expires_at > timezone('utc', now())
  limit 1;

  if sess.username is null then
    raise exception 'You need to be signed in.';
  end if;

  if sess.user_id is null then
    return json_build_object('ok', true);
  end if;

  update public.app_users
    set password_hash = crypt(p_password, gen_salt('bf'))
    where id = sess.user_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.login_app_user(text, text) to anon, authenticated;
grant execute on function public.register_app_user(text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.admin_list_app_users(uuid) to anon, authenticated;
grant execute on function public.admin_update_app_user_role(uuid, uuid, text) to anon, authenticated;
grant execute on function public.admin_delete_app_user(uuid, uuid) to anon, authenticated;
grant execute on function public.load_app_finance(uuid) to anon, authenticated;
grant execute on function public.save_app_finance(uuid, jsonb) to anon, authenticated;
grant execute on function public.update_app_user_name(uuid, text) to anon, authenticated;
grant execute on function public.update_app_user_password(uuid, text) to anon, authenticated;
