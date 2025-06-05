-- ────────────────────────
-- 1  ROLES
-- scope = 'organization' | 'team'
-- name  = 'owner' | 'admin' | 'member' | 'post_editor' | …
-- ────────────────────────
create table
    roles (
        id uuid primary key default gen_random_uuid (),
        scope text not null check (scope in ('organization', 'team')),
        org_id text not null references organizations (id) on delete cascade,
        team_id text references teams (id) on delete cascade,
        name text not null,
        display_name text,
        description text,
        unique (org_id, team_id, scope, name),
        unique (org_id, scope, name)
    );

alter table roles enable row level security;

-- ────────────────────────
-- 2  ROLE ↔ PERMISSION MATRIX
-- resource  = logical entity (posts, billing, settings …)
-- action    = view | edit | delete | manage …
-- ────────────────────────
create table
    role_permissions (
        id uuid primary key default gen_random_uuid (),
        role_id uuid references roles (id) on delete cascade,
        org_id text not null references organizations (id) on delete cascade,
        team_id text references teams (id) on delete cascade,
        resource text not null,
        action text not null,
        unique (org_id, team_id, role_id, resource, action),
        unique (org_id, role_id, resource, action)
    );

alter table role_permissions enable row level security;

-- ────────────────────────
-- Organization Member Roles
-- ────────────────────────
create table
    org_member_roles (
        id uuid primary key default gen_random_uuid (),
        role_id uuid references roles (id) on delete cascade,
        org_member_id uuid references org_memberships (id) on delete cascade,
        org_id text not null references organizations (id) on delete cascade,
        unique (role_id, org_member_id)
    );

alter table org_member_roles enable row level security;

-- ────────────────────────
-- Team Member Roles
-- ────────────────────────
create table
    team_member_roles (
        id uuid primary key default gen_random_uuid (),
        role_id uuid references roles (id) on delete cascade,
        team_member_id uuid references team_memberships (id) on delete cascade,
        team_id text not null references teams (id) on delete cascade,
        unique (role_id, team_member_id)
    );

alter table team_member_roles enable row level security;

-- ────────────────────────
-- Organizations Functions
-- ────────────────────────
create
or replace function public.create_organization (
    name text,
    type text default 'organization'
) returns text language plpgsql security definer as $$
declare
  new_org_id text;
begin
  insert into public.organizations (name, type, primary_owner_user_id)
  values (create_organization.name, create_organization.type, auth.uid())
  returning id into new_org_id;

  if not exists (select 1 from organizations where id = new_org_id) then
    raise exception 'failed to create organization.';
  end if;

  return new_org_id;
exception
  when unique_violation then
    raise exception 'an organization with that unique id already exists';
end;
$$;

create
or replace function public.current_user_org_member_role (lookup_org_id text) returns jsonb language plpgsql as $$
    declare
      user_org_member_roles jsonb;
      is_organization_primary_owner boolean;
      is_personal boolean;
    begin
      if lookup_org_id is null then
        -- return an error
          raise exception 'org_id is required';
      end if;

      -- Get all roles for the user in this organization
      select
        jsonb_agg(
          jsonb_build_object(
            'role_id', r.id,
            'role_name', r.name,
            'display_name', r.display_name,
            'description', r.description
          )
        )
      into user_org_member_roles
      from public.org_memberships om
      join public.org_member_roles omr on omr.org_member_id = om.id
      join public.roles r on r.id = omr.role_id
      where om.user_id = auth.uid() and om.org_id = lookup_org_id;

      select
        (primary_owner_user_id = auth.uid()), (type = 'personal')
      into
        is_organization_primary_owner, is_personal
      from public.organizations
      where id = lookup_org_id;

      if user_org_member_roles is null then
        return null;
      end if;

      return jsonb_build_object(
        'org_member_roles', user_org_member_roles,
        'is_primary_owner', is_organization_primary_owner,
        'is_personal', is_personal
      );
    end;
$$;

create
or replace function public.update_org_memberships_role (
    org_id text,
    user_id uuid,
    new_org_member_role_ids uuid[],
    make_primary_owner boolean
) returns void language plpgsql security definer
set
    search_path to 'public' as $$
    declare
      is_organization_owner boolean;
      is_organization_primary_owner boolean;
      changing_primary_owner boolean;
      owner_role_id uuid;
      member_id uuid;
      role_id uuid;
    begin
        -- Get owner role ID for validation
        owner_role_id := supajump.get_role_id_by_name('owner', 'organization');

        if owner_role_id is null then
          raise exception 'Owner role not found in roles table';
        end if;

        -- Validate that all new roles exist and are organization roles
        foreach role_id in array new_org_member_role_ids loop
          if not exists (select 1 from roles where id = role_id and scope = 'organization') then
            raise exception 'Invalid organization role ID: %', role_id;
          end if;
        end loop;

        -- check if the user is an owner, and if they are, allow them to update the role
        select exists(
          select 1 from public.org_memberships om
          join public.org_member_roles omr on omr.org_member_id = om.id
          where om.user_id = auth.uid() 
            and om.org_id = update_org_memberships_role.org_id
            and omr.role_id = owner_role_id
        ) into is_organization_owner;

        if not is_organization_owner then
          raise exception 'you must be an owner of the organization to update a users role';
        end if;

        -- check if the user being changed is the primary owner, if so its not allowed
        select primary_owner_user_id = auth.uid(), primary_owner_user_id = update_org_memberships_role.user_id into is_organization_primary_owner, changing_primary_owner from public.organizations where id = update_org_memberships_role.org_id;

        if changing_primary_owner = true and is_organization_primary_owner = false then
        	raise exception 'you must be the primary owner of the organization to change the primary owner';
        end if;

        -- Get the membership ID
        select om.id into member_id
        from public.org_memberships om
        where om.org_id = update_org_memberships_role.org_id 
          and om.user_id = update_org_memberships_role.user_id;

        if member_id is null then
          raise exception 'User is not a member of this organization';
        end if;

        -- Delete existing role assignments
        delete from public.org_member_roles where org_member_id = member_id;

        -- Insert new role assignments
        foreach role_id in array new_org_member_role_ids loop
          insert into public.org_member_roles (role_id, org_member_id, org_id)
          values (role_id, member_id, update_org_memberships_role.org_id);
        end loop;

        if make_primary_owner = true then
          -- first we see if the current user is the owner, only they can do this
          if is_organization_primary_owner = false then
            raise exception 'you must be the primary owner of the organization to change the primary owner';
          end if;

          update public.organizations set primary_owner_user_id = update_org_memberships_role.user_id where id = update_org_memberships_role.org_id;
        end if;
    end;
$$;

create
or replace function supajump.get_organizations_for_current_user (passed_in_role_id uuid default null) returns setof text language sql security definer
set
    search_path to 'public' as $$
  select distinct om.org_id
  from public.org_memberships om
  join public.org_member_roles omr on omr.org_member_id = om.id
  where om.user_id = auth.uid()
    and
      (
          omr.role_id = passed_in_role_id
          or passed_in_role_id is null
      )
$$;

revoke all on function supajump.get_organizations_for_current_user (passed_in_role_id uuid)
from
    public;

grant all on function supajump.get_organizations_for_current_user (passed_in_role_id uuid) to authenticated;

create
or replace function supajump.get_organizations_for_current_user_matching_roles (passed_in_role_ids uuid[] default null) returns setof text language sql security definer
set
    search_path to 'public' as $$
    select distinct om.org_id
    from public.org_memberships om
    join public.org_member_roles omr on omr.org_member_id = om.id
    where om.user_id = auth.uid()
      and
        (
          omr.role_id = ANY(passed_in_role_ids)
          or passed_in_role_ids is null
        )
$$;

revoke all on function supajump.get_organizations_for_current_user_matching_roles (passed_in_role_ids uuid[])
from
    public;

grant all on function supajump.get_organizations_for_current_user_matching_roles (passed_in_role_ids uuid[]) to authenticated;

create
or replace function supajump.is_set (field_name text) returns boolean language plpgsql as $$
declare
  result boolean;
begin
  execute format('select %I from supajump.config limit 1', field_name) into result;
  return result;
end;
$$;

create
or replace function supajump.add_current_user_to_new_organization () returns trigger language plpgsql security definer
set
    search_path to 'public' as $$
  declare
    owner_role_id uuid;
    new_member_id uuid;
  begin
    if new.primary_owner_user_id = auth.uid() then
      -- Get the owner role ID using helper function (internal use only)
      owner_role_id := supajump.get_role_id_by_name('owner', 'organization');

      if owner_role_id is null then
        raise exception 'Owner role not found in roles table';
      end if;

      -- Insert the membership first
      insert into public.org_memberships (org_id, user_id)
      values (NEW.id, auth.uid())
      returning id into new_member_id;

      -- Then assign the owner role
      insert into public.org_member_roles (role_id, org_member_id, org_id)
      values (owner_role_id, new_member_id, NEW.id);
    end if;
    return NEW;
  end;
$$;

create
or replace trigger add_current_user_to_new_organization
after insert on public.organizations for each row
execute function supajump.add_current_user_to_new_organization ();

create
or replace function supajump.get_role_id_by_name (role_name text, role_scope text default 'organization') returns uuid language sql security definer
set
    search_path to 'public' as $$
  select id
  from roles
  where name = role_name and scope = role_scope
  limit 1
$$;

revoke all on function supajump.get_role_id_by_name (role_name text, role_scope text)
from
    public;

grant all on function supajump.get_role_id_by_name (role_name text, role_scope text) to authenticated;

create
or replace function supajump.get_role_name_by_id (role_id uuid) returns text language sql security definer
set
    search_path to 'public' as $$
  select name
  from roles
  where id = role_id
  limit 1
$$;

revoke all on function supajump.get_role_name_by_id (role_id uuid)
from
    public;

grant all on function supajump.get_role_name_by_id (role_id uuid) to authenticated;

-- Convenience functions for applications to get role IDs by name
create
or replace function public.get_org_role_id (role_name text) returns uuid language sql security definer
set
    search_path to 'public' as $$
  select id
  from roles
  where name = role_name and scope = 'organization'
  limit 1
$$;

grant
execute on function public.get_org_role_id (text) to authenticated;

create
or replace function public.get_team_role_id (role_name text) returns uuid language sql security definer
set
    search_path to 'public' as $$
  select id
  from roles
  where name = role_name and scope = 'team'
  limit 1
$$;

grant
execute on function public.get_team_role_id (text) to authenticated;

-- Convenience function to get organizations for current user by role name
create
or replace function public.get_organizations_for_current_user_by_role_name (role_name text) returns setof text language sql security definer
set
    search_path to 'public' as $$
  select distinct om.org_id
  from public.org_memberships om
  join public.org_member_roles omr on omr.org_member_id = om.id
  join public.roles r on r.id = omr.role_id
  where om.user_id = auth.uid()
    and r.scope = 'organization'
    and r.name = role_name
$$;

grant
execute on function public.get_organizations_for_current_user_by_role_name (text) to authenticated;

-- ────────────────────────
-- Teams Functions
-- ────────────────────────
/**
 * when a team gets created, we want to insert the current user as the first
 * owner
 */
create function supajump.add_current_user_to_new_team () returns trigger language plpgsql security definer
set
    search_path = public as $$
  declare
    owner_role_id uuid;
    new_member_id uuid;
  begin
    if new.primary_owner_user_id = auth.uid() then
      -- Get the owner role ID for teams
      owner_role_id := supajump.get_role_id_by_name('owner', 'team');

      if owner_role_id is null then
        raise exception 'Team owner role not found in roles table';
      end if;

      -- Insert the membership first
      insert into public.team_memberships (team_id, user_id)
      values (new.id, auth.uid())
      returning id into new_member_id;

      -- Then assign the owner role
      insert into public.team_member_roles (role_id, team_member_id, team_id)
      values (owner_role_id, new_member_id, new.id);
    end if;
    return new;
  end;
$$;

-- trigger the function whenever a new team is created
create trigger add_current_user_to_new_team
after insert on public.teams for each row
execute function supajump.add_current_user_to_new_team ();

/**
 * auth convenience functions
 */
/**
 * returns the current user's role within a given team_id
 * exists in the public name space because it's accessible via the api
 */
create
or replace function public.current_user_teams_member_role (lookup_team_id text) returns jsonb language plpgsql as $$
  declare
    user_teams_member_roles jsonb;
    is_team_primary_owner boolean;
  begin
    if lookup_team_id is null then
      -- return an error
      raise exception 'team_id is required';
    end if;

    -- Get all roles for the user in this team
    select
      jsonb_agg(
        jsonb_build_object(
          'role_id', r.id,
          'role_name', r.name,
          'display_name', r.display_name,
          'description', r.description
        )
      )
    into user_teams_member_roles
    from public.team_memberships tm
    join public.team_member_roles tmr on tmr.team_member_id = tm.id
    join public.roles r on r.id = tmr.role_id
    where tm.user_id = auth.uid() and tm.team_id = lookup_team_id;

    select primary_owner_user_id = auth.uid() into is_team_primary_owner from public.teams where id = lookup_team_id;

    if user_teams_member_roles is null then
      return null;
    end if;

    return jsonb_build_object(
      'teams_member_roles', user_teams_member_roles,
      'is_primary_owner', is_team_primary_owner
    );
  end;
$$;

grant
execute on function public.current_user_teams_member_role (text) to authenticated;

/**
 * lets you update a users role within a team if you are an owner of that team
 */
create
or replace function public.update_team_memberships_role (
    team_id text,
    user_id uuid,
    new_teams_member_role_ids uuid[],
    make_primary_owner boolean
) returns void security definer
set
    search_path = public language plpgsql as $$
  declare
    is_team_owner boolean;
    is_team_primary_owner boolean;
    changing_primary_owner boolean;
    owner_role_id uuid;
    member_id uuid;
    role_id uuid;
  begin
    -- Get owner role ID for validation
    owner_role_id := supajump.get_role_id_by_name('owner', 'team');

    if owner_role_id is null then
      raise exception 'Team owner role not found in roles table';
    end if;

    -- Validate that all new roles exist and are team roles
    foreach role_id in array new_teams_member_role_ids loop
      if not exists (select 1 from roles where id = role_id and scope = 'team') then
        raise exception 'Invalid team role ID: %', role_id;
      end if;
    end loop;

    -- check if the user is an owner, and if they are, allow them to update the role
    select exists(
      select 1 from public.team_memberships tm
      join public.team_member_roles tmr on tmr.team_member_id = tm.id
      where tm.user_id = auth.uid() 
        and tm.team_id = update_team_memberships_role.team_id
        and tmr.role_id = owner_role_id
    ) into is_team_owner;

    if not is_team_owner then
      raise exception 'you must be an owner of the team to update a users role';
    end if;

    -- check if the user being changed is the primary owner, if so its not allowed
    select primary_owner_user_id = auth.uid(), primary_owner_user_id = update_team_memberships_role.user_id into is_team_primary_owner, changing_primary_owner from public.teams where id = update_team_memberships_role.team_id;

    if changing_primary_owner = true and is_team_primary_owner = false then
      raise exception 'you must be the primary owner of the team to change the primary owner';
    end if;

    -- Get the membership ID
    select tm.id into member_id
    from public.team_memberships tm
    where tm.team_id = update_team_memberships_role.team_id 
      and tm.user_id = update_team_memberships_role.user_id;

    if member_id is null then
      raise exception 'User is not a member of this team';
    end if;

    -- Delete existing role assignments
    delete from public.team_member_roles where team_member_id = member_id;

    -- Insert new role assignments
    foreach role_id in array new_teams_member_role_ids loop
      insert into public.team_member_roles (role_id, team_member_id, team_id)
      values (role_id, member_id, update_team_memberships_role.team_id);
    end loop;

    if make_primary_owner = true then
      -- first we see if the current user is the owner, only they can do this
      if is_team_primary_owner = false then
        raise exception 'you must be the primary owner of the team to change the primary owner';
      end if;

      update public.teams set primary_owner_user_id = update_team_memberships_role.user_id where id = update_team_memberships_role.team_id;
    end if;
  end;
$$;

grant
execute on function public.update_team_memberships_role (text, uuid, uuid[], boolean) to authenticated;

/**
 * returns team_ids that the current user is a member of. if you pass in a role,
 * it'll only return teams that the user is a member of with that role.
 */
create
or replace function supajump.get_teams_for_current_user (passed_in_role_id uuid default null) returns setof text language sql security definer
set
    search_path = public as $$
  select distinct tm.team_id
  from public.team_memberships tm
  join public.team_member_roles tmr on tmr.team_member_id = tm.id
  where tm.user_id = auth.uid()
    and (
        tmr.role_id = passed_in_role_id
        or passed_in_role_id is null
      )
$$;

grant
execute on function supajump.get_teams_for_current_user (uuid) to authenticated;

create
or replace function supajump.get_teams_for_current_user_matching_roles (passed_in_role_ids uuid[] default null) returns setof text language sql security definer
set
    search_path = public as $$
  select distinct tm.team_id
  from public.team_memberships tm
  join public.team_member_roles tmr on tmr.team_member_id = tm.id
  where tm.user_id = auth.uid()
    and (
      tmr.role_id = ANY(passed_in_role_ids)
      or passed_in_role_ids is null
    )
$$;

grant
execute on function supajump.get_teams_for_current_user_matching_roles (uuid[]) to authenticated;

-- Convenience function to get teams for current user by role name
create
or replace function public.get_teams_for_current_user_by_role_name (role_name text) returns setof text language sql security definer
set
    search_path = public as $$
  select distinct tm.team_id
  from public.team_memberships tm
  join public.team_member_roles tmr on tmr.team_member_id = tm.id
  join public.roles r on r.id = tmr.role_id
  where tm.user_id = auth.uid()
    and r.scope = 'team'
    and r.name = role_name
$$;

grant
execute on function public.get_teams_for_current_user_by_role_name (text) to authenticated;

-- create a team and add the current user as the owner
create
or replace function public.create_team_and_add_current_user_as_owner (team_name text, org_id text) returns text language plpgsql security invoker
set
    search_path = public as $$
  declare
    new_team_id text;
    owner_role_id uuid;
    new_member_id uuid;
    is_member boolean;
    is_primary_owner boolean;
  begin
    -- verify the current user is a member of the provided organization
    select exists(
      select 1
      from public.org_memberships om
      where om.user_id = auth.uid()
        and om.org_id = create_team_and_add_current_user_as_owner.org_id
    ) into is_member;

    -- check if the current user is the primary owner of the organization
    select primary_owner_user_id = auth.uid() into is_primary_owner from public.organizations where id = create_team_and_add_current_user_as_owner.org_id;

    if is_member is not true or is_primary_owner is not true then
      raise exception 'you must be a member of the organization to create a team';
    end if;

    -- Get the owner role ID for validation
    owner_role_id := supajump.get_role_id_by_name('owner', 'team');

    if owner_role_id is null then
      raise exception 'Team owner role not found in roles table';
    end if;

    -- Insert into teams
    insert into public.teams (name, org_id, primary_owner_user_id)
    values (team_name, org_id, auth.uid())
    returning id into new_team_id;

    -- Add current user as a member
    insert into public.team_memberships (team_id, user_id)
    values (new_team_id, auth.uid())
    returning id into new_member_id;

    -- Assign owner role
    insert into public.team_member_roles (role_id, team_member_id, team_id)
    values (owner_role_id, new_member_id, new_team_id);

    return new_team_id;
  end;
$$;

grant
execute on function public.create_team_and_add_current_user_as_owner (text, text) to authenticated;