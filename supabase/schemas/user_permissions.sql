/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MATERIALISED user_permissions  (pre-computed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
create schema supajump;

create view
    supajump.user_permissions_view as
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

create unique index concurrently if not exists on supajump.user_permissions_view (user_id, group_id, resource, action, scope);