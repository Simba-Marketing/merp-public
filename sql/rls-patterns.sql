-- Access-control patterns used throughout MERP, as a small runnable example.
-- Run on a fresh Supabase project (or any Postgres with an `auth` schema that
-- provides auth.jwt()). Table and column names are illustrative.

-- 1. Helpers live in a schema the API does not expose. Policies can call them;
--    clients cannot call them as an RPC.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- The role comes from app_metadata, which only the server can write.
create or replace function private.is_employee()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('employee', 'admin');
$$;

create or replace function private.current_agency_id()
returns text
language sql stable security definer set search_path = ''
as $$
  select case when private.is_employee()
              then coalesce(auth.jwt() -> 'app_metadata' ->> 'agency_id', 'default')
         end;
$$;

-- Which clients a staff member may see: everything, or only assigned clients.
create table if not exists public.staff_scope (
  user_id   uuid primary key,
  scope     text not null check (scope in ('all', 'assigned'))
);
create table if not exists public.client_staff (
  client_id text not null,
  user_id   uuid not null,
  role      text,
  primary key (client_id, user_id)
);
alter table public.staff_scope  enable row level security;
alter table public.client_staff enable row level security;

-- The scope is read in ONE definer helper. Read inline inside a policy, the
-- subquery would run as the caller, RLS would hide the caller's own scope row,
-- and everyone would silently fall back to 'all'.
create or replace function private.staff_scope()
returns text
language sql stable security definer set search_path = ''
as $$
  -- No row means 'all': a deliberate default, so a new colleague is not locked
  -- out on day one. Restricting someone is an explicit row.
  select coalesce((select scope from public.staff_scope where user_id = auth.uid()), 'all');
$$;

create or replace function private.may_see_client(p_client_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_employee() and (
         private.staff_scope() = 'all'
      or exists (select 1 from public.client_staff
                 where client_id = p_client_id and user_id = auth.uid()));
$$;

revoke execute on function private.is_employee(), private.current_agency_id(),
                           private.staff_scope(), private.may_see_client(text) from public, anon;
-- Policies run with the caller's rights, so the caller needs EXECUTE. That is
-- why the schema, not the grant, is what keeps these out of the API.
grant execute on function private.is_employee(), private.current_agency_id(),
                          private.staff_scope(), private.may_see_client(text) to authenticated, service_role;

-- 2. A tenant-aware table.
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  agency_id  text not null default private.current_agency_id(),
  client_id  text,
  title      text not null,
  body       text not null,
  share_token uuid unique,  -- null = not shared; set it deliberately (see 4.)
  created_by uuid default auth.uid(),   -- a record of who wrote it, not a gate
  created_at timestamptz not null default now()
);
alter table public.notes enable row level security;

-- 3a. Permissive layer: who may do what.
create policy notes_employees on public.notes
  for all to authenticated
  using (private.is_employee())
  with check (private.is_employee());

-- 3b. Restrictive layer: the floor. AND'ed onto every permissive policy.
--     A NULL client_id is only visible to staff with scope 'all'.
create policy notes_boundary on public.notes
  as restrictive for all to authenticated
  using (
    agency_id = private.current_agency_id()
    and (case when client_id is null
              then private.staff_scope() = 'all'
              else private.may_see_client(client_id) end)
  )
  -- The same expression on writes: otherwise a staff member could insert a
  -- note for a client they cannot see, or move a visible note to one.
  with check (
    agency_id = private.current_agency_id()
    and (case when client_id is null
              then private.staff_scope() = 'all'
              else private.may_see_client(client_id) end)
  );

-- 4. A secret-bearing lookup for a public page: the token is an argument and
--    is compared inside the database, never used as a client-side filter.
create or replace function public.get_document_by_token(p_token uuid)
returns table (title text, body text)
language sql stable security definer set search_path = ''
as $$
  select n.title, n.body from public.notes n
  where p_token is not null and n.share_token = p_token;  -- revoke by setting it to null
$$;
revoke execute on function public.get_document_by_token(uuid) from public;
grant  execute on function public.get_document_by_token(uuid) to anon, authenticated;

-- 5. Verify by attacking. Run as an anonymous user and as a client with a
--    forged role in user_metadata; both must see zero rows.
--
--   begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001",
--     "app_metadata":{"role":"client"},"user_metadata":{"role":"admin"}}';
--   select count(*) from public.notes;   -- expected: 0
--   rollback;
--
-- Result of this file with one note for client c1 and one without a client:
--   employee, scope 'all'                       -> 2
--   client with a forged admin in user_metadata -> 0
--   employee, scope 'assigned', no clients      -> 0 (the client-less note too)
--   employee, scope 'assigned', assigned to c1  -> 1
--   employee of another agency                  -> 0
--
-- Writing this example surfaced two mistakes that a code read did not:
-- the scope lookup ran as the caller inside the policy (so RLS hid it and
-- everyone fell back to 'all'), and the helpers had no EXECUTE for
-- 'authenticated' (so every policy failed). Both are fixed above.
