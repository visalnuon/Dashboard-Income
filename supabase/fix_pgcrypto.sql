-- Run this once in the Supabase SQL Editor.
-- Fixes: function gen_salt(unknown) does not exist
-- Cause: pgcrypto lives in the extensions schema, but the user functions
-- only searched public.

create schema if not exists extensions;

do $$
begin
  create extension if not exists pgcrypto with schema extensions;
exception
  when duplicate_object then
    null;
  when others then
    null;
end
$$;

alter function public.login_app_user(text, text)
  set search_path = public, extensions;
alter function public.register_app_user(text, text, text, text, uuid)
  set search_path = public, extensions;
alter function public.update_app_user_password(uuid, text)
  set search_path = public, extensions;

create or replace function public.login_app_user(p_username text, p_password text)
returns json
language plpgsql
security definer
set search_path = public, extensions
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

  if account.id is null or account.password_hash <> extensions.crypt(p_password, account.password_hash) then
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
set search_path = public, extensions
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
  values (uname, trim(p_full_name), extensions.crypt(p_password, extensions.gen_salt('bf'::text)), next_role)
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

create or replace function public.update_app_user_password(p_token uuid, p_password text)
returns json
language plpgsql
security definer
set search_path = public, extensions
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
    set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'::text))
    where id = sess.user_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.login_app_user(text, text) to anon, authenticated;
grant execute on function public.register_app_user(text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.update_app_user_password(uuid, text) to anon, authenticated;
