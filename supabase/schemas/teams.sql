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