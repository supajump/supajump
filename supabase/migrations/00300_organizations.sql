/**
 * Organizations are the primary grouping for most objects within the system.
 * They have many users, and all billing is connected to an organization.
 *
 * The primary owner user id is the user that is the owner of the organization.
 * This is the user that is responsible for the organization and has full
 * access to the organization.
 */
create table if not exists
    public.organizations (
        id text primary key default public.nanoid (),
        created_at timestamp with time zone default now(),
        updated_at timestamp with time zone,
        primary_owner_user_id uuid references auth.users (id) on delete set null default auth.uid (),
        name text not null,
        type text default 'organization',
        slug text unique,
        constraint organizations_type_check check (
            type in ('super', 'organization', 'personal')
        )
    );

alter table public.organizations enable row level security;

-- triggers
-- create a trigger to handle the timestamp updates for organizations
create trigger set_timestamps_organizations before
update on organizations for each row
execute function supajump.trigger_set_timestamps ();

/**
 * Organization members are the users that are associated with an organization.
 * They can be invited to join the organization, and can have different roles.
 * The system does not enforce any permissions for roles, other than restricting
 * billing and organization membership to only owners
 */
create table if not exists
    public.org_memberships (
        id uuid primary key default gen_random_uuid (),
        created_at timestamp with time zone default now(),
        updated_at timestamp with time zone,
        user_id uuid not null references auth.users (id) on delete cascade,
        org_id text not null references public.organizations (id) on delete cascade,
        constraint org_memberships_org_user_unique unique (org_id, user_id)
    );

alter table public.org_memberships enable row level security;

-- triggers
-- create a trigger to handle the timestamp updates for org_memberships
create trigger set_timestamps_org_memberships before
update on org_memberships for each row
execute function supajump.trigger_set_timestamps ();

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

/**
 * We want to protect some fields on organizations from being updated
 * Specifically the primary owner user id and organization id.
 * primary_owner_user_id should be updated using the dedicated function
 */
create
or replace function public.protect_organization_fields () returns trigger language plpgsql as $$
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
 $$;

create
or replace trigger protect_organization_fields before
update on public.organizations for each row
execute function public.protect_organization_fields ();

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