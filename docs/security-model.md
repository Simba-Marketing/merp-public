# Security model

MERP holds client data, leads with personal details, call recordings and a full bookkeeping. It runs on Supabase, which means the browser talks to PostgreSQL directly with a publishable key. That design is only safe if the database itself enforces every rule. This document describes how.

## Four principles

1. **The database is the only boundary.** A `.eq(...)` in the frontend, an `if` in JavaScript, a permission check in the UI or an email allow-list decide what a user *sees*, never what they *can query*. Assume every query is run without the frontend, with the publishable key.
2. **"Authenticated" is not authorisation.** Every logged-in client is also `authenticated`. If a rule means *employees*, it says so explicitly.
3. **Roles come from `app_metadata`, never from `user_metadata`.** Users can overwrite their own `user_metadata` with a single client call. A role read from there is a role the user chose.
4. **Build as if the client portal goes live tomorrow.** A table that only staff touch today becomes a leak the day a client account appears.

## Two layers of Row Level Security

Postgres combines policies in two ways: **permissive** policies are OR'ed, **restrictive** policies are AND'ed on top. Every sensitive table gets both.

- The **permissive** layer says who may do what: employees, or a client for her own rows.
- The **restrictive** layer is the floor nobody goes below: same agency, and within the agency only the clients a staff member is assigned to.

A too-generous permissive policy is only a leak if no restrictive layer covers it. Writing both means security never hangs on a single line.

Role checks live in small `SECURITY DEFINER` helpers in a schema that the API does not expose, so they can be used inside policies but cannot be called as an RPC. See [sql/rls-patterns.sql](../sql/rls-patterns.sql) for a runnable example.

### Tenancy from day one

New tables carry an `agency_id` with a default taken from the user's token, plus composite foreign keys that make it impossible to attach a row of agency A to a parent of agency B — even for the service role. Supporting a second agency then becomes a backfill instead of a rewrite.

## Edge functions

- **The gate is the first thing after the CORS preflight**: read the bearer token, ask Auth who it belongs to, check the role in `app_metadata`. Anonymous, publishable-key and forged tokens all get 401.
- `verify_jwt = true` alone is not enough: it also accepts the publishable key.
- The rule for functions that return client data to a *person*: query **with that person's token**, so RLS still applies. Only machines that work across all clients (syncs, mailers) use the service role, and they return nothing to a human.
- Open endpoints (public forms, webhooks) never take the tenant from the request. A form key maps to exactly one client server-side; a webhook is gated by its signature, verified in constant time over the raw body.
- A gate runs before any configuration check. Telling an anonymous caller "not configured yet" leaks the state of the environment.

## Secrets

- Third-party credentials live in **Vault**, read by service-role-only functions. They never pass through the browser.
- Scheduled jobs fetch their shared secret from Vault at run time. A secret written into a cron command is readable in the job table and kept in its run history for years.
- Files go in **private buckets**. The database stores the *path*; a signed URL is created when a file is shown. A stored signed URL is a dead link once it expires.
- A token in a URL is only acceptable when the recipient cannot have an account (a client signing a quote). Otherwise it leaks through history, forwarded mail and the `Referer` header — and logging in is both safer and simpler.

## Patterns that are not allowed

Common Supabase mistakes, each of which looks reasonable at first sight. MERP is built to avoid all of them.

| Pattern | Why it fails | Instead |
|---|---|---|
| `using (true)` | Every logged-in user, clients included | An explicit role check |
| `using (token is not null)` | Checks that *a* token exists, not that it is *yours* | Compare the value inside an RPC that takes the token as an argument |
| A secret as a query filter | The filter lives in the client and can be dropped | Pass it as an RPC argument, compare in the database |
| `auth.uid() = user_id` on team data | The second employee sees nothing | An employee check; keep `user_id` as a record of who created it |
| Write access on a `SECURITY DEFINER` view | Such views are auto-updatable and write with the owner's rights, straight past the view's `where` | Revoke insert/update/delete on every definer view, including for the service role |
| `current_user` as a gate inside a definer function | Inside such a function `current_user` is the *owner*, so the check never fires | Read the role from the JWT claims |
| Request input in a filter or path | Injection | Validate (uuid pattern) or encode |
| Public bucket for private files | The file is guessable by URL | Private bucket plus signed URL |

## Verify by attacking

Reading a policy proves very little: some of the patterns above look correct in a code review and pass automated linters. Every change is tested by impersonating the attacker:

- `set local role anon`, count the rows.
- A simulated client JWT with a forged `admin` in `user_metadata` must see zero rows everywhere.
- A staff member assigned to one client must see that client and nothing else.
- A dry run proves the read path, not the write path — functions are run once inside a transaction that is rolled back.

On top of that, an automated audit runs on a schedule and reports to a human.
