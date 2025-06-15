create extension if not exists pg_jsonschema
with
    schema extensions;

create
or replace function is_valid_team_id (input_text text) returns boolean as $$
BEGIN
  RETURN input_text ~ '^[0-9a-z]{5,16}$';
END;
$$ language plpgsql security definer;

/**
 * Invitations are sent to users to join a organization
 * They pre-define the role the user should have once they join
 */
create table
    public.invitations (
        -- the id of the invitation
        id uuid primary key not null default gen_random_uuid (),
        -- what role should invitation accepters be given in this organization (UUID reference to roles table)
        org_member_role uuid not null references roles (id) on delete cascade,
        -- the organization the invitation is for
        org_id text not null references organizations (id) on delete cascade,
        -- unique token used to accept the invitation
        token text unique not null default supajump.generate_token (30),
        -- the email address of the user who created the invitation
        email text,
        -- who created the invitation
        invited_by_user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
        -- organization name. filled in by a trigger
        org_name text,
        updated_at timestamp with time zone,
        created_at timestamp with time zone default now(),
        -- what type of invitation is this
        invitation_type text not null default 'one-time',
        -- team memberships to create when the invitation is accepted
        team_member_roles jsonb
    );

alter table public.invitations
add constraint check_invitation_type check (invitation_type in ('one-time', '24-hour'));

alter table public.invitations enable row level security;

-- ALTER TABLE public.invitations
-- ADD CONSTRAINT team_roles_valid CHECK (
--     extensions.jsonb_matches_schema(
--         schema:='{
--             "type": "array",
--             "items": {
--                 "type": "object",
--                 "required": ["team_id", "team_member_role", "name"],
--                 "properties": {
--                     "team_id": {
--                       "minLength": 5,
--                       "maxLength": 16
--                     },
--                     "team_member_role": {
--                         "type": "string",
--                         "enum": ["member", "admin"]
--                     }
--                     "name": {
--                         "type": "string"
--                     }
--                 }
--             }
--         }',
--         instance:= team_member_roles)
-- );
-- manage timestamps
create trigger set_invitations_timestamp before insert
or
update on public.invitations for each row
execute function supajump.trigger_set_timestamps ();

/**
 * This funciton fills in organization info and inviting user email
 * so that the recipient can get more info about the invitation prior to
 * accepting.  It allows us to avoid complex permissions on organizations
 */
create
or replace function supajump.trigger_set_invitation_details () returns trigger as $$
BEGIN
    NEW.invited_by_user_id = auth.uid();
    NEW.org_name = (select name from public.organizations where id = NEW.org_id);
    RETURN NEW;
END
$$ language plpgsql;

create trigger trigger_set_invitation_details before insert on public.invitations for each row
execute function supajump.trigger_set_invitation_details ();

-- enable RLS on invitations
alter table public.invitations enable row level security;

-- SELECT: Organization owners can see invitations created in the last 24 hours
-- create policy "Invitations viewable by organization owners" on invitations for
-- select
--     to authenticated using (
--         created_at > (now() - interval '48 hours')
--         and (
--             org_id in (
--                 select
--                     grail.get_organizations_for_current_user ('owner') as get_organizations_for_current_user
--             )
--         )
--     );
-- -- INSERT: Organization owners can create invitations
-- create policy "Invitations can be created by organization owners" on invitations for insert to authenticated
-- with
--     check (
--         -- team organizations should be enabled
--         -- N/A Personal organizations are disabled
--         -- grail.is_set('enable_team_organizations') = true
--         -- this should not be a personal organization
--         -- N/A Personal organizations are disabled
--         -- and (SELECT "org_type" FROM public.organizations WHERE id = org_id) = 'organization'
--         -- the inserting user should be an owner of the organization
--         -- and
--         (
--             org_id in (
--                 select
--                     grail.get_organizations_for_current_user ('owner') as get_organizations_for_current_user
--             )
--         )
--     );
-- -- DELETE: Organization owners can delete invitations
-- create policy "Invitations can be deleted by organization owners" on invitations for delete to authenticated using (
--     (
--         org_id in (
--             select
--                 grail.get_organizations_for_current_user ('owner') as get_organizations_for_current_user
--         )
--     )
-- );
-- update accept_invitation to add team_memberships
/**
 * Allows a user to accept an existing invitation and join an organization and teams
 * This one exists in the public schema because we want it to be called
 * using the supabase rpc method
 */
create
or replace function accept_invitation (lookup_invitation_token text) returns text language plpgsql security definer
set
    search_path = public as $$
declare
    v_lookup_org_id text;
    v_new_member_role_id uuid;
    v_team_roles jsonb;
    v_team jsonb;
    v_team_id text;
    v_team_role text;
    new_member_id uuid;
begin
    select org_id, org_member_role, team_member_roles
    into v_lookup_org_id, v_new_member_role_id, v_team_roles
    from invitations
    where token = lookup_invitation_token
      and created_at > now() - interval '24 hours';

    if v_lookup_org_id IS NULL then
        raise exception 'Invitation not found';
    end if;

    if v_lookup_org_id is not null then
        -- we've validated the token is real, so grant the user access
        -- First create the membership
        insert into org_memberships (org_id, user_id)
        values (v_lookup_org_id, auth.uid())
        returning id into new_member_id;

        -- Then assign the role
        insert into org_member_roles (role_id, org_member_id, org_id)
        values (v_new_member_role_id, new_member_id, v_lookup_org_id);

        -- Create team memberships based on the team_roles JSONB column
        if v_team_roles is not null then
            for v_team in select * from jsonb_array_elements(v_team_roles) loop
                v_team_id := (v_team ->> 'team_id');
                v_team_role := v_team ->> 'role';
                insert into team_memberships (team_id, user_id, role)
                values (v_team_id, auth.uid(), v_team_role);
            end loop;
        end if;

        -- email types of invitations are only good for one usage
        delete from invitations where token = lookup_invitation_token;
    end if;

    return v_lookup_org_id;
end;
$$;

grant
execute on function accept_invitation (text) to authenticated;

/**
 * Allows a user to lookup an existing invitation and join a organization
 * This one exists in the public schema because we want it to be called
 * using the supabase rpc method
 */
create type invitation_lookup_result as (
    active boolean,
    name text,
    email text,
    inviter_email text,
    has_account boolean
);

create
or replace function public.lookup_invitation (lookup_invitation_token text) returns invitation_lookup_result language plpgsql security definer
set
    search_path = public as $$
DECLARE
    result invitation_lookup_result;
BEGIN
    SELECT 
        (CASE WHEN i.id IS NOT NULL THEN true ELSE false END)::boolean,
        i.org_name,
        i.email,
        inviter.email,
        EXISTS(SELECT 1 FROM auth.users invited WHERE invited.email = i.email)::boolean
    INTO result
    FROM invitations i
    LEFT JOIN auth.users inviter ON inviter.id = i.invited_by_user_id
    WHERE i.token = lookup_invitation_token
      AND i.created_at > now() - interval '48 hours'
    LIMIT 1;
    
    RETURN result;
END;
$$;

grant
execute on function accept_invitation (text) to authenticated;

grant
execute on function lookup_invitation (text) to authenticated;

-- update create_org_invite to add team_roles
create
or replace function create_org_invite (
    input_org_id text,
    org_member_role_id uuid,
    invitee_email text,
    invitation_type text,
    team_member_roles JSONB
) returns text as $$
DECLARE
    inviter_id UUID;
    inviter_admin BOOLEAN;
    org_active_subscription BOOLEAN;
    invitation_exists BOOLEAN;
    invitee_already_member BOOLEAN;
    result TEXT;
    team jsonb;
    team_id text;
    team_count int;
    owner_role_id uuid;
    admin_role_id uuid;
BEGIN
    -- Input validation for input_org_id
    IF is_valid_org_id(input_org_id) IS NOT TRUE THEN
        RAISE EXCEPTION 'org_id is not valid. Please provide a valid org_id.';
    END IF;

    -- Check if org_id exists in the database
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = input_org_id) THEN
        RAISE EXCEPTION 'org_id does not correspond to an existing organization.';
    END IF;

    -- Validate that the role exists and is an organization role
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = org_member_role_id AND scope = 'organization') THEN
        RAISE EXCEPTION 'Invalid organization role ID';
    END IF;

    -- Get role IDs for admin validation
    owner_role_id := supajump.get_role_id_by_name('owner', 'organization');
    admin_role_id := supajump.get_role_id_by_name('admin', 'organization');

    IF owner_role_id IS NULL OR admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Required organization roles (owner, admin) not found in roles table';
    END IF;

    -- Input validation for invitee_email
    IF NOT (invitee_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
        RAISE EXCEPTION 'Invalid Email';
    END IF;

    -- Retrieve the inviter's user ID using auth.uid()
    inviter_id := auth.uid();

    -- Check if the inviter is a member of the organization with admin or owner role
    SELECT EXISTS (
        SELECT 1
        FROM public.org_memberships om
        JOIN public.org_member_roles omr ON omr.org_member_id = om.id
        WHERE om.user_id = inviter_id
          AND om.org_id = create_org_invite.input_org_id
          AND omr.role_id IN (owner_role_id, admin_role_id)
    ) INTO inviter_admin;

    IF NOT inviter_admin THEN
        raise sqlstate 'PT402' using
          message = 'Insufficient Privileges',
          detail = 'Only admins or owners can invite new members.',
          hint = 'Ask an admin or owner to create the invitation.';
    END IF;

    -- Check if the org has an active subscription
    SELECT EXISTS (
        SELECT 1 FROM billing_subscriptions bs
        WHERE bs.org_id = create_org_invite.input_org_id AND bs.status IN ('active', 'trialing')
    ) INTO org_active_subscription;

    IF NOT org_active_subscription THEN
        raise sqlstate 'PT402' using
          message = 'Active Subscription Required',
          detail = 'This organization does not have an active subscription.',
          hint = 'Upgrade your subscription.';
    END IF;

    -- Check if an invitation already exists for the invited email
    SELECT EXISTS (
        SELECT 1 FROM invitations i
        WHERE i.email = create_org_invite.invitee_email AND i.org_id = create_org_invite.input_org_id
    ) INTO invitation_exists;

    IF invitation_exists THEN
          raise sqlstate 'PT409' using
          message = 'Invitation Exists',
          detail = 'An invitation already exists for this email.',
          hint = 'Delete the existing invitation first.';
    END IF;

    -- Check if the invited email already belongs to a member of the org
    SELECT EXISTS (
        SELECT 1 FROM org_memberships om
        JOIN auth.users au ON om.user_id = au.id
        WHERE au.email = create_org_invite.invitee_email AND om.org_id = create_org_invite.input_org_id
    ) INTO invitee_already_member;

    IF invitee_already_member THEN
      raise sqlstate 'PT409' using
        message = 'Member Already Exists',
        detail = 'A user with this email is already a member of this organization.',
        hint = 'Please use a different email.';
    END IF;

    -- Check if the invited email is a valid email address
    IF NOT (create_org_invite.invitee_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
      raise sqlstate 'PT400' using
        message = 'Invalid Email',
        detail = 'The email address is not valid.',
        hint = 'Try again.';
    END IF;

    -- Check if subscription quota is exceeded
    IF get_org_member_count(create_org_invite.input_org_id) >= get_org_member_quota(create_org_invite.input_org_id) THEN
      raise sqlstate 'PT402' using
        message = 'Insufficient Quota',
        detail = 'The organization member quota has been reached.',
        hint = 'Upgrade your subscription.';
    END IF;

    -- Validate team_roles JSONB
    IF team_member_roles IS NOT NULL THEN
        FOR team IN SELECT * FROM jsonb_array_elements(team_member_roles) LOOP
            team_id := team ->> 'team_id';
            -- Check if the team belongs to the organization
            SELECT COUNT(*) INTO team_count
            FROM teams
            WHERE id = team_id AND org_id = input_org_id;
            IF team_count = 0 THEN
                RAISE EXCEPTION 'Project ID % does not belong to the organization ID %', team_id, input_org_id;
            END IF;
        END LOOP;
    END IF;

    -- All checks passed, create the invitation
    INSERT INTO invitations(org_id, org_member_role, invited_by_user_id, email, invitation_type, team_member_roles)
    VALUES (create_org_invite.input_org_id, org_member_role_id, inviter_id, create_org_invite.invitee_email, create_org_invite.invitation_type, team_member_roles)
    RETURNING token INTO result;

    RETURN result;
END;
$$ language plpgsql security definer;

grant
execute on function create_org_invite (text, uuid, text, text, jsonb) to authenticated;

create
or replace function public.lookup_active_invitations () returns table (
    id uuid,
    org_name text,
    token text,
    invited_by text,
    is_active boolean
) as $$
BEGIN
    -- Assuming email addresses are stored in both the invitations table and the auth.users table
    RETURN QUERY
    SELECT i.id,
           i.org_name,
           i.token,
           p.user_name AS invited_by,
           CASE
               WHEN i.created_at > NOW() - INTERVAL '24 hours' THEN true
               ELSE false
           END AS is_active
    FROM invitations i
    INNER JOIN profiles p ON i.invited_by_user_id = p.id
    INNER JOIN auth.users u ON u.email = i.email -- i.email is the email column in invitations
    WHERE u.id = auth.uid() -- Ensures we're looking at the correct user
      AND i.created_at > NOW() - INTERVAL '24 hours'; -- Filters for active invitations
END;
$$ language plpgsql security definer
set
    search_path = public,
    pg_temp;

grant
execute on function public.lookup_active_invitations () to authenticated;