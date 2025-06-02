-- ───────── team-level
create
or replace function has_team_permission (_team_id uuid, _resource text, _action text) returns boolean language sql security definer
set
    search_path = public as $$
  select exists (
    select 1
    from   team_memberships tm
    join   role_permissions rp on rp.role_id = tm.role_id
    where  tm.team_id      = _team_id
      and  pm.user_id         = auth.uid()
      and  rp.resource        = _resource
      and  rp.action          = _action
  );
$$;

grant
execute on function has_team_permission (uuid, text, text) to authenticated;

-- ───────── org-level
create
or replace function has_org_permission (_org_id uuid, _resource text, _action text) returns boolean language sql security definer
set
    search_path = public as $$
  select exists (
    select 1
    from   org_memberships om
    join   role_permissions rp on rp.role_id = om.role_id
    where  om.org_id          = _org_id
      and  om.user_id         = auth.uid()
      and  rp.resource        = _resource
      and  rp.action          = _action
  );
$$;

grant
execute on function has_org_permission (uuid, text, text) to authenticated;