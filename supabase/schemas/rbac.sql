-- ───────── team-level
create
or replace function has_team_permission (_team_id text, _resource text, _action text) returns boolean language sql security definer
set
  search_path = public as $$
  select exists (
    select 1
    from   team_memberships tm
    join   team_member_roles tmr on tmr.team_member_id = tm.id
    join   role_permissions rp on rp.role_id = tmr.role_id
    where  tm.team_id      = _team_id
      and  tm.user_id         = auth.uid()
      and  rp.resource        = _resource
      and  rp.action          = _action
  );
$$;

grant
execute on function has_team_permission (text, text, text) to authenticated;

-- ───────── org-level
create
or replace function has_org_permission (_org_id text, _resource text, _action text) returns boolean language sql security definer
set
  search_path = public as $$
  select exists (
    select 1
    from   org_memberships om
    join   org_member_roles omr on omr.org_member_id = om.id
    join   role_permissions rp on rp.role_id = omr.role_id
    where  om.org_id          = _org_id
      and  om.user_id         = auth.uid()
      and  rp.resource        = _resource
      and  rp.action          = _action
  );
$$;

grant
execute on function has_org_permission (text, text, text) to authenticated;

-- RLS policies
-- org_memberships
create policy "Users can view other organization members" on public.org_memberships for
select
  to authenticated using (
    has_org_permission (org_id, 'org_memberships', 'view')
    or org_id in (
      select
        org_id
      from
        public.organizations
      where
        primary_owner_user_id = auth.uid ()
    )
  );

-- organizations
create policy "Users can view organizations they are members of" on public.organizations for
select
  to authenticated using (
    id in (
      select
        supajump.get_organizations_for_current_user ()
    )
  );

-- teams
create policy "Users can view teams they are members of" on public.teams for
select
  to authenticated using (
    id in (
      select
        supajump.get_teams_for_current_user ()
    )
  );

-- user_permissions
create view
  user_permissions as
select
  om.user_id,
  om.org_id,
  null::text as team_id, -- org-level permissions are not scoped to a team
  rp.resource,
  rp.action,
  rp.scope
from
  org_memberships om
  join org_member_roles omr on omr.org_member_id = om.id
  join role_permissions rp on rp.role_id = omr.role_id
union all
select
  tm.user_id,
  t.org_id, -- inherit org_id from team
  tm.team_id, -- team level entry
  rp.resource,
  rp.action,
  rp.scope
from
  team_memberships tm
  join team_member_roles tmr on tmr.team_member_id = tm.id
  join roles r on r.id = tmr.role_id
  join role_permissions rp on rp.role_id = r.id
  join teams t on t.id = tm.team_id;

create index idx_user_permissions_user_id_org_id_resource_action on user_permissions (user_id, org_id, resource, action);

create index idx_organizations_primary_owner_user_id_id on organizations (primary_owner_user_id, id);

create index idx_user_permissions_user_id_org_id_team_id_resource_action_scope on user_permissions (user_id, org_id, team_id, resource, action, scope);

-- owner bypass indexes
create index idx_organizations_primary_owner_user_id_id on organizations (primary_owner_user_id, id);

create index idx_teams_primary_owner_user_id_id on teams (primary_owner_user_id, id);

------------------------------------------------
-- 1. READ  (SELECT)
------------------------------------------------
create policy rls_select_generic on < TABLE_NAME > for
select
  to authenticated using (
    exists (
      select
        1
      from
        user_permissions up
      where
        up.user_id = auth.uid ()
        and up.org_id = < TABLE_NAME >.org_id
        and up.resource = tableoid::regclass::text
        and up.action = 'view'
        and (
          ------------------------------------------
          -- Org path
          ------------------------------------------
          (
            up.team_id is null -- org-role row
            and up.org_id = < TABLE_NAME >.org_id
            and (
              up.scope = 'all'
              or (
                up.scope = 'own'
                and < TABLE_NAME >.owner_id = auth.uid ()
              )
            )
          )
          ------------------------------------------
          -- Team path (if the table has team_id)
          ------------------------------------------
          or (
            up.team_id is not null -- team-role row
            and up.team_id = < TABLE_NAME >.team_id
            and (
              up.scope = 'all'
              or (
                up.scope = 'own'
                and < TABLE_NAME >.owner_id = auth.uid ()
              )
            )
          )
        )
    )
    ------------------------------------------------------
    -- ② Org-owner OR Team-owner bypass
    ------------------------------------------------------
    or exists (
      select
        1
      from
        organizations o
      where
        o.id = < TABLE_NAME >.org_id
        and o.primary_owner_user_id = auth.uid ()
    )
    or (
      < TABLE_NAME >.team_id is not null
      and exists (
        select
          1
        from
          teams t
        where
          t.id = < TABLE_NAME >.team_id
          and t.primary_owner_user_id = auth.uid ()
      )
    )
  );

create policy rls_insert_generic on < TABLE_NAME > for insert to authenticated
with
  check (
    --------------------------------------------
    -- ① Permission via roles (org or team)
    --------------------------------------------
    exists (
      select
        1
      from
        user_permissions up
      where
        up.user_id = auth.uid ()
        and up.resource = tableoid::regclass::text
        and up.action = 'create'
        and (
          -- ─── ORG path ───────────────────
          (
            up.team_id is null
            and up.org_id = new.org_id
            and (
              up.scope = 'all'
              or (
                up.scope = 'own'
                and new.owner_id = auth.uid ()
              )
            )
          )
          -- ─── TEAM path ──────────────────
          or (
            up.team_id is not null
            and up.team_id = new.team_id -- will be NULL on pure-org rows
            and (
              up.scope = 'all'
              or (
                up.scope = 'own'
                and new.owner_id = auth.uid ()
              )
            )
          )
        )
    )
    --------------------------------------------
    -- ② Owner bypass (org or team)
    --------------------------------------------
    or exists (
      select
        1
      from
        organizations o
      where
        o.id = new.org_id
        and o.primary_owner_user_id = auth.uid ()
    )
    or (
      new.team_id is not null
      and exists (
        select
          1
        from
          teams t
        where
          t.id = new.team_id
          and t.primary_owner_user_id = auth.uid ()
      )
    )
  );

create policy rls_update_generic on < TABLE_NAME > for
update to authenticated using ( -- Permission to TOUCH the existing row
  exists (
    select
      1
    from
      user_permissions up
    where
      up.user_id = auth.uid ()
      and up.resource = tableoid::regclass::text
      and up.action = 'update'
      and (
        -- ORG
        (
          up.team_id is null
          and up.org_id = < TABLE_NAME >.org_id
          and (
            up.scope = 'all'
            or (
              up.scope = 'own'
              and < TABLE_NAME >.owner_id = auth.uid ()
            )
          )
        )
        -- TEAM
        or (
          up.team_id is not null
          and up.team_id = < TABLE_NAME >.team_id
          and (
            up.scope = 'all'
            or (
              up.scope = 'own'
              and < TABLE_NAME >.owner_id = auth.uid ()
            )
          )
        )
      )
  )
  or exists (
    select
      1
    from
      organizations o
    where
      o.id = < TABLE_NAME >.org_id
      and o.primary_owner_user_id = auth.uid ()
  )
  or (
    < TABLE_NAME >.team_id is not null
    and exists (
      select
        1
      from
        teams t
      where
        t.id = < TABLE_NAME >.team_id
        and t.primary_owner_user_id = auth.uid ()
    )
  )
)
with
  check ( -- NEW row must still be valid
    exists (
      select
        1
      from
        user_permissions up
      where
        up.user_id = auth.uid ()
        and up.resource = tableoid::regclass::text
        and up.action = 'update'
        and (
          -- ORG
          (
            up.team_id is null
            and up.org_id = new.org_id
            and (
              up.scope = 'all'
              or (
                up.scope = 'own'
                and new.owner_id = auth.uid ()
              )
            )
          )
          -- TEAM
          or (
            up.team_id is not null
            and up.team_id = new.team_id
            and (
              up.scope = 'all'
              or (
                up.scope = 'own'
                and new.owner_id = auth.uid ()
              )
            )
          )
        )
    )
    or exists (
      select
        1
      from
        organizations o
      where
        o.id = new.org_id
        and o.primary_owner_user_id = auth.uid ()
    )
    or (
      new.team_id is not null
      and exists (
        select
          1
        from
          teams t
        where
          t.id = new.team_id
          and t.primary_owner_user_id = auth.uid ()
      )
    )
  );

create policy rls_delete_generic on < TABLE_NAME > for delete to authenticated using (
  --------------------------------------------
  -- ① Permission via roles
  --------------------------------------------
  exists (
    select
      1
    from
      user_permissions up
    where
      up.user_id = auth.uid ()
      and up.resource = tableoid::regclass::text
      and up.action = 'delete'
      and (
        -- ORG
        (
          up.team_id is null
          and up.org_id = < TABLE_NAME >.org_id
          and (
            up.scope = 'all'
            or (
              up.scope = 'own'
              and < TABLE_NAME >.owner_id = auth.uid ()
            )
          )
        )
        -- TEAM
        or (
          up.team_id is not null
          and up.team_id = < TABLE_NAME >.team_id
          and (
            up.scope = 'all'
            or (
              up.scope = 'own'
              and < TABLE_NAME >.owner_id = auth.uid ()
            )
          )
        )
      )
  )
  --------------------------------------------
  -- ② Owner bypass
  --------------------------------------------
  or exists (
    select
      1
    from
      organizations o
    where
      o.id = < TABLE_NAME >.org_id
      and o.primary_owner_user_id = auth.uid ()
  )
  or (
    < TABLE_NAME >.team_id is not null
    and exists (
      select
        1
      from
        teams t
      where
        t.id = < TABLE_NAME >.team_id
        and t.primary_owner_user_id = auth.uid ()
    )
  )
);