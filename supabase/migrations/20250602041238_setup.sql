create extension if not exists "http" with schema "extensions";

create extension if not exists "pg_jsonschema" with schema "extensions";

create extension if not exists "pgtap" with schema "extensions";


create table "public"."billing_customers" (
    "org_id" text not null,
    "customer_id" text,
    "email" text,
    "active" boolean,
    "provider" text
);


alter table "public"."billing_customers" enable row level security;

create table "public"."billing_prices" (
    "id" text not null,
    "billing_product_id" text,
    "active" boolean,
    "description" text,
    "unit_amount" bigint,
    "currency" text,
    "type" text,
    "interval" text,
    "interval_count" integer,
    "trial_period_days" integer,
    "metadata" jsonb,
    "provider" text
);


alter table "public"."billing_prices" enable row level security;

create table "public"."billing_products" (
    "id" text not null,
    "active" boolean,
    "name" text,
    "description" text,
    "image" text,
    "metadata" jsonb,
    "provider" text
);


alter table "public"."billing_products" enable row level security;

create table "public"."billing_subscriptions" (
    "id" text not null,
    "org_id" text not null,
    "status" text,
    "metadata" jsonb,
    "price_id" text,
    "quantity" integer,
    "cancel_at_period_end" boolean,
    "created" timestamp with time zone not null default timezone('utc'::text, now()),
    "current_period_start" timestamp with time zone not null default timezone('utc'::text, now()),
    "current_period_end" timestamp with time zone not null default timezone('utc'::text, now()),
    "ended_at" timestamp with time zone default timezone('utc'::text, now()),
    "cancel_at" timestamp with time zone default timezone('utc'::text, now()),
    "canceled_at" timestamp with time zone default timezone('utc'::text, now()),
    "trial_start" timestamp with time zone default timezone('utc'::text, now()),
    "trial_end" timestamp with time zone default timezone('utc'::text, now()),
    "provider" text,
    "max_users" integer default 1,
    "max_teams" integer default 2,
    "max_projects" integer default 2,
    "max_storage" integer default 10
);


alter table "public"."billing_subscriptions" enable row level security;

create table "public"."invitations" (
    "id" uuid not null default gen_random_uuid(),
    "org_member_role" uuid not null,
    "org_id" text not null,
    "token" text not null default supajump.generate_token(30),
    "email" text,
    "invited_by_user_id" uuid not null default auth.uid(),
    "org_name" text,
    "updated_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "invitation_type" text not null default 'one-time'::text,
    "project_member_roles" jsonb
);


alter table "public"."invitations" enable row level security;

create table "public"."org_memberships" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone,
    "user_id" uuid not null,
    "org_id" text not null,
    "org_member_role" uuid not null
);


alter table "public"."org_memberships" enable row level security;

create table "public"."organizations" (
    "id" text not null default nanoid(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone,
    "primary_owner_user_id" uuid default auth.uid(),
    "name" text not null,
    "type" text default 'organization'::text,
    "slug" text
);


alter table "public"."organizations" enable row level security;

create table "public"."posts" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone,
    "slug" text,
    "title" text,
    "content" text,
    "post_status" text not null default 'draft'::text,
    "post_type" text not null default 'post'::text,
    "org_id" text not null,
    "team_id" text not null
);


alter table "public"."posts" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "user_name" text,
    "first_name" text,
    "last_name" text,
    "updated_at" timestamp with time zone,
    "created_at" timestamp with time zone
);


alter table "public"."profiles" enable row level security;

create table "public"."role_permissions" (
    "role_id" uuid not null,
    "resource" text not null,
    "action" text not null
);


alter table "public"."role_permissions" enable row level security;

create table "public"."roles" (
    "id" uuid not null default gen_random_uuid(),
    "scope" text not null,
    "name" text not null,
    "display_name" text,
    "description" text
);


alter table "public"."roles" enable row level security;

create table "public"."team_memberships" (
    "id" uuid not null default uuid_generate_v4(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone,
    "team_id" text not null,
    "user_id" uuid not null,
    "team_member_role" uuid not null
);


alter table "public"."team_memberships" enable row level security;

create table "public"."teams" (
    "id" text not null default nanoid(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone,
    "org_id" text not null,
    "primary_owner_user_id" uuid not null,
    "name" text not null
);


alter table "public"."teams" enable row level security;

CREATE UNIQUE INDEX billing_customers_pkey ON public.billing_customers USING btree (org_id);

CREATE UNIQUE INDEX billing_prices_pkey ON public.billing_prices USING btree (id);

CREATE UNIQUE INDEX billing_products_pkey ON public.billing_products USING btree (id);

CREATE UNIQUE INDEX billing_subscriptions_pkey ON public.billing_subscriptions USING btree (id);

CREATE UNIQUE INDEX invitations_pkey ON public.invitations USING btree (id);

CREATE UNIQUE INDEX invitations_token_key ON public.invitations USING btree (token);

CREATE UNIQUE INDEX org_memberships_org_user_unique ON public.org_memberships USING btree (org_id, user_id);

CREATE UNIQUE INDEX org_memberships_pkey ON public.org_memberships USING btree (id);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);

CREATE UNIQUE INDEX posts_pkey ON public.posts USING btree (id);

CREATE INDEX posts_slug_idx ON public.posts USING btree (slug);

CREATE INDEX posts_team_id_idx ON public.posts USING btree (team_id);

CREATE UNIQUE INDEX posts_team_id_slug_key ON public.posts USING btree (team_id, slug);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_user_name_key ON public.profiles USING btree (user_name);

CREATE UNIQUE INDEX role_permissions_pkey ON public.role_permissions USING btree (role_id, resource, action);

CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id);

CREATE UNIQUE INDEX roles_scope_name_key ON public.roles USING btree (scope, name);

CREATE UNIQUE INDEX team_memberships_pkey ON public.team_memberships USING btree (id);

CREATE UNIQUE INDEX team_memberships_team_id_user_id_key ON public.team_memberships USING btree (team_id, user_id);

CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (id);

alter table "public"."billing_customers" add constraint "billing_customers_pkey" PRIMARY KEY using index "billing_customers_pkey";

alter table "public"."billing_prices" add constraint "billing_prices_pkey" PRIMARY KEY using index "billing_prices_pkey";

alter table "public"."billing_products" add constraint "billing_products_pkey" PRIMARY KEY using index "billing_products_pkey";

alter table "public"."billing_subscriptions" add constraint "billing_subscriptions_pkey" PRIMARY KEY using index "billing_subscriptions_pkey";

alter table "public"."invitations" add constraint "invitations_pkey" PRIMARY KEY using index "invitations_pkey";

alter table "public"."org_memberships" add constraint "org_memberships_pkey" PRIMARY KEY using index "org_memberships_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."posts" add constraint "posts_pkey" PRIMARY KEY using index "posts_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."role_permissions" add constraint "role_permissions_pkey" PRIMARY KEY using index "role_permissions_pkey";

alter table "public"."roles" add constraint "roles_pkey" PRIMARY KEY using index "roles_pkey";

alter table "public"."team_memberships" add constraint "team_memberships_pkey" PRIMARY KEY using index "team_memberships_pkey";

alter table "public"."teams" add constraint "teams_pkey" PRIMARY KEY using index "teams_pkey";

alter table "public"."billing_customers" add constraint "billing_customers_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) not valid;

alter table "public"."billing_customers" validate constraint "billing_customers_org_id_fkey";

alter table "public"."billing_customers" add constraint "check_provider" CHECK ((provider = 'stripe'::text)) not valid;

alter table "public"."billing_customers" validate constraint "check_provider";

alter table "public"."billing_prices" add constraint "billing_prices_billing_product_id_fkey" FOREIGN KEY (billing_product_id) REFERENCES billing_products(id) not valid;

alter table "public"."billing_prices" validate constraint "billing_prices_billing_product_id_fkey";

alter table "public"."billing_prices" add constraint "billing_prices_currency_check" CHECK ((char_length(currency) = 3)) not valid;

alter table "public"."billing_prices" validate constraint "billing_prices_currency_check";

alter table "public"."billing_prices" add constraint "check_interval" CHECK (("interval" = ANY (ARRAY['day'::text, 'week'::text, 'month'::text, 'year'::text]))) not valid;

alter table "public"."billing_prices" validate constraint "check_interval";

alter table "public"."billing_prices" add constraint "check_provider" CHECK ((provider = 'stripe'::text)) not valid;

alter table "public"."billing_prices" validate constraint "check_provider";

alter table "public"."billing_prices" add constraint "check_type" CHECK ((type = ANY (ARRAY['one_time'::text, 'recurring'::text]))) not valid;

alter table "public"."billing_prices" validate constraint "check_type";

alter table "public"."billing_products" add constraint "check_provider" CHECK ((provider = 'stripe'::text)) not valid;

alter table "public"."billing_products" validate constraint "check_provider";

alter table "public"."billing_subscriptions" add constraint "billing_subscriptions_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) not valid;

alter table "public"."billing_subscriptions" validate constraint "billing_subscriptions_org_id_fkey";

alter table "public"."billing_subscriptions" add constraint "billing_subscriptions_price_id_fkey" FOREIGN KEY (price_id) REFERENCES billing_prices(id) not valid;

alter table "public"."billing_subscriptions" validate constraint "billing_subscriptions_price_id_fkey";

alter table "public"."billing_subscriptions" add constraint "check_provider" CHECK ((provider = 'stripe'::text)) not valid;

alter table "public"."billing_subscriptions" validate constraint "check_provider";

alter table "public"."billing_subscriptions" add constraint "check_status" CHECK ((status = ANY (ARRAY['trialing'::text, 'active'::text, 'canceled'::text, 'incomplete'::text, 'incomplete_expired'::text, 'past_due'::text, 'unpaid'::text, 'paused'::text]))) not valid;

alter table "public"."billing_subscriptions" validate constraint "check_status";

alter table "public"."invitations" add constraint "check_invitation_type" CHECK ((invitation_type = ANY (ARRAY['one-time'::text, '24-hour'::text]))) not valid;

alter table "public"."invitations" validate constraint "check_invitation_type";

alter table "public"."invitations" add constraint "invitations_invited_by_user_id_fkey" FOREIGN KEY (invited_by_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."invitations" validate constraint "invitations_invited_by_user_id_fkey";

alter table "public"."invitations" add constraint "invitations_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."invitations" validate constraint "invitations_org_id_fkey";

alter table "public"."invitations" add constraint "invitations_org_member_role_fkey" FOREIGN KEY (org_member_role) REFERENCES roles(id) ON DELETE CASCADE not valid;

alter table "public"."invitations" validate constraint "invitations_org_member_role_fkey";

alter table "public"."invitations" add constraint "invitations_token_key" UNIQUE using index "invitations_token_key";

alter table "public"."org_memberships" add constraint "org_memberships_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_memberships" validate constraint "org_memberships_org_id_fkey";

alter table "public"."org_memberships" add constraint "org_memberships_org_member_role_fkey" FOREIGN KEY (org_member_role) REFERENCES roles(id) ON DELETE CASCADE not valid;

alter table "public"."org_memberships" validate constraint "org_memberships_org_member_role_fkey";

alter table "public"."org_memberships" add constraint "org_memberships_org_user_unique" UNIQUE using index "org_memberships_org_user_unique";

alter table "public"."org_memberships" add constraint "org_memberships_profiles_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) not valid;

alter table "public"."org_memberships" validate constraint "org_memberships_profiles_fkey";

alter table "public"."org_memberships" add constraint "org_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."org_memberships" validate constraint "org_memberships_user_id_fkey";

alter table "public"."organizations" add constraint "organizations_primary_owner_user_id_fkey" FOREIGN KEY (primary_owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."organizations" validate constraint "organizations_primary_owner_user_id_fkey";

alter table "public"."organizations" add constraint "organizations_slug_key" UNIQUE using index "organizations_slug_key";

alter table "public"."organizations" add constraint "organizations_type_check" CHECK ((type = ANY (ARRAY['super'::text, 'organization'::text, 'personal'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_type_check";

alter table "public"."posts" add constraint "posts_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."posts" validate constraint "posts_org_id_fkey";

alter table "public"."posts" add constraint "posts_status_check" CHECK ((post_status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))) not valid;

alter table "public"."posts" validate constraint "posts_status_check";

alter table "public"."posts" add constraint "posts_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE not valid;

alter table "public"."posts" validate constraint "posts_team_id_fkey";

alter table "public"."posts" add constraint "posts_team_id_slug_key" UNIQUE using index "posts_team_id_slug_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_name_key" UNIQUE using index "profiles_user_name_key";

alter table "public"."role_permissions" add constraint "role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE not valid;

alter table "public"."role_permissions" validate constraint "role_permissions_role_id_fkey";

alter table "public"."roles" add constraint "roles_scope_check" CHECK ((scope = ANY (ARRAY['organization'::text, 'team'::text]))) not valid;

alter table "public"."roles" validate constraint "roles_scope_check";

alter table "public"."roles" add constraint "roles_scope_name_key" UNIQUE using index "roles_scope_name_key";

alter table "public"."team_memberships" add constraint "team_memberships_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE not valid;

alter table "public"."team_memberships" validate constraint "team_memberships_team_id_fkey";

alter table "public"."team_memberships" add constraint "team_memberships_team_id_user_id_key" UNIQUE using index "team_memberships_team_id_user_id_key";

alter table "public"."team_memberships" add constraint "team_memberships_team_member_role_fkey" FOREIGN KEY (team_member_role) REFERENCES roles(id) ON DELETE CASCADE not valid;

alter table "public"."team_memberships" validate constraint "team_memberships_team_member_role_fkey";

alter table "public"."team_memberships" add constraint "team_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."team_memberships" validate constraint "team_memberships_user_id_fkey";

alter table "public"."teams" add constraint "teams_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."teams" validate constraint "teams_org_id_fkey";

alter table "public"."teams" add constraint "teams_primary_owner_user_id_fkey" FOREIGN KEY (primary_owner_user_id) REFERENCES auth.users(id) not valid;

alter table "public"."teams" validate constraint "teams_primary_owner_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.accept_invitation(lookup_invitation_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_lookup_org_id text;
    v_new_member_role_id uuid;
    v_project_roles jsonb;
    v_project jsonb;
    v_project_id text;
    v_project_role text;
begin
    select org_id, org_member_role, project_member_roles
    into v_lookup_org_id, v_new_member_role_id, v_project_roles
    from invitations
    where token = lookup_invitation_token
      and created_at > now() - interval '24 hours';

    if v_lookup_org_id IS NULL then
        raise exception 'Invitation not found';
    end if;

    if v_lookup_org_id is not null then
        -- we've validated the token is real, so grant the user access
        insert into org_memberships (org_id, user_id, org_member_role)
        values (v_lookup_org_id, auth.uid(), v_new_member_role_id);

        -- Create project memberships based on the project_roles JSONB column
        if v_project_roles is not null then
            for v_project in select * from jsonb_array_elements(v_project_roles) loop
                v_project_id := (v_project ->> 'project_id');
                v_project_role := v_project ->> 'role';
                insert into project_memberships (project_id, user_id, role)
                values (v_project_id, auth.uid(), v_project_role);
            end loop;
        end if;

        -- email types of invitations are only good for one usage
        delete from invitations where token = lookup_invitation_token;
    end if;

    return v_lookup_org_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_org_invite(input_org_id text, org_member_role_id uuid, invitee_email text, invitation_type text, project_member_roles jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    inviter_id UUID;
    inviter_admin BOOLEAN;
    org_active_subscription BOOLEAN;
    invitation_exists BOOLEAN;
    invitee_already_member BOOLEAN;
    result TEXT;
    project jsonb;
    project_id text;
    project_count int;
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
        WHERE om.user_id = inviter_id
          AND om.org_id = create_org_invite.input_org_id
          AND om.org_member_role IN (owner_role_id, admin_role_id)
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

    -- Validate project_roles JSONB
    IF project_member_roles IS NOT NULL THEN
        FOR project IN SELECT * FROM jsonb_array_elements(project_member_roles) LOOP
            project_id := project ->> 'project_id';
            -- Check if the project belongs to the organization
            SELECT COUNT(*) INTO project_count
            FROM projects
            WHERE id = project_id AND org_id = input_org_id;
            IF project_count = 0 THEN
                RAISE EXCEPTION 'Project ID % does not belong to the organization ID %', project_id, input_org_id;
            END IF;
        END LOOP;
    END IF;

    -- All checks passed, create the invitation
    INSERT INTO invitations(org_id, org_member_role, invited_by_user_id, email, invitation_type, project_member_roles)
    VALUES (create_org_invite.input_org_id, org_member_role_id, inviter_id, create_org_invite.invitee_email, create_org_invite.invitation_type, project_member_roles)
    RETURNING token INTO result;

    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_organization(name text, type text DEFAULT 'organization'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_org_member_role(lookup_org_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_teams_member_role(lookup_team_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
  declare
    user_teams_member_role_id uuid;
    user_teams_member_role_name text;
    is_team_primary_owner boolean;
    is_type boolean;
  begin
    if lookup_team_id is null then
      -- return an error
      raise exception 'team_id is required';
    end if;

    select tm.team_member_role, r.name
    into user_teams_member_role_id, user_teams_member_role_name
    from public.team_memberships tm
    join public.roles r on r.id = tm.team_member_role
    where tm.user_id = auth.uid() and tm.team_id = lookup_team_id;

    select primary_owner_user_id = auth.uid() into is_team_primary_owner from public.teams where id = lookup_team_id;

    if user_teams_member_role_id is null then
      return null;
    end if;

    return jsonb_build_object(
      'teams_member_role_id', user_teams_member_role_id,
      'teams_member_role', user_teams_member_role_name,
      'is_primary_owner', is_team_primary_owner
    );
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_org_member_count(org_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    member_count integer;
begin
    select count(*)
    into member_count
    from public.org_memberships
    where org_memberships.org_id = get_org_member_count.org_id;

    return member_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_org_member_quota(org_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    quota integer := 10; -- default quota
begin
    -- for now, return a default quota of 10 members per organization
    -- this can be enhanced later to check subscription plans
    -- select quota into quota from billing_subscriptions where org_id = get_org_member_quota.org_id;

    return quota;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_org_role_id(role_name text)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id
  from roles
  where name = role_name and scope = 'organization'
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.get_organization_billing_status(lookup_org_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    result RECORD;
BEGIN
    select s.id,
           s.status,
           c.email as billing_email,
           p.name  as plan_name
    from billing_subscriptions s
             join billing_prices pr on pr.id = s.price_id
             join billing_products p on p.id = pr.billing_product_id
             join billing_customers c on c.org_id = s.org_id
    where s.org_id = lookup_org_id
    order by s.created desc
    limit 1
    into result;

    if result is null then
        raise 'No billing data found for organization %', lookup_org_id;
    end if;

    return row_to_json(result);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_organizations_for_current_user_by_role_name(role_name text)
 RETURNS SETOF text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select om.org_id
  from public.org_memberships om
  join public.roles r on r.id = om.org_member_role
  where om.user_id = auth.uid()
    and r.scope = 'organization'
    and r.name = role_name
$function$
;

CREATE OR REPLACE FUNCTION public.get_team_role_id(role_name text)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id
  from roles
  where name = role_name and scope = 'team'
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.get_teams_for_current_user_by_role_name(role_name text)
 RETURNS SETOF text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select tm.team_id
  from public.team_memberships tm
  join public.roles r on r.id = tm.team_member_role
  where tm.user_id = auth.uid()
    and r.scope = 'team'
    and r.name = role_name
$function$
;

CREATE OR REPLACE FUNCTION public.has_org_permission(_org_id text, _resource text, _action text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from   org_memberships om
    join   role_permissions rp on rp.role_id = om.org_member_role
    where  om.org_id          = _org_id
      and  om.user_id         = auth.uid()
      and  rp.resource        = _resource
      and  rp.action          = _action
  );
$function$
;

CREATE OR REPLACE FUNCTION public.has_team_permission(_team_id text, _resource text, _action text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from   team_memberships tm
    join   role_permissions rp on rp.role_id = tm.team_member_role
    where  tm.team_id      = _team_id
      and  tm.user_id         = auth.uid()
      and  rp.resource        = _resource
      and  rp.action          = _action
  );
$function$
;

CREATE OR REPLACE FUNCTION public.increment_rank_order(rank_val text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
    valid_chars constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    idx         int;
    prefix      text;
    last_char   text;
begin
    -- if rank_val is empty, seed with "a0" or something you like
    if rank_val = '' then
        return 'a0';
    end if;

    last_char := right(rank_val, 1);

    -- find the position (1-based) of the last character within valid_chars.
    -- we'll subtract 1 from that to make it 0-based for easier logic.
    idx := strpos(valid_chars, last_char) - 1;

    if idx = -1 then
        ----------------------------------------------------------------------
        -- last_char was not in valid_chars at all
        -- fallback: just append '0' or first valid char
        ----------------------------------------------------------------------
        return rank_val || '0';
    elsif idx < length(valid_chars) - 1 then
        ----------------------------------------------------------------------
        -- we can increment within the valid_chars range
        -- e.g., if last_char = 'z' (position 35 in a 0-based index),
        -- next char is 'a' (position 36).
        ----------------------------------------------------------------------
        prefix := left(rank_val, length(rank_val) - 1);
        return prefix || substr(valid_chars, idx + 2, 1);
    else
        ----------------------------------------------------------------------
        -- last_char is the highest valid character (e.g., 'z' in base62).
        -- we'll keep it the same and append '0' or the first valid character.
        ----------------------------------------------------------------------
        return rank_val || '0';
    end if;
end;
$function$
;

create type "public"."invitation_lookup_result" as ("active" boolean, "name" text, "email" text, "inviter_email" text, "has_account" boolean);

CREATE OR REPLACE FUNCTION public.is_valid_org_id(input_text text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return input_text ~ '^[0-9a-z]{16}$';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_valid_project_id(input_text text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN input_text ~ '^[0-9a-z]{5,16}$';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_valid_team_id(input_text text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return input_text ~ '^[0-9a-z]{16}$';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_valid_team_name(input_text text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Check if the team name is between 1 and 60 characters and contains only alphanumeric characters, hyphens, underscores, and spaces
  return input_text is not null
    and length(input_text) >= 1
    and length(input_text) <= 60
    and input_text ~ '^[a-zA-Z0-9\s_-]+$';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.lookup_active_invitations()
 RETURNS TABLE(id uuid, org_name text, token text, invited_by text, is_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.lookup_invitation(lookup_invitation_token text)
 RETURNS invitation_lookup_result
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nanoid(size integer DEFAULT 16, alphabet text DEFAULT '0123456789abcdefghijklmnopqrstuvwxyz'::text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
    idbuilder      text := '';
    counter        int  := 0;
    bytes          bytea;
    alphabetindex  int;
    alphabetarray  text[];
    alphabetlength int;
    mask           int;
    step           int;
begin
    alphabetarray := regexp_split_to_array(alphabet, '');
    alphabetlength := array_length(alphabetarray, 1);
    mask := (2 << cast(floor(log(alphabetlength - 1) / log(2)) as int)) - 1;
    step := cast(ceil(1.6 * mask * size / alphabetlength) as int);

    while true
        loop
            bytes := extensions.gen_random_bytes(step);
            while counter < step
                loop
                    alphabetindex := (get_byte(bytes, counter) & mask) + 1;
                    if alphabetindex <= alphabetlength then
                        idbuilder := idbuilder || alphabetarray[alphabetindex];
                        if length(idbuilder) = size then
                            return idbuilder;
                        end if;
                    end if;
                    counter := counter + 1;
                end loop;

            counter := 0;
        end loop;
end
$function$
;

CREATE OR REPLACE FUNCTION public.protect_organization_fields()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
 $function$
;

CREATE OR REPLACE FUNCTION public.protect_team_fields()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
 $function$
;

CREATE OR REPLACE FUNCTION public.set_default_rank_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    last_rank       text;
    rank_order_col  text := tg_argv[0];  -- e.g., 'rank_order'
    grouping_col    text := tg_argv[1];  -- e.g., 'import_schema_id'
    table_name      text := tg_table_name;
    grouping_val    text;
    records_exist   boolean;
begin
    -------------------------------------------------------------------------
    -- 1) Safety-check: only allow 'rank_order'
    -------------------------------------------------------------------------
    if rank_order_col != 'rank_order' then
        raise exception 'This trigger only supports column name "rank_order"';
    end if;

    -------------------------------------------------------------------------
    -- 2) If NEW.rank_order is already set (non-null & non-empty), just return
    -------------------------------------------------------------------------
    if coalesce(new.rank_order, '') <> '' then
        return new;
    end if;

    -------------------------------------------------------------------------
    -- 3) Dynamically fetch the grouping_col from NEW
    --    (e.g., NEW.import_schema_id -> grouping_val)
    -------------------------------------------------------------------------
    execute format('SELECT ($1).%I::text', grouping_col)
       into grouping_val
       using new;

    if grouping_val is null then
        raise exception 'Column "%" cannot be NULL for rank ordering',
                        grouping_col;
    end if;

    -------------------------------------------------------------------------
    -- 4) Check if there are any rows in this table for that group
    -------------------------------------------------------------------------
    execute format('
        SELECT EXISTS (
            SELECT 1
            FROM %I
            WHERE %I = $1::uuid
        )
    ', table_name, grouping_col)
    into records_exist
    using grouping_val;

    if not records_exist then
        ---------------------------------------------------------------------
        -- 4a) If it's the first row in the group, seed rank_order with "a0"
        ---------------------------------------------------------------------
        NEW.rank_order := 'a0';
    else
        ---------------------------------------------------------------------
        -- 4b) otherwise, find the highest rank in that group
        ---------------------------------------------------------------------
        execute format('
            select %i
            from %i
            where %i = $1::uuid
            order by %i desc
            limit 1
        ', rank_order_col, table_name, grouping_col, rank_order_col)
        into last_rank
        using grouping_val;

        if coalesce(last_rank, '') = '' then
            new.rank_order := 'a0';
        else
            -- for a "fractional" ordering approach, increment the last rank
            new.rank_order := increment_rank_order(last_rank);
        end if;
    end if;

    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.slugify(text)
 RETURNS text
 LANGUAGE sql
AS $function$
    select replace(replace($1, ' ', '-'), '[^a-z0-9-]', '')
$function$
;

CREATE OR REPLACE FUNCTION public.update_org_memberships_role(org_id text, user_id uuid, new_org_member_role_id uuid, make_primary_owner boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_team_memberships_role(team_id text, user_id uuid, new_teams_member_role_id uuid, make_primary_owner boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  declare
    is_team_owner boolean;
    is_team_primary_owner boolean;
    changing_primary_owner boolean;
    owner_role_id uuid;
  begin
    -- Get owner role ID for validation
    owner_role_id := supajump.get_role_id_by_name('owner', 'team');

    if owner_role_id is null then
      raise exception 'Team owner role not found in roles table';
    end if;

    -- Validate that the new role exists and is a team role
    if not exists (select 1 from roles where id = new_teams_member_role_id and scope = 'team') then
      raise exception 'Invalid team role ID';
    end if;

    -- check if the user is an owner, and if they are, allow them to update the role
    select exists(
      select 1 from public.team_memberships tm
      where tm.user_id = auth.uid() 
        and tm.team_id = update_team_memberships_role.team_id
        and tm.team_member_role = owner_role_id
    ) into is_team_owner;

    if not is_team_owner then
      raise exception 'you must be an owner of the team to update a users role';
    end if;

    -- check if the user being changed is the primary owner, if so its not allowed
    select primary_owner_user_id = auth.uid(), primary_owner_user_id = update_team_memberships_role.user_id into is_team_primary_owner, changing_primary_owner from public.teams where id = update_team_memberships_role.team_id;

    if changing_primary_owner = true and is_team_primary_owner = false then
      raise exception 'you must be the primary owner of the team to change the primary owner';
    end if;

    update public.team_memberships set team_member_role = new_teams_member_role_id where team_memberships.team_id = update_team_memberships_role.team_id and team_memberships.user_id = update_team_memberships_role.user_id;

    if make_primary_owner = true then
      -- first we see if the current user is the owner, only they can do this
      if is_team_primary_owner = false then
        raise exception 'you must be the primary owner of the team to change the primary owner';
      end if;

      update public.teams set primary_owner_user_id = update_team_memberships_role.user_id where id = update_team_memberships_role.team_id;
    end if;
  end;
$function$
;

grant delete on table "public"."billing_customers" to "anon";

grant insert on table "public"."billing_customers" to "anon";

grant references on table "public"."billing_customers" to "anon";

grant select on table "public"."billing_customers" to "anon";

grant trigger on table "public"."billing_customers" to "anon";

grant truncate on table "public"."billing_customers" to "anon";

grant update on table "public"."billing_customers" to "anon";

grant delete on table "public"."billing_customers" to "authenticated";

grant insert on table "public"."billing_customers" to "authenticated";

grant references on table "public"."billing_customers" to "authenticated";

grant select on table "public"."billing_customers" to "authenticated";

grant trigger on table "public"."billing_customers" to "authenticated";

grant truncate on table "public"."billing_customers" to "authenticated";

grant update on table "public"."billing_customers" to "authenticated";

grant delete on table "public"."billing_customers" to "service_role";

grant insert on table "public"."billing_customers" to "service_role";

grant references on table "public"."billing_customers" to "service_role";

grant select on table "public"."billing_customers" to "service_role";

grant trigger on table "public"."billing_customers" to "service_role";

grant truncate on table "public"."billing_customers" to "service_role";

grant update on table "public"."billing_customers" to "service_role";

grant delete on table "public"."billing_prices" to "anon";

grant insert on table "public"."billing_prices" to "anon";

grant references on table "public"."billing_prices" to "anon";

grant select on table "public"."billing_prices" to "anon";

grant trigger on table "public"."billing_prices" to "anon";

grant truncate on table "public"."billing_prices" to "anon";

grant update on table "public"."billing_prices" to "anon";

grant delete on table "public"."billing_prices" to "authenticated";

grant insert on table "public"."billing_prices" to "authenticated";

grant references on table "public"."billing_prices" to "authenticated";

grant select on table "public"."billing_prices" to "authenticated";

grant trigger on table "public"."billing_prices" to "authenticated";

grant truncate on table "public"."billing_prices" to "authenticated";

grant update on table "public"."billing_prices" to "authenticated";

grant delete on table "public"."billing_prices" to "service_role";

grant insert on table "public"."billing_prices" to "service_role";

grant references on table "public"."billing_prices" to "service_role";

grant select on table "public"."billing_prices" to "service_role";

grant trigger on table "public"."billing_prices" to "service_role";

grant truncate on table "public"."billing_prices" to "service_role";

grant update on table "public"."billing_prices" to "service_role";

grant delete on table "public"."billing_products" to "anon";

grant insert on table "public"."billing_products" to "anon";

grant references on table "public"."billing_products" to "anon";

grant select on table "public"."billing_products" to "anon";

grant trigger on table "public"."billing_products" to "anon";

grant truncate on table "public"."billing_products" to "anon";

grant update on table "public"."billing_products" to "anon";

grant delete on table "public"."billing_products" to "authenticated";

grant insert on table "public"."billing_products" to "authenticated";

grant references on table "public"."billing_products" to "authenticated";

grant select on table "public"."billing_products" to "authenticated";

grant trigger on table "public"."billing_products" to "authenticated";

grant truncate on table "public"."billing_products" to "authenticated";

grant update on table "public"."billing_products" to "authenticated";

grant delete on table "public"."billing_products" to "service_role";

grant insert on table "public"."billing_products" to "service_role";

grant references on table "public"."billing_products" to "service_role";

grant select on table "public"."billing_products" to "service_role";

grant trigger on table "public"."billing_products" to "service_role";

grant truncate on table "public"."billing_products" to "service_role";

grant update on table "public"."billing_products" to "service_role";

grant delete on table "public"."billing_subscriptions" to "anon";

grant insert on table "public"."billing_subscriptions" to "anon";

grant references on table "public"."billing_subscriptions" to "anon";

grant select on table "public"."billing_subscriptions" to "anon";

grant trigger on table "public"."billing_subscriptions" to "anon";

grant truncate on table "public"."billing_subscriptions" to "anon";

grant update on table "public"."billing_subscriptions" to "anon";

grant delete on table "public"."billing_subscriptions" to "authenticated";

grant insert on table "public"."billing_subscriptions" to "authenticated";

grant references on table "public"."billing_subscriptions" to "authenticated";

grant select on table "public"."billing_subscriptions" to "authenticated";

grant trigger on table "public"."billing_subscriptions" to "authenticated";

grant truncate on table "public"."billing_subscriptions" to "authenticated";

grant update on table "public"."billing_subscriptions" to "authenticated";

grant delete on table "public"."billing_subscriptions" to "service_role";

grant insert on table "public"."billing_subscriptions" to "service_role";

grant references on table "public"."billing_subscriptions" to "service_role";

grant select on table "public"."billing_subscriptions" to "service_role";

grant trigger on table "public"."billing_subscriptions" to "service_role";

grant truncate on table "public"."billing_subscriptions" to "service_role";

grant update on table "public"."billing_subscriptions" to "service_role";

grant delete on table "public"."invitations" to "anon";

grant insert on table "public"."invitations" to "anon";

grant references on table "public"."invitations" to "anon";

grant select on table "public"."invitations" to "anon";

grant trigger on table "public"."invitations" to "anon";

grant truncate on table "public"."invitations" to "anon";

grant update on table "public"."invitations" to "anon";

grant delete on table "public"."invitations" to "authenticated";

grant insert on table "public"."invitations" to "authenticated";

grant references on table "public"."invitations" to "authenticated";

grant select on table "public"."invitations" to "authenticated";

grant trigger on table "public"."invitations" to "authenticated";

grant truncate on table "public"."invitations" to "authenticated";

grant update on table "public"."invitations" to "authenticated";

grant delete on table "public"."invitations" to "service_role";

grant insert on table "public"."invitations" to "service_role";

grant references on table "public"."invitations" to "service_role";

grant select on table "public"."invitations" to "service_role";

grant trigger on table "public"."invitations" to "service_role";

grant truncate on table "public"."invitations" to "service_role";

grant update on table "public"."invitations" to "service_role";

grant delete on table "public"."org_memberships" to "anon";

grant insert on table "public"."org_memberships" to "anon";

grant references on table "public"."org_memberships" to "anon";

grant select on table "public"."org_memberships" to "anon";

grant trigger on table "public"."org_memberships" to "anon";

grant truncate on table "public"."org_memberships" to "anon";

grant update on table "public"."org_memberships" to "anon";

grant delete on table "public"."org_memberships" to "authenticated";

grant insert on table "public"."org_memberships" to "authenticated";

grant references on table "public"."org_memberships" to "authenticated";

grant select on table "public"."org_memberships" to "authenticated";

grant trigger on table "public"."org_memberships" to "authenticated";

grant truncate on table "public"."org_memberships" to "authenticated";

grant update on table "public"."org_memberships" to "authenticated";

grant delete on table "public"."org_memberships" to "service_role";

grant insert on table "public"."org_memberships" to "service_role";

grant references on table "public"."org_memberships" to "service_role";

grant select on table "public"."org_memberships" to "service_role";

grant trigger on table "public"."org_memberships" to "service_role";

grant truncate on table "public"."org_memberships" to "service_role";

grant update on table "public"."org_memberships" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant references on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";

grant delete on table "public"."posts" to "anon";

grant insert on table "public"."posts" to "anon";

grant references on table "public"."posts" to "anon";

grant select on table "public"."posts" to "anon";

grant trigger on table "public"."posts" to "anon";

grant truncate on table "public"."posts" to "anon";

grant update on table "public"."posts" to "anon";

grant delete on table "public"."posts" to "authenticated";

grant insert on table "public"."posts" to "authenticated";

grant references on table "public"."posts" to "authenticated";

grant select on table "public"."posts" to "authenticated";

grant trigger on table "public"."posts" to "authenticated";

grant truncate on table "public"."posts" to "authenticated";

grant update on table "public"."posts" to "authenticated";

grant delete on table "public"."posts" to "service_role";

grant insert on table "public"."posts" to "service_role";

grant references on table "public"."posts" to "service_role";

grant select on table "public"."posts" to "service_role";

grant trigger on table "public"."posts" to "service_role";

grant truncate on table "public"."posts" to "service_role";

grant update on table "public"."posts" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."role_permissions" to "anon";

grant insert on table "public"."role_permissions" to "anon";

grant references on table "public"."role_permissions" to "anon";

grant select on table "public"."role_permissions" to "anon";

grant trigger on table "public"."role_permissions" to "anon";

grant truncate on table "public"."role_permissions" to "anon";

grant update on table "public"."role_permissions" to "anon";

grant delete on table "public"."role_permissions" to "authenticated";

grant insert on table "public"."role_permissions" to "authenticated";

grant references on table "public"."role_permissions" to "authenticated";

grant select on table "public"."role_permissions" to "authenticated";

grant trigger on table "public"."role_permissions" to "authenticated";

grant truncate on table "public"."role_permissions" to "authenticated";

grant update on table "public"."role_permissions" to "authenticated";

grant delete on table "public"."role_permissions" to "service_role";

grant insert on table "public"."role_permissions" to "service_role";

grant references on table "public"."role_permissions" to "service_role";

grant select on table "public"."role_permissions" to "service_role";

grant trigger on table "public"."role_permissions" to "service_role";

grant truncate on table "public"."role_permissions" to "service_role";

grant update on table "public"."role_permissions" to "service_role";

grant delete on table "public"."roles" to "anon";

grant insert on table "public"."roles" to "anon";

grant references on table "public"."roles" to "anon";

grant select on table "public"."roles" to "anon";

grant trigger on table "public"."roles" to "anon";

grant truncate on table "public"."roles" to "anon";

grant update on table "public"."roles" to "anon";

grant delete on table "public"."roles" to "authenticated";

grant insert on table "public"."roles" to "authenticated";

grant references on table "public"."roles" to "authenticated";

grant select on table "public"."roles" to "authenticated";

grant trigger on table "public"."roles" to "authenticated";

grant truncate on table "public"."roles" to "authenticated";

grant update on table "public"."roles" to "authenticated";

grant delete on table "public"."roles" to "service_role";

grant insert on table "public"."roles" to "service_role";

grant references on table "public"."roles" to "service_role";

grant select on table "public"."roles" to "service_role";

grant trigger on table "public"."roles" to "service_role";

grant truncate on table "public"."roles" to "service_role";

grant update on table "public"."roles" to "service_role";

grant delete on table "public"."team_memberships" to "anon";

grant insert on table "public"."team_memberships" to "anon";

grant references on table "public"."team_memberships" to "anon";

grant select on table "public"."team_memberships" to "anon";

grant trigger on table "public"."team_memberships" to "anon";

grant truncate on table "public"."team_memberships" to "anon";

grant update on table "public"."team_memberships" to "anon";

grant delete on table "public"."team_memberships" to "authenticated";

grant insert on table "public"."team_memberships" to "authenticated";

grant references on table "public"."team_memberships" to "authenticated";

grant select on table "public"."team_memberships" to "authenticated";

grant trigger on table "public"."team_memberships" to "authenticated";

grant truncate on table "public"."team_memberships" to "authenticated";

grant update on table "public"."team_memberships" to "authenticated";

grant delete on table "public"."team_memberships" to "service_role";

grant insert on table "public"."team_memberships" to "service_role";

grant references on table "public"."team_memberships" to "service_role";

grant select on table "public"."team_memberships" to "service_role";

grant trigger on table "public"."team_memberships" to "service_role";

grant truncate on table "public"."team_memberships" to "service_role";

grant update on table "public"."team_memberships" to "service_role";

grant delete on table "public"."teams" to "anon";

grant insert on table "public"."teams" to "anon";

grant references on table "public"."teams" to "anon";

grant select on table "public"."teams" to "anon";

grant trigger on table "public"."teams" to "anon";

grant truncate on table "public"."teams" to "anon";

grant update on table "public"."teams" to "anon";

grant delete on table "public"."teams" to "authenticated";

grant insert on table "public"."teams" to "authenticated";

grant references on table "public"."teams" to "authenticated";

grant select on table "public"."teams" to "authenticated";

grant trigger on table "public"."teams" to "authenticated";

grant truncate on table "public"."teams" to "authenticated";

grant update on table "public"."teams" to "authenticated";

grant delete on table "public"."teams" to "service_role";

grant insert on table "public"."teams" to "service_role";

grant references on table "public"."teams" to "service_role";

grant select on table "public"."teams" to "service_role";

grant trigger on table "public"."teams" to "service_role";

grant truncate on table "public"."teams" to "service_role";

grant update on table "public"."teams" to "service_role";

create policy "Allow public read-only access."
on "public"."billing_prices"
as permissive
for select
to public
using (true);


create policy "Allow public read-only access."
on "public"."billing_products"
as permissive
for select
to public
using (true);


create policy "Profiles are editable by their own user only"
on "public"."profiles"
as permissive
for update
to authenticated
using ((id = auth.uid()));


create policy "Users can view their own profiles"
on "public"."profiles"
as permissive
for select
to authenticated
using ((id = auth.uid()));


create policy "Users can view their teammates profiles"
on "public"."profiles"
as permissive
for select
to authenticated
using ((id IN ( SELECT org_memberships.user_id
   FROM org_memberships
  WHERE (org_memberships.user_id <> auth.uid()))));


CREATE TRIGGER set_invitations_timestamp BEFORE INSERT OR UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION supajump.trigger_set_timestamps();

CREATE TRIGGER trigger_set_invitation_details BEFORE INSERT ON public.invitations FOR EACH ROW EXECUTE FUNCTION supajump.trigger_set_invitation_details();

CREATE TRIGGER set_timestamps_org_memberships BEFORE UPDATE ON public.org_memberships FOR EACH ROW EXECUTE FUNCTION supajump.trigger_set_timestamps();

CREATE TRIGGER add_current_user_to_new_organization AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION supajump.add_current_user_to_new_organization();

CREATE TRIGGER protect_organization_fields BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION protect_organization_fields();

CREATE TRIGGER set_timestamps_organizations BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION supajump.trigger_set_timestamps();

CREATE TRIGGER set_posts_timestamp BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION supajump.trigger_set_timestamps();

CREATE TRIGGER set_profiles_timestamp BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION supajump.trigger_set_timestamps();

CREATE TRIGGER add_current_user_to_new_team AFTER INSERT ON public.teams FOR EACH ROW EXECUTE FUNCTION supajump.add_current_user_to_new_team();

CREATE TRIGGER protect_team_fields BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION protect_team_fields();


create schema if not exists "supajump";

create table "supajump"."config" (
    "enable_personal_organizations" boolean default true,
    "enable_team_organizations" boolean default true,
    "enable_organization_billing" boolean not null default true,
    "billing_provider" text default 'stripe'::text,
    "stripe_default_trial_period_days" integer default 30,
    "stripe_default_organization_price_id" text
);


alter table "supajump"."config" enable row level security;

alter table "supajump"."config" add constraint "config_stripe_default_organization_price_id_fkey" FOREIGN KEY (stripe_default_organization_price_id) REFERENCES billing_prices(id) not valid;

alter table "supajump"."config" validate constraint "config_stripe_default_organization_price_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION supajump.add_current_user_to_new_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION supajump.add_current_user_to_new_team()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  declare
    owner_role_id uuid;
  begin
    if new.primary_owner_user_id = auth.uid() then
      -- Get the owner role ID for teams
      owner_role_id := supajump.get_role_id_by_name('owner', 'team');

      if owner_role_id is null then
        raise exception 'Team owner role not found in roles table';
      end if;

      insert into public.team_memberships (team_id, user_id, team_member_role)
      values (new.id, auth.uid(), owner_role_id);
    end if;
    return new;
  end;
$function$
;

CREATE OR REPLACE FUNCTION supajump.create_team_and_add_current_user_as_owner(team_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  declare
    new_team_id text;
    owner_role_id uuid;
  begin
    -- Get the owner role ID for teams
    owner_role_id := supajump.get_role_id_by_name('owner', 'team');

    if owner_role_id is null then
      raise exception 'Team owner role not found in roles table';
    end if;

    insert into public.teams (name, primary_owner_user_id)
    values (team_name, auth.uid())
    returning id into new_team_id;

    insert into public.team_memberships (team_id, user_id, team_member_role)
    values (new_team_id, auth.uid(), owner_role_id);

    return new_team_id;
  end;
$function$
;

CREATE OR REPLACE FUNCTION supajump.generate_token(length integer)
 RETURNS bytea
 LANGUAGE plpgsql
AS $function$
begin
    return replace(replace(replace(encode(gen_random_bytes(length)::bytea, 'base64'), '/', '-'), '+', '_'), '\', '-');
end
$function$
;

CREATE OR REPLACE FUNCTION supajump.get_config()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
declare
    result RECORD;
begin
    select * from supajump.config limit 1 into result;
    return row_to_json(result);
end;
$function$
;

CREATE OR REPLACE FUNCTION supajump.get_organizations_for_current_user(passed_in_role_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select om.org_id
  from public.org_memberships om
  where om.user_id = auth.uid()
    and
      (
          om.org_member_role = passed_in_role_id
          or passed_in_role_id is null
      )
$function$
;

CREATE OR REPLACE FUNCTION supajump.get_organizations_for_current_user_matching_roles(passed_in_role_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS SETOF text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    select om.org_id
    from public.org_memberships om
    where om.user_id = auth.uid()
      and
        (
          om.org_member_role = ANY(passed_in_role_ids)
          or passed_in_role_ids is null
        )
$function$
;

CREATE OR REPLACE FUNCTION supajump.get_role_id_by_name(role_name text, role_scope text DEFAULT 'organization'::text)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id
  from roles
  where name = role_name and scope = role_scope
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION supajump.get_role_name_by_id(role_id uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select name
  from roles
  where id = role_id
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION supajump.get_teams_for_current_user(passed_in_role_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select tm.team_id
  from public.team_memberships tm
  where tm.user_id = auth.uid()
    and (
        tm.team_member_role = passed_in_role_id
        or passed_in_role_id is null
      )
$function$
;

CREATE OR REPLACE FUNCTION supajump.get_teams_for_current_user_matching_roles(passed_in_role_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS SETOF text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select tm.team_id
  from public.team_memberships tm
  where tm.user_id = auth.uid()
    and (
      tm.team_member_role = ANY(passed_in_role_ids)
      or passed_in_role_ids is null
    )
$function$
;

CREATE OR REPLACE FUNCTION supajump.is_set(field_name text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  result boolean;
begin
  execute format('select %I from supajump.config limit 1', field_name) into result;
  return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION supajump.run_new_user_setup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    first_organization_name  text;
    first_org_id    text;
    generated_user_name text;
    owner_role_id uuid;
begin

    -- first we setup the user profile
    -- TODO: see if we can get the user's name from the auth.users table once we learn how oauth works
    -- TODO: If no name is provided, use the first part of the email address
    if new.email IS NOT NULL then
        generated_user_name := split_part(new.email, '@', 1);
    end if;

    insert into public.profiles (id, user_name) values (new.id, generated_user_name);

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
        insert into public.org_memberships (org_id, user_id, org_member_role)
        values (first_org_id, NEW.id, owner_role_id);
    end if;
    return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION supajump.trigger_set_invitation_details()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.invited_by_user_id = auth.uid();
    NEW.org_name = (select name from public.organizations where id = NEW.org_id);
    RETURN NEW;
END
$function$
;

CREATE OR REPLACE FUNCTION supajump.trigger_set_timestamps()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    if TG_OP = 'INSERT' then
        NEW.created_at = now();
        NEW.updated_at = now();
    else
        NEW.updated_at = now();
        NEW.created_at = OLD.created_at;
    end if;
    return NEW;
end
$function$
;

create policy "supajump settings can be read by authenticated users"
on "supajump"."config"
as permissive
for select
to authenticated
using (true);



