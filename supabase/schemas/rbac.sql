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