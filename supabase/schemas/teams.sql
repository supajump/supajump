/**
 * teams are a grouping of users that are associated with an organization.
 * they are used to group users together for a specific purpose.
 *
 * the primary owner user id is the user that is the owner of the team.
 * this is the user that is responsible for the team and has full
 * access to the team.
 */
create table
  public.teams (
    id text primary key default public.nanoid (),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone,
    org_id text not null references organizations (id) on delete cascade,
    primary_owner_user_id uuid not null references auth.users (id),
    name text not null
  );

alter table teams enable row level security;

/**
 * team memberships are the users that are associated with a team.
 * they can have different roles within the team.
 *
 * the team member role is used to determine the role of the user within the team.
 */
create table
  public.team_memberships (
    id uuid primary key default uuid_generate_v4 (),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone,
    team_id text not null references teams (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    unique (team_id, user_id)
  );

alter table team_memberships enable row level security;

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

/**
 * we want to protect some fields on teams from being updated
 * specifically the primary owner user id and team id.
 * primary_owner_user_id should be updated using the dedicated function
 */
create
or replace function public.protect_team_fields () returns trigger as $$
 begin


  if current_user in ('authenticated', 'anon') then
    -- these are protected fields that users are not allowed to update themselves
    -- platform admins should be very careful about updating them as well.
    if new.id <> old.id
    or new.primary_owner_user_id <> old.primary_owner_user_id
    then
      raise exception 'you do not have permission to update this field';
    end if;
  end if;

  return new;
 end
 $$ language plpgsql;

create trigger protect_team_fields before
update on public.teams for each row
execute function public.protect_team_fields ();

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
or replace function supajump.create_team_and_add_current_user_as_owner (
  team_name text,
  org_id text
) returns text language plpgsql security definer
set
  search_path = public as $$
  declare
    new_team_id text;
    owner_role_id uuid;
    new_member_id uuid;
    is_member boolean;
  begin
    -- verify the current user is a member of the provided organization
    select exists(
      select 1
      from public.org_memberships om
      where om.user_id = auth.uid()
        and om.org_id = create_team_and_add_current_user_as_owner.org_id
    ) into is_member;

    if is_member is not true then
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
execute on function supajump.create_team_and_add_current_user_as_owner (text, text) to authenticated;

-- -- rls policies: teams
-- /**
--  * select: teams need to be readable by primary_owner_user_id so that the select
--  * after initial create is readable
--  */
-- create policy "teams are viewable by primary owner" on teams for
-- select
--     to authenticated using (primary_owner_user_id = auth.uid ());
-- /**
--  * select: teams are viewable by their members
--  */
-- create policy "teams are viewable by members" on teams for
-- select
--     to authenticated using (
--         id in (
--             select
--                 supajump.get_teams_for_current_user ()
--         )
--     );
-- /**
--  * insert: teams can be created by organization owners
--  */
-- create policy "teams can be created by organization owner" on teams for insert to authenticated
-- with
--     check (
--         org_id in (
--             select
--                 supajump.get_organizations_for_current_user ('owner') as get_organizations_for_current_user
--         )
--     );
-- /**
--  * update: teams can be edited by team owners
--  */
-- create policy "teams can be edited by team owners" on teams for
-- update to authenticated using (
--     (
--         id in (
--             select
--                 supajump.get_teams_for_current_user ('owner') as get_teams_for_current_user
--         )
--     )
-- )
-- with
--     check (
--         (
--             id in (
--                 select
--                     supajump.get_teams_for_current_user ('owner') as get_teams_for_current_user
--             )
--         )
--     );
-- /**
--  * update: teams can be updated by organization owners
--  */
-- create policy "organization owners can update teams" on teams for
-- update to authenticated using (
--     (
--         org_id in (
--             select
--                 supajump.get_organizations_for_current_user ('owner')
--         )
--     )
-- )
-- with
--     check (
--         (
--             org_id in (
--                 select
--                     supajump.get_organizations_for_current_user ('owner')
--             )
--         )
--     );
-- /**
--  * delete: teams can be deleted by organization owners
--  */
-- create policy "organization owners can delete teams" on teams for delete to authenticated using (
--     (
--         org_id in (
--             select
--                 supajump.get_organizations_for_current_user ('owner')
--         )
--     )
-- );
-- -- rls policies: team_memberships
-- /**
--  * select: users can all view their own team_memberships
--  */
-- create policy "users can view their own team_memberships" on team_memberships for
-- select
--     to authenticated using (user_id = auth.uid ());
-- /**
--  * select: team members can all view other team members and their roles
--  */
-- create policy "team members can view their teammates" on team_memberships for
-- select
--     to authenticated using (
--         (
--             team_id in (
--                 select
--                     supajump.get_teams_for_current_user () as get_teams_for_authenticated_user
--             )
--         )
--     );
-- /**
--  * delete: team members can be removed by owners. you cannot remove the primary team owner
--  */
-- create policy "team members can be deleted by the owner except for the primary team owner" on team_memberships for delete to authenticated using (
--     (
--         team_id in (
--             select
--                 supajump.get_teams_for_current_user ('owner') as get_teams_for_current_user
--         )
--     )
--     and user_id != (
--         select
--             primary_owner_user_id
--         from
--             public.teams
--         where
--             team_id = teams.id
--     )
-- );