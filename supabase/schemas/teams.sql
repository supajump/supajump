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
        team_member_role uuid not null references roles (id) on delete cascade,
        unique (team_id, user_id)
        -- constraint team_memberships_role_check check (team_member_role in ('owner', 'admin', 'member'))
    );

alter table team_memberships enable row level security;

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
  begin
    if new.primary_owner_user_id = auth.uid() then
      insert into public.team_memberships (team_id, user_id, team_member_role)
      values (new.id, auth.uid(), 'owner');
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
    user_teams_member_role text;
    is_team_primary_owner boolean;
    is_type boolean;
  begin
    if lookup_team_id is null then
      -- return an error
      raise exception 'team_id is required';
    end if;

    select team_member_role into user_teams_member_role from public.team_memberships where user_id = auth.uid() and team_memberships.team_id = lookup_team_id;
    select primary_owner_user_id = auth.uid(), type into is_team_primary_owner, is_type from public.teams where id = lookup_team_id;

    if user_teams_member_role is null then
      return null;
    end if;

    return jsonb_build_object(
      'teams_member_role', user_teams_member_role,
      'is_primary_owner', is_team_primary_owner,
      'is_type', is_type
    );
  end;
$$;

grant
execute on function public.current_user_teams_member_role (text) to authenticated;

/ * * * let 's you update a users role within an team if you are an owner of that team
  **/
create or replace function public.update_team_memberships_role(team_id text, user_id uuid,  new_teams_member_role text, make_primary_owner boolean)
returns void
security definer
set search_path=public
language plpgsql
as $$
  declare
    is_team_owner boolean;
    is_team_primary_owner boolean;
    changing_primary_owner boolean;
  begin
    -- check if the user is an owner, and if they are, allow them to update the role
    select (update_team_memberships_role.team_id in ( select supajump.get_teams_for_current_user(' owner ') as get_teams_for_current_user)) into is_team_owner;

    if not is_team_owner then
      raise exception ' you must be an owner of the team to
update a users role ';
    end if;

    -- check if the user being changed is the primary owner, if so its not allowed
    select primary_owner_user_id = auth.uid(), primary_owner_user_id = update_team_memberships_role.user_id into is_team_primary_owner, changing_primary_owner from public.teams where id = update_team_memberships_role.team_id;

    if changing_primary_owner = true and is_team_primary_owner = false then
      raise exception ' you must be the primary owner of the team to change the primary owner ';
    end if;

    update public.team_memberships set team_member_role = new_teams_member_role where team_memberships.team_id = update_team_memberships_role.team_id and team_memberships.user_id = update_team_memberships_role.user_id;

    if make_primary_owner = true then
      -- first we see if the current user is the owner, only they can do this
      if is_team_primary_owner = false then
        raise exception ' you must be the primary owner of the team to change the primary owner ';
      end if;

      update public.teams set primary_owner_user_id = update_team_memberships_role.user_id where id = update_team_memberships_role.team_id;
    end if;
  end;
$$;

grant execute on function public.update_team_memberships_role(text, uuid, text, boolean) to authenticated;

/**
  * returns team_ids that the current user is a member of. if you pass in a role,
  * it' ll only return teams that the user is a member of
with
    that role.* / create
    or replace function supajump.get_teams_for_current_user (passed_in_role text default null) returns setof text language sql security definer
set
    search_path = public as $$
  select team_id
  from public.team_memberships wu
  where wu.user_id = auth.uid()
  and (
      wu.team_member_role = passed_in_role
      or passed_in_role is null
    )
$$;

grant
execute on function supajump.get_teams_for_current_user (text) to authenticated;

create
or replace function supajump.get_teams_for_current_user_matching_roles (passed_in_roles text[] default null) returns setof text language sql security definer
set
    search_path = public as $$
  select team_id
  from public.team_memberships wu
  where wu.user_id = auth.uid()
  and (
    wu.team_member_role = ANY(passed_in_roles)
    or passed_in_roles is null
  )
$$;

grant
execute on function supajump.get_teams_for_current_user_matching_roles (text[]) to authenticated;

-- create a team and add the current user as the owner
create
or replace function supajump.create_team_and_add_current_user_as_owner (team_name text) returns text language plpgsql security definer
set
    search_path = public as $$
  declare
    new_team_id text;
  begin
    insert into public.teams (name, primary_owner_user_id)
    values (team_name, auth.uid())
    returning id into new_team_id;

    insert into public.team_memberships (team_id, user_id, team_member_role)
    values (new_team_id, auth.uid(), 'owner');

    return new_team_id;
  end;
$$;

grant
execute on function supajump.create_team_and_add_current_user_as_owner (text) to authenticated;

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