-- RLS Policy Snapshot
-- Purpose: produce a go-live evidence snapshot of active RLS state, policies, and grants.
-- Scope: public schema tables used by Doukoure Import.

-- -----------------------------------------------------------------------------
-- 1) Execution metadata
-- -----------------------------------------------------------------------------
select
  now() as snapshot_at_utc,
  current_database() as database_name,
  current_user as executed_by;

-- -----------------------------------------------------------------------------
-- 2) RLS status by table (enabled/forced)
-- -----------------------------------------------------------------------------
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by n.nspname, c.relname;

-- -----------------------------------------------------------------------------
-- 3) Active policies (pg_policies)
-- -----------------------------------------------------------------------------
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by schemaname, tablename, policyname;

-- -----------------------------------------------------------------------------
-- 4) Explicit table grants for critical tables
-- -----------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'orders',
    'system_settings',
    'system_settings_audit_logs',
    'payment_transactions',
    'order_status_events'
  )
order by table_name, grantee, privilege_type;

-- -----------------------------------------------------------------------------
-- 5) Sequence usage grants linked to critical tables
-- -----------------------------------------------------------------------------
select
  object_schema,
  object_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_usage_grants
where object_schema = 'public'
  and object_name like '%_id_seq'
order by object_name, grantee, privilege_type;

-- -----------------------------------------------------------------------------
-- 6) Focused compliance view for go-live blockers
-- -----------------------------------------------------------------------------
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = c.relname
  ) as has_any_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'system_settings',
    'system_settings_audit_logs',
    'payment_transactions',
    'order_status_events'
  )
order by c.relname;
