/**
 * Creating a profile table is a recommended convention for Supabase
 * Any data related to the user can be added here instead of directly
 * on your auth.user table. The email is added here only for information purposes
 * it's needed to let organization members know who's an active member
 * You cannot edit the email directly in the profile, you must change
 * the email of the user using the provided Supabase methods
 */
create table
    public.profiles (
        -- the user's ID from the auth.users table out of supabase
        id uuid unique references auth.users not null,
        -- the user's name
        user_name text unique,
        first_name text,
        last_name text,
        -- when the profile was created
        updated_at timestamp with time zone,
        -- when the profile was last updated
        created_at timestamp with time zone,
        primary key (id)
    );

-- Create the relationship with auth.users so we can do a join query
-- using postgREST
alter table public.org_memberships
add constraint org_memberships_profiles_fkey foreign key (user_id) references profiles (id) match simple on update no action on delete no action;

-- manage timestamps
create trigger set_profiles_timestamp before insert
or
update on public.profiles for each row
execute function supajump.trigger_set_timestamps ();

alter table public.profiles enable row level security;

-- permissions for viewing profiles for user and team members (ideally as two separate policies)
-- add permissions for updating profiles for the user only
-- SELECT: Profiles are viewable by their own user
create policy "Users can view their own profiles" on profiles for
select
    to authenticated using (id = auth.uid ());

-- SELECT: Profiles are viewable by their teammates
create policy "Users can view their teammates profiles" on profiles for
select
    to authenticated using (
        id in (
            select
                org_memberships.user_id
            from
                org_memberships
            where
                (org_memberships.user_id <> auth.uid ())
        )
    );

-- UPDATE: Users can update their own profiles
create policy "Profiles are editable by their own user only" on profiles for
update to authenticated using (id = auth.uid ());

/**
 * We maintain a profile table with users information.
 * We also want to provide an option to automatically create the first organization
 * for a new user.  This is a good way to get folks through the onboarding flow easier
 * potentially
 */
create function supajump.run_new_user_setup () returns trigger language plpgsql security definer
set
    search_path = public as $$
declare
    first_organization_name  text;
    first_org_id    text;
    generated_user_name text;
    owner_role_id uuid;
    new_member_id uuid;
begin

    -- first we setup the user profile
    -- TODO: see if we can get the user's name from the auth.users table once we learn how oauth works
    -- TODO: If no name is provided, use the first part of the email address
    if NEW.email IS NOT NULL then
        generated_user_name := split_part(NEW.email, '@', 1);
    end if;

    insert into public.profiles (id, user_name) values (NEW.id, generated_user_name);

    -- only create the first organization if private organizations is enabled
    if supajump.is_set('enable_personal_organizations') = true then
        -- Get the owner role ID (internal use only)
        select id into owner_role_id
        from roles
        where name = 'owner' and scope = 'organization';

        if owner_role_id is null then
            raise exception 'Owner role not found in roles table';
        end if;

        -- create the new users's personal organization
        insert into public.organizations (primary_owner_user_id, type)
        values (NEW.id, 'personal')
        returning id into first_org_id;

        -- add them to the org_memberships table so they can act on it
        -- First create the membership
        insert into public.org_memberships (org_id, user_id)
        values (first_org_id, NEW.id)
        returning id into new_member_id;

        -- Then assign the owner role
        insert into public.org_member_roles (role_id, org_member_id, org_id)
        values (owner_role_id, new_member_id, first_org_id);
    end if;
    return NEW;
end;
$$;

-- trigger the function every time a user is created
create trigger on_auth_user_created
after insert on auth.users for each row
execute procedure supajump.run_new_user_setup ();

-- create
-- or replace function supajump.run_new_user_setup () returns trigger language plpgsql security definer
-- set
--     search_path to 'public' as $$
-- declare
--   first_organization_name  text;
--   first_org_id    text;
--   generated_user_name text;
--   default_organization_name text := 'Default';
--   owner_role_id uuid;
-- begin
--   -- first we setup the user profile
--   -- TODO: see if we can get the user's name from the auth.users table once we learn how oauth works
--   -- TODO: If no name is provided, use the first part of the email address
--   if NEW.email IS NOT NULL then
--     generated_user_name := split_part(NEW.email, '@', 1);
--   end if;
--     -- Check if generated_user_name is NULL or empty and assign default_organization_name if it is
--   if generated_user_name IS NULL or generated_user_name = '' then
--     generated_user_name := default_organization_name;
--   end if;
--   -- Get the owner role ID using helper function (internal use only)
--   owner_role_id := supajump.get_role_id_by_name('owner', 'organization');
--   if owner_role_id is null then
--     raise exception 'Owner role not found in roles table';
--   end if;
--   insert into public.profiles (id, user_name) values (NEW.id, generated_user_name);
--   -- only create the first organization if private organizations is enabled
--   -- if supajump.is_set('enable_personal_organizations') = true then
--   -- create the new users's personal organization
--   insert into public.organizations (primary_owner_user_id, type, name)
--   values (NEW.id, 'organization', generated_user_name)
--   returning id into first_org_id;
--   -- add them to the org_memberships table so they can act on it
--   insert into public.org_memberships (org_id, user_id, org_member_role)
--   values (first_org_id, NEW.id, owner_role_id);
--   -- end if;
--   return NEW;
-- end;
-- $$;
-- revoke all on function supajump.run_new_user_setup ()
-- from
--     public;
-- grant all on function supajump.run_new_user_setup () to authenticated;