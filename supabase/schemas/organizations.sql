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

drop policy if exists "Users can view other organization members" on public.org_memberships;

create policy "Users can view other organization members" on public.org_memberships for
select
  to authenticated using (
    has_org_permission (org_id, 'org_memberships', 'view')
    or id in (
      select
        org_id
      from
        public.organizations
      where
        primary_owner_user_id = auth.uid ()
    )
  );