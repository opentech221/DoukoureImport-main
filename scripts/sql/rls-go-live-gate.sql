-- RLS Go-Live Gate (CI fail/pass)
-- Output rule:
-- - returns 0 rows => PASS
-- - returns >=1 row => FAIL (each row is a blocker)

with critical_tables as (
  select *
  from (values
    ('system_settings'::text),
    ('system_settings_audit_logs'::text),
    ('payment_transactions'::text),
    ('order_status_events'::text)
  ) as t(table_name)
),
rls_state as (
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
),
policies as (
  select
    p.tablename,
    p.policyname,
    p.roles,
    p.cmd,
    p.qual,
    p.with_check
  from pg_policies p
  where p.schemaname = 'public'
),
violations as (
  -- 1) RLS must be enabled on critical tables
  select
    ct.table_name,
    'RLS_DISABLED'::text as issue,
    'RLS must be enabled for critical table'::text as detail
  from critical_tables ct
  left join rls_state rs on rs.table_name = ct.table_name
  where coalesce(rs.rls_enabled, false) = false

  union all

  -- 2) At least one policy must exist per critical table
  select
    ct.table_name,
    'MISSING_POLICY'::text as issue,
    'No active policy found on critical table'::text as detail
  from critical_tables ct
  left join policies p on p.tablename = ct.table_name
  group by ct.table_name
  having count(p.policyname) = 0

  union all

  -- 3) system_settings must have a public SELECT policy
  select
    'system_settings'::text as table_name,
    'MISSING_PUBLIC_SELECT_POLICY'::text as issue,
    'Expected SELECT policy for anon/authenticated on system_settings'::text as detail
  where not exists (
    select 1
    from policies p
    where p.tablename = 'system_settings'
      and p.cmd = 'SELECT'
      and (
        'anon' = any(p.roles)
        or 'authenticated' = any(p.roles)
        or '{anon,authenticated}'::text[] && p.roles
      )
  )

  union all

  -- 4) system_settings must have restricted write policy
  select
    'system_settings'::text as table_name,
    'MISSING_RESTRICTED_WRITE_POLICY'::text as issue,
    'Expected INSERT/UPDATE/ALL policy with auth guard for admin/service role'::text as detail
  where not exists (
    select 1
    from policies p
    where p.tablename = 'system_settings'
      and p.cmd in ('INSERT', 'UPDATE', 'ALL')
      and coalesce(p.with_check, '') <> ''
  )

  union all

  -- 5) audit logs should not be publicly writable
  select
    'system_settings_audit_logs'::text as table_name,
    'PUBLIC_WRITE_EXPOSURE'::text as issue,
    'Audit log table should not grant INSERT to anon'::text as detail
  where exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'system_settings_audit_logs'
      and g.grantee = 'anon'
      and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  )
)
select table_name, issue, detail
from violations
order by table_name, issue;
