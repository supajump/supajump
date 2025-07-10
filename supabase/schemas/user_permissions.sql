/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MATERIALISED user_permissions  (pre-computed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
create schema supajump;

create materialized view
    supajump.user_permissions_mv as
with
    direct as (
        /* org-scoped roles */
        select
            om.user_id,
            om.org_id as group_id,
            rp.resource,
            rp.action,
            rp.scope,
            rp.cascade_down,
            rp.target_kind
        from
            public.org_memberships om
            join public.org_member_roles omr on omr.org_member_id = om.id
            join public.role_permissions rp on rp.role_id = omr.role_id
        union all
        /* team-scoped roles */
        select
            tm.user_id,
            tm.team_id as group_id,
            rp.resource,
            rp.action,
            rp.scope,
            false as cascade_down,
            null as target_kind
        from
            public.team_memberships tm
            join public.team_member_roles tmr on tmr.team_member_id = tm.id
            join public.role_permissions rp on rp.role_id = tmr.role_id
    ),
    inherited as (
        select
            *
        from
            direct
        union all
        /* cascade org → team */
        select
            d.user_id,
            t.id,
            d.resource,
            d.action,
            d.scope,
            false,
            null
        from
            direct d
            join public.groups t on d.cascade_down
            and (
                d.target_kind is null
                or d.target_kind = 'team'
            )
            and t.kind = 'team'
            and t.org_id = d.group_id
    )
select
    user_id,
    group_id,
    resource,
    action,
    scope
from
    inherited;

create unique index concurrently if not exists on supajump.user_permissions_mv (user_id, group_id, resource, action, scope);

/* incremental refresh after any membership / role change */
create
or replace function supajump.refresh_permissions () returns trigger language plpgsql as $$
begin
  perform pg_sleep(0); -- quick noop to allow CONCURRENTLY
  refresh materialized view concurrently supajump.user_permissions_mv;
  return null;
end $$;

-- attach to volatile link tables (AFTER STATEMENT → runs once)
create trigger permissions_refresh_org_roles
after insert
or
update
or delete on public.org_member_roles for each statement
execute procedure supajump.refresh_permissions ();

create trigger permissions_refresh_team_roles
after insert
or
update
or delete on public.team_member_roles for each statement
execute procedure supajump.refresh_permissions ();

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HELPER: current user's permissions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
create
or replace function supajump.current_user_permissions (_resource text, _action text) returns table (group_id text, scope perm_scope) language sql stable -- lets planner treat result as constant
parallel SAFE -- allows parallel join
cost 1 rows 10 -- good cardinality hint
as $$
  SELECT group_id, scope
  FROM   supajump.user_permissions_mv
  WHERE  user_id  = auth.uid()
    AND  resource = _resource
    AND  action   = _action;
$$;