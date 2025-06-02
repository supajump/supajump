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
        org_member_role uuid not null references roles (id) on delete cascade,
        constraint org_memberships_org_user_unique unique (org_id, user_id)
        -- constraint org_memberships_role_check check (org_member_role in ('owner', 'admin', 'member'))
    );

alter table public.org_memberships enable row level security;

-- triggers
-- create a trigger to handle the timestamp updates for org_memberships
create trigger set_timestamps_org_memberships before
update on org_memberships for each row
execute function supajump.trigger_set_timestamps ();

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
      user_org_member_role_id uuid;
      user_org_member_role_name text;
      is_organization_primary_owner boolean;
      is_personal boolean;
    begin
      if lookup_org_id is null then
        -- return an error
          raise exception 'org_id is required';
      end if;

      select
        om.org_member_role, r.name
      into user_org_member_role_id, user_org_member_role_name
      from public.org_memberships om
      join public.roles r on r.id = om.org_member_role
      where om.user_id = auth.uid() and om.org_id = lookup_org_id;

      select
        (primary_owner_user_id = auth.uid()), (type = 'personal')
      into
        is_organization_primary_owner, is_personal
      from public.organizations
      where id = lookup_org_id;

      if user_org_member_role_id is null then
        return null;
      end if;

      return jsonb_build_object(
        'org_member_role_id', user_org_member_role_id,
        'org_member_role_name', user_org_member_role_name,
        'is_primary_owner', is_organization_primary_owner,
        'is_personal', is_personal
      );
    end;
$$;

create
or replace function public.update_org_memberships_role (
    org_id text,
    user_id uuid,
    new_org_member_role_id uuid,
    make_primary_owner boolean
) returns void language plpgsql security definer
set
    search_path to 'public' as $$
    declare
      is_organization_owner boolean;
      is_organization_primary_owner boolean;
      changing_primary_owner boolean;
      owner_role_id uuid;
    begin
        -- Get owner role ID for validation
        owner_role_id := supajump.get_role_id_by_name('owner', 'organization');

        if owner_role_id is null then
          raise exception 'Owner role not found in roles table';
        end if;

        -- Validate that the new role exists and is an organization role
        if not exists (select 1 from roles where id = new_org_member_role_id and scope = 'organization') then
          raise exception 'Invalid organization role ID';
        end if;

        -- check if the user is an owner, and if they are, allow them to update the role
        select exists(
          select 1 from public.org_memberships om
          where om.user_id = auth.uid() 
            and om.org_id = update_org_memberships_role.org_id
            and om.org_member_role = owner_role_id
        ) into is_organization_owner;

        if not is_organization_owner then
          raise exception 'you must be an owner of the organization to update a users role';
        end if;

        -- check if the user being changed is the primary owner, if so its not allowed
        select primary_owner_user_id = auth.uid(), primary_owner_user_id = update_org_memberships_role.user_id into is_organization_primary_owner, changing_primary_owner from public.organizations where id = update_org_memberships_role.org_id;

        if changing_primary_owner = true and is_organization_primary_owner = false then
        	raise exception 'you must be the primary owner of the organization to change the primary owner';
        end if;

        update public.org_memberships set org_member_role = new_org_member_role_id where org_memberships.org_id = update_org_memberships_role.org_id and org_memberships.user_id = update_org_memberships_role.user_id;

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
  select om.org_id
  from public.org_memberships om
  where om.user_id = auth.uid()
    and
      (
          om.org_member_role = passed_in_role_id
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
    select om.org_id
    from public.org_memberships om
    where om.user_id = auth.uid()
      and
        (
          om.org_member_role = ANY(passed_in_role_ids)
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
  begin
    if new.primary_owner_user_id = auth.uid() then
      -- Get the owner role ID using helper function (internal use only)
      owner_role_id := supajump.get_role_id_by_name('owner', 'organization');

      if owner_role_id is null then
        raise exception 'Owner role not found in roles table';
      end if;

      insert into public.org_memberships (org_id, user_id, org_member_role)
      values (NEW.id, auth.uid(), owner_role_id);
    end if;
    return NEW;
  end;
$$;

create
or replace trigger add_current_user_to_new_organization
after insert on public.organizations for each row
execute function supajump.add_current_user_to_new_organization ();

-- row level security: organizations
-- create policy "organizations are viewable by members" on public.organizations for
-- select
--     to authenticated using (
--         (
--             id in (
--                 select
--                     supajump.get_organizations_for_current_user () as get_organizations_for_current_user
--             )
--         )
--     );
-- create policy "organizations can be updated by owners" on public.organizations for
-- update to authenticated using (
--     (
--         id in (
--             select
--                 supajump.get_organizations_for_current_user ('owner') as get_organizations_for_current_user
--         )
--     )
-- )
-- with
--     check (
--         (
--             id in (
--                 select
--                     supajump.get_organizations_for_current_user ('owner') as get_organizations_for_current_user
--             )
--         )
--     );
-- -- row level security: org_memberships
-- create policy "org members can be deleted by themselves" on public.org_memberships for delete to authenticated using (
--     (
--         (
--             org_id in (
--                 select
--                     supajump.get_organizations_for_current_user () as get_organizations_for_current_user
--             )
--         )
--         and (user_id = auth.uid ())
--     )
-- );
-- create policy "organization users can be deleted by the owner except for the primary owner" on public.org_memberships for delete to authenticated using (
--     (
--         (
--             org_id in (
--                 select
--                     supajump.get_organizations_for_current_user ('owner') as get_organizations_for_current_user
--             )
--         )
--         and (
--             user_id <> (
--                 select
--                     organizations.primary_owner_user_id
--                 from
--                     public.organizations
--                 where
--                     (org_memberships.org_id = organizations.id)
--             )
--         )
--     )
-- );
-- create policy "org_memberships_update_by_organization_owners_and_admins" on public.org_memberships for
-- update using (
--     (
--         (
--             org_id in (
--                 select
--                     supajump.get_organizations_for_current_user ('owner') as get_organizations_for_current_user
--             )
--         )
--         or (
--             (
--                 org_id in (
--                     select
--                         supajump.get_organizations_for_current_user ('admin') as get_organizations_for_current_user
--                 )
--             )
--             and (org_member_role <> 'owner')
--         )
--     )
-- )
-- with
--     check (
--         (
--             (
--                 org_id in (
--                     select
--                         supajump.get_organizations_for_current_user ('owner') as get_organizations_for_current_user
--                 )
--             )
--             or (
--                 org_id in (
--                     select
--                         supajump.get_organizations_for_current_user ('admin') as get_organizations_for_current_user
--                 )
--             )
--         )
--     );
-- create policy "users can view their own org_membershipss" on public.org_memberships for
-- select
--     to authenticated using ((user_id = auth.uid ()));
-- create policy "users can view their teammates" on public.org_memberships for
-- select
--     to authenticated using (
--         (
--             org_id in (
--                 select
--                     supajump.get_organizations_for_current_user () as get_organizations_for_authenticated_user
--             )
--         )
--     );
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
  select om.org_id
  from public.org_memberships om
  join public.roles r on r.id = om.org_member_role
  where om.user_id = auth.uid()
    and r.scope = 'organization'
    and r.name = role_name
$$;

grant
execute on function public.get_organizations_for_current_user_by_role_name (text) to authenticated;