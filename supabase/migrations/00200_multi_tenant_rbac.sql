/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MULTI-TENANT RBAC SCHEMA

This schema provides a complete multi-tenant role-based access control system
with hierarchical structure: Organizations → Teams → Users

Key Features:
- Multi-tenant isolation at organization level
- Hierarchical permissions (org-level and team-level roles)
- Role-based access control with granular permissions
- Permission inheritance and cascading
- Row-level security policies
- Comprehensive helper functions for common operations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
-- Create the supajump schema for internal functions
create schema if not exists supajump;

-- Schema access
revoke all on schema supajump
from
  public,
  authenticated;

grant usage on schema supajump to postgres;

-- implicit as owner
-- Optional: allow your service role to read/write if you manage catalogs via API
grant usage on schema supajump to service_role;

-- Table/sequence privileges
revoke all on all tables in schema supajump
from
  public,
  authenticated;

revoke all on all sequences in schema supajump
from
  public,
  authenticated;

-- Future objects default privileges
alter default privileges in schema supajump
revoke all on tables
from
  public,
  authenticated;

alter default privileges in schema supajump
revoke all on sequences
from
  public,
  authenticated;

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CORE TENANT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
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
    id uuid primary key default gen_random_uuid (),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone,
    primary_owner_user_id uuid references auth.users (id) on delete set null default auth.uid (),
    name text not null,
    type text default 'organization',
    slug text,
    constraint organizations_slug_unique unique (slug),
    constraint organizations_type_check check (
      type in ('super', 'organization', 'personal')
    )
  );

alter table public.organizations enable row level security;

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
    org_id uuid not null references public.organizations (id) on delete cascade,
    constraint org_memberships_org_user_unique unique (org_id, user_id)
  );

alter table public.org_memberships enable row level security;

/**
 * Teams are a grouping of users that are associated with an organization.
 * They are used to group users together for a specific purpose.
 *
 * The primary owner user id is the user that is the owner of the team.
 * This is the user that is responsible for the team and has full
 * access to the team.
 */
create table if not exists
  public.teams (
    id uuid primary key default gen_random_uuid (),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone,
    slug text,
    org_id uuid not null references organizations (id) on delete cascade,
    primary_owner_user_id uuid not null references auth.users (id),
    name text not null,
    constraint teams_org_slug_unique unique (org_id, slug)
  );

alter table public.teams enable row level security;

-- Add unique constraint to support foreign key from roles table
alter table public.teams
add constraint uq_teams_org_id_id unique (org_id, id);

/**
 * Team memberships are the users that are associated with a team.
 * They can have different roles within the team.
 */
create table if not exists
  public.team_memberships (
    id uuid primary key default gen_random_uuid (),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone,
    team_id uuid not null references teams (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    constraint team_memberships_team_user_unique unique (team_id, user_id)
  );

alter table public.team_memberships enable row level security;

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2.A. ROLES AND PERMISSIONS SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
/**
 * Roles define named collections of permissions within an organization.
 * scope = 'organization' | 'team'
 * name  = 'owner' | 'admin' | 'member' | 'post_editor' | …
 */
create table if not exists
  public.roles (
    id uuid primary key default gen_random_uuid (),
    scope text not null,
    org_id uuid not null references organizations (id) on delete cascade,
    team_id uuid references teams (id) on delete cascade,
    name text not null,
    display_name text,
    description text,
    constraint roles_scope_check check (scope in ('organization', 'team')),
    constraint roles_scope_team_check check (
      (
        scope = 'organization'
        and team_id is null
      )
      or (
        scope = 'team'
        and team_id is not null
      )
    )
  );

alter table public.roles enable row level security;

-- Add unique constraints to support composite foreign keys
alter table public.roles
add constraint uq_roles_id_org unique (id, org_id);

alter table public.roles
add constraint uq_roles_id_team unique (id, team_id);

-- Ensure team roles belong to the correct organization
alter table public.roles
add constraint roles_team_org_match_fk foreign key (org_id, team_id) references teams (org_id, id) on delete cascade;

/**
 * Role permissions define what actions roles can perform on resources.
 * resource  = logical entity (posts, billing, settings …)
 * action    = view | edit | delete | manage …
 * scope     = all | own (permission applies to all records or only user-owned records when an explicit 'own' permission is granted) designated by owner_id = auth.uid()
 * cascade_down = whether org-level permissions cascade to teams
 * target_kind = what type of entities this permission cascades to
 */
create table if not exists
  public.role_permissions (
    id uuid primary key default gen_random_uuid (),
    role_id uuid not null,
    org_id uuid not null references organizations (id) on delete cascade,
    team_id uuid references teams (id) on delete cascade,
    scope text not null default 'all',
    resource text not null,
    action text not null,
    cascade_down boolean default false,
    target_kind text,
    constraint role_permissions_scope_check check (scope in ('all', 'own')),
    -- Composite foreign keys to ensure consistency
    constraint role_permissions_role_org_fk foreign key (role_id, org_id) references roles (id, org_id) on delete cascade,
    constraint role_permissions_role_team_fk foreign key (role_id, team_id) references roles (id, team_id) on delete cascade
  );

alter table public.role_permissions enable row level security;

/**
 * Organization member roles assign roles to organization members
 */
create table if not exists
  public.org_member_roles (
    id uuid primary key default gen_random_uuid (),
    role_id uuid not null,
    org_member_id uuid references org_memberships (id) on delete cascade,
    org_id uuid not null references organizations (id) on delete cascade,
    constraint org_member_roles_role_org_member_unique unique (role_id, org_member_id),
    constraint org_member_roles_role_org_fk foreign key (role_id, org_id) references roles (id, org_id) on delete cascade
  );

alter table public.org_member_roles enable row level security;

/**
 * Team member roles assign roles to team members
 */
create table if not exists
  public.team_member_roles (
    id uuid primary key default gen_random_uuid (),
    role_id uuid not null,
    team_member_id uuid references team_memberships (id) on delete cascade,
    team_id uuid not null references teams (id) on delete cascade,
    constraint team_member_roles_role_team_member_unique unique (role_id, team_member_id),
    constraint team_member_roles_role_team_fk foreign key (role_id, team_id) references roles (id, team_id) on delete cascade
  );

alter table public.team_member_roles enable row level security;

-- For faster delete/update cascades and FK checks
create index if not exists idx_omr_role_org on public.org_member_roles (role_id, org_id);

create index if not exists idx_tmr_role_team on public.team_member_roles (role_id, team_id);

create index if not exists idx_rp_role_org on public.role_permissions (role_id, org_id);

create index if not exists idx_rp_role_team on public.role_permissions (role_id, team_id);

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2.B. Role and Permission System Catalog
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
-- Define system catalogs (single source of truth)
-- System catalogs live in supajump and are edited only by platform admins
create table if not exists
  supajump.role_catalog (
    scope text not null check (scope in ('organization', 'team')),
    name text not null,
    display_name text not null,
    description text,
    primary key (scope, name)
  );

create table if not exists
  supajump.permission_catalog (
    scope text not null check (scope in ('organization', 'team')),
    role_name text not null,
    resource text not null,
    action text not null,
    perm_scope text not null default 'all' check (perm_scope in ('all', 'own')),
    cascade_down boolean default false,
    target_kind text,
    primary key (scope, role_name, resource, action)
  );

-- Default org roles
insert into
  supajump.role_catalog (scope, name, display_name, description)
values
  (
    'organization',
    'owner',
    'Owner',
    'Full organization access'
  ),
  ('organization', 'admin', 'Admin', 'Administrative access'),
  ('organization', 'member', 'Member', 'Basic access') on conflict
do nothing;

-- Default org permissions
insert into
  supajump.permission_catalog (
    scope,
    role_name,
    resource,
    action,
    perm_scope,
    cascade_down,
    target_kind
  )
values
  -- owner: everything, cascades
  ('organization', 'owner', 'all', 'all', 'all', true, null),
  -- admin: broad but not absolute (adjust as you like)
  (
    'organization',
    'admin',
    'teams',
    'view',
    'all',
    true,
    'team'
  ),
  (
    'organization',
    'admin',
    'teams',
    'create',
    'all',
    true,
    'team'
  ),
  (
    'organization',
    'admin',
    'teams',
    'edit',
    'all',
    true,
    'team'
  ),
  (
    'organization',
    'admin',
    'posts',
    'view',
    'all',
    true,
    'team'
  ),
  (
    'organization',
    'admin',
    'posts',
    'create',
    'all',
    true,
    'team'
  ),
  (
    'organization',
    'admin',
    'posts',
    'edit',
    'all',
    true,
    'team'
  ),
  (
    'organization',
    'admin',
    'members',
    'view',
    'all',
    true,
    null
  ),
  (
    'organization',
    'admin',
    'members',
    'edit',
    'all',
    true,
    null
  ),
  -- member: basic read
  (
    'organization',
    'member',
    'teams',
    'view',
    'all',
    false,
    null
  ),
  (
    'organization',
    'member',
    'posts',
    'view',
    'all',
    false,
    null
  ) on conflict
do nothing;

-- Team default roles
insert into
  supajump.role_catalog (scope, name, display_name, description)
values
  ('team', 'owner', 'Owner', 'Full team access'),
  (
    'team',
    'admin',
    'Admin',
    'Administrative access within team'
  ),
  ('team', 'member', 'Member', 'Basic team access') on conflict
do nothing;

-- Team default permissions (tune as needed)
insert into
  supajump.permission_catalog (
    scope,
    role_name,
    resource,
    action,
    perm_scope,
    cascade_down,
    target_kind
  )
values
  -- owner: everything within the team
  ('team', 'owner', 'all', 'all', 'all', false, null),
  -- admin: broad but not absolute
  ('team', 'admin', 'posts', 'view', 'all', false, null),
  ('team', 'admin', 'posts', 'create', 'all', false, null),
  ('team', 'admin', 'posts', 'edit', 'all', false, null),
  ('team', 'admin', 'members', 'view', 'all', false, null),
  ('team', 'admin', 'members', 'edit', 'all', false, null),
  -- member: basic read
  ('team', 'member', 'posts', 'view', 'all', false, null) on conflict
do nothing;

-- Unified seeder from catalog (idempotent, transactional, RLS-safe)
create or replace function supajump.seed_from_catalog (
  p_scope text,            -- 'organization' | 'team'
  p_id uuid,               -- org_id or team_id depending on scope
  p_prune boolean default false  -- if true, remove perms not in catalog for the catalog-managed roles
) returns void
language plpgsql
security definer
set search_path = public, supajump
as $$
declare
  v_org_id    uuid;
  v_team_id   uuid;
  v_owner_uid uuid;
begin
  if p_scope not in ('organization','team') then
    raise exception 'Invalid scope: %, must be organization|team', p_scope;
  end if;

  -- Avoid duplicate seeding under concurrency
  perform pg_advisory_xact_lock(hashtext(p_scope || ':' || p_id::text));

  if p_scope = 'organization' then
    v_org_id := p_id;

    select primary_owner_user_id
      into v_owner_uid
    from public.organizations
    where id = v_org_id;

    if v_owner_uid is null then
      raise exception 'Organization % not found', v_org_id;
    end if;

    -- Upsert ORG roles from catalog (partial-unique arbiter WITH predicate)
    with upsert_roles as (
      insert into public.roles (scope, org_id, team_id, name, display_name, description)
      select 'organization', v_org_id, null, rc.name, rc.display_name, rc.description
      from supajump.role_catalog rc
      where rc.scope = 'organization'
      on conflict (org_id, scope, name) where team_id is null
      do update set
        display_name = excluded.display_name,
        description  = excluded.description
      returning id, name
    ),
    role_map as (
      -- All org roles after upsert (existing + newly inserted)
      select r.id, r.name
      from public.roles r
      where r.org_id = v_org_id
        and r.scope  = 'organization'
        and r.team_id is null
    )
    insert into public.role_permissions (role_id, org_id, team_id, scope, resource, action, cascade_down, target_kind)
    select rm.id, v_org_id, null, pc.perm_scope, pc.resource, pc.action, pc.cascade_down, pc.target_kind
    from supajump.permission_catalog pc
    join role_map rm on rm.name = pc.role_name
    where pc.scope = 'organization'
    on conflict (org_id, role_id, resource, action) where team_id is null
    do nothing;

    if p_prune then
      -- Remove permissions not present in the catalog for catalog-managed roles
      delete from public.role_permissions rp
      using public.roles r
      where r.id = rp.role_id
        and r.org_id = v_org_id
        and r.scope  = 'organization'
        and rp.team_id is null
        and not exists (
          select 1
          from supajump.permission_catalog pc
          where pc.scope      = 'organization'
            and pc.role_name  = r.name
            and pc.resource   = rp.resource
            and pc.action     = rp.action
            and pc.perm_scope = rp.scope
        );
    end if;

    -- Ensure primary owner has membership + org 'owner' role
    insert into public.org_memberships (org_id, user_id)
    values (v_org_id, v_owner_uid)
    on conflict (org_id, user_id) do nothing;

    insert into public.org_member_roles (role_id, org_member_id, org_id)
    select r.id, om.id, v_org_id
    from public.roles r
    join public.org_memberships om
      on om.org_id = v_org_id and om.user_id = v_owner_uid
    where r.org_id = v_org_id
      and r.scope  = 'organization'
      and r.team_id is null
      and r.name   = 'owner'
    on conflict (role_id, org_member_id) do nothing;

  else
    -- TEAM scope
    v_team_id := p_id;

    select t.org_id, t.primary_owner_user_id
      into v_org_id, v_owner_uid
    from public.teams t
    where t.id = v_team_id;

    if v_org_id is null then
      raise exception 'Team % not found', v_team_id;
    end if;

    -- Upsert TEAM roles from catalog (partial-unique arbiter WITH predicate)
    with upsert_roles as (
      insert into public.roles (scope, org_id, team_id, name, display_name, description)
      select 'team', v_org_id, v_team_id, rc.name, rc.display_name, rc.description
      from supajump.role_catalog rc
      where rc.scope = 'team'
      on conflict (org_id, team_id, scope, name) where team_id is not null
      do update set
        display_name = excluded.display_name,
        description  = excluded.description
      returning id, name
    ),
    role_map as (
      select r.id, r.name
      from public.roles r
      where r.org_id  = v_org_id
        and r.team_id = v_team_id
        and r.scope   = 'team'
    )
    insert into public.role_permissions (role_id, org_id, team_id, scope, resource, action, cascade_down, target_kind)
    select rm.id, v_org_id, v_team_id, pc.perm_scope, pc.resource, pc.action, pc.cascade_down, pc.target_kind
    from supajump.permission_catalog pc
    join role_map rm on rm.name = pc.role_name
    where pc.scope = 'team'
    on conflict (org_id, team_id, role_id, resource, action) where team_id is not null
    do nothing;

    if p_prune then
      delete from public.role_permissions rp
      using public.roles r
      where r.id = rp.role_id
        and r.org_id  = v_org_id
        and r.team_id = v_team_id
        and r.scope   = 'team'
        and not exists (
          select 1
          from supajump.permission_catalog pc
          where pc.scope      = 'team'
            and pc.role_name  = r.name
            and pc.resource   = rp.resource
            and pc.action     = rp.action
            and pc.perm_scope = rp.scope
        );
    end if;

    -- Ensure team primary owner is a member + has team 'owner' role
    insert into public.team_memberships (team_id, user_id)
    values (v_team_id, v_owner_uid)
    on conflict (team_id, user_id) do nothing;

    insert into public.team_member_roles (role_id, team_member_id, team_id)
    select r.id, tm.id, v_team_id
    from public.roles r
    join public.team_memberships tm
      on tm.team_id = v_team_id and tm.user_id = v_owner_uid
    where r.org_id  = v_org_id
      and r.team_id = v_team_id
      and r.scope   = 'team'
      and r.name    = 'owner'
    on conflict (role_id, team_member_id) do nothing;
  end if;
end;
$$;


-- RLS-proof
alter function supajump.seed_from_catalog (text, uuid, boolean) owner to postgres;

-- Tiny wrappers for convenience
create
or replace function supajump.reseed_org (p_org_id uuid, p_prune boolean default false) returns void language sql security definer
set
  search_path = public,
  supajump as $$ select supajump.seed_from_catalog('organization', p_org_id, p_prune) $$;

create
or replace function supajump.reseed_team (p_team_id uuid, p_prune boolean default false) returns void language sql security definer
set
  search_path = public,
  supajump as $$ select supajump.seed_from_catalog('team', p_team_id, p_prune) $$;

alter function supajump.reseed_org (uuid, boolean) owner to postgres;

alter function supajump.reseed_team (uuid, boolean) owner to postgres;

-- Triggers (auto-seed on creation)
-- Org
create
or replace function supajump.trg_seed_org_defaults () returns trigger language plpgsql security definer
set
  search_path = public,
  supajump as $$
begin
  perform supajump.seed_from_catalog('organization', new.id, false);
  return new;
end;
$$;

alter function supajump.trg_seed_org_defaults () owner to postgres;

create trigger trg_seed_org_defaults
after insert on public.organizations for each row
execute function supajump.trg_seed_org_defaults ();

-- Team
create
or replace function supajump.trg_seed_team_defaults () returns trigger language plpgsql security definer
set
  search_path = public,
  supajump as $$
begin
  perform supajump.seed_from_catalog('team', new.id, false);
  return new;
end;
$$;

alter function supajump.trg_seed_team_defaults () owner to postgres;

create trigger trg_seed_team_defaults
after insert on public.teams for each row
execute function supajump.trg_seed_team_defaults ();

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. UNIFIED GROUPS VIEW

This provides a unified view of organizations and teams for permission inheritance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
create table if not exists
  public.groups (
    id uuid primary key, -- mirrors org/team id
    org_id uuid not null references public.organizations (id) on delete cascade, -- parent org_id, for orgs this is the org_id itself
    kind text not null check (kind in ('organization', 'team')),
    primary_owner_user_id uuid not null references auth.users (id),
    created_at timestamp with time zone default now()
  );

alter table public.groups enable row level security;

-- function to sync groups when orgs are deleted
create
or replace function public.trg_sync_groups_on_org_delete () returns trigger language plpgsql as $$
begin
  delete from public.groups where id = old.id;
  return old; 
end;
$$;

-- trigger to sync groups when orgs are deleted
create trigger trg_sync_groups_on_org_delete
after delete on public.organizations for each row
execute function public.trg_sync_groups_on_org_delete ();

create
or replace function public.trg_sync_groups_on_team_delete () returns trigger language plpgsql as $$
begin
  delete from public.groups
  where
    id = old.id;

  return old;
end;
$$;

-- trigger to sync groups when teams are deleted
create trigger trg_sync_groups_on_team_delete
after delete on public.teams for each row
execute function public.trg_sync_groups_on_team_delete ();

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. USER PERMISSIONS VIEW

This view provides a permissions for all users across organizations
and teams, including permission inheritance and cascading.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
create view
  supajump.user_permissions_view as
with
  direct as (
    /* org-scoped roles */
    select
      om.user_id,
      om.org_id as group_id,
      rp.resource,
      rp.action,
      rp.scope,
      rp.cascade_down,
      rp.target_kind
    from
      public.org_memberships om
      join public.org_member_roles omr on omr.org_member_id = om.id
      join public.role_permissions rp on rp.role_id = omr.role_id
    union all
    /* team-scoped roles */
    select
      tm.user_id,
      tm.team_id as group_id,
      rp.resource,
      rp.action,
      rp.scope,
      false as cascade_down,
      null as target_kind
    from
      public.team_memberships tm
      join public.team_member_roles tmr on tmr.team_member_id = tm.id
      join public.role_permissions rp on rp.role_id = tmr.role_id
  ),
  inherited as (
    select
      *
    from
      direct
    union all
    /* cascade org → team */
    select
      d.user_id,
      t.id,
      d.resource,
      d.action,
      d.scope,
      false,
      null
    from
      direct d
      join public.groups t on d.cascade_down
      and (
        d.target_kind is null
        or d.target_kind = 'team'
      )
      and t.kind = 'team'
      and t.org_id = d.group_id
  )
select
  user_id,
  group_id,
  resource,
  action,
  scope
from
  inherited;

-- Grant access to the user_permissions_view
grant
select
  on supajump.user_permissions_view to authenticated;

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. INDEXES FOR OPTIMAL PERFORMANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
-- Core indexes for role lookups
create index if not exists idx_roles_name_scope on public.roles (name, scope);

create index if not exists idx_roles_org_id on public.roles (org_id);

-- Indexes for role permissions
create index if not exists idx_role_permissions_role_resource_action on public.role_permissions (role_id, resource, action);

create index if not exists idx_role_permissions_org_id_resource_action on public.role_permissions (org_id, resource, action);

create index if not exists idx_role_permissions_team_id_resource_action on public.role_permissions (team_id, resource, action)
where
  team_id is not null;

-- Indexes for org member role lookups
create index if not exists idx_org_member_roles_org_member_id on public.org_member_roles (org_member_id);

create index if not exists idx_org_member_roles_role_id on public.org_member_roles (role_id);

create index if not exists idx_org_member_roles_org_id_role_id on public.org_member_roles (org_id, role_id);

-- Indexes for team member role lookups
create index if not exists idx_team_member_roles_team_member_id on public.team_member_roles (team_member_id);

create index if not exists idx_team_member_roles_role_id on public.team_member_roles (role_id);

create index if not exists idx_team_member_roles_team_id_role_id on public.team_member_roles (team_id, role_id);

-- Indexes for groups unified view
create index if not exists idx_groups_org_id_id on public.groups (org_id, id);

create index if not exists idx_groups_kind on public.groups (kind);

-- The user_permissions_view is a view so it cannot be indexed
-- Indexes for the new partial unique constraints
create unique index if not exists idx_roles_org_team_scope_name_team_not_null on public.roles (org_id, team_id, scope, name)
where
  team_id is not null;

create unique index if not exists idx_roles_org_scope_name_team_null on public.roles (org_id, scope, name)
where
  team_id is null;

create unique index if not exists idx_roles_org_team_scope_name_team_not_null on public.roles (org_id, team_id, scope, name)
where
  team_id is not null;

-- Partial indexes for role_permissions unique constraints
create unique index if not exists idx_role_permissions_org_team_role_resource_action_team_not_null on public.role_permissions (org_id, team_id, role_id, resource, action)
where
  team_id is not null;

create unique index if not exists idx_role_permissions_org_role_resource_action_team_null on public.role_permissions (org_id, role_id, resource, action)
where
  team_id is null;

-- Owner bypass indexes
create index if not exists idx_organizations_primary_owner_user_id_id on public.organizations (primary_owner_user_id, id);

create index if not exists idx_teams_primary_owner_user_id_id on public.teams (primary_owner_user_id, id);

-- Membership indexes
create index if not exists idx_org_memberships_user_id on public.org_memberships (user_id);

create index if not exists idx_org_memberships_org_id on public.org_memberships (org_id);

create index if not exists idx_team_memberships_user_id on public.team_memberships (user_id);

create index if not exists idx_team_memberships_team_id on public.team_memberships (team_id);

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. TRIGGERS AND AUTOMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
-- Timestamp triggers (assuming supajump.trigger_set_timestamps exists)
create trigger set_timestamps_organizations before
update on public.organizations for each row
execute function supajump.trigger_set_timestamps ();

create trigger set_timestamps_org_memberships before
update on public.org_memberships for each row
execute function supajump.trigger_set_timestamps ();

-- Groups sync triggers for unified view
create
or replace function public.trg_sync_org () returns trigger language plpgsql as $$
begin
  insert into public.groups(id, org_id, kind, primary_owner_user_id)
  values (NEW.id, NEW.id, 'organization', NEW.primary_owner_user_id)
  on conflict(id) do update
    set primary_owner_user_id = excluded.primary_owner_user_id;
  return new;
end $$;

create trigger trg_org_sync
after insert
or
update on public.organizations for each row
execute procedure public.trg_sync_org ();

create
or replace function public.trg_sync_team () returns trigger language plpgsql as $$
begin
  insert into public.groups(id, org_id, kind, primary_owner_user_id)
  values (NEW.id, NEW.org_id, 'team', NEW.primary_owner_user_id)
  on conflict(id) do update
    set org_id = excluded.org_id,
        primary_owner_user_id = excluded.primary_owner_user_id;
  return new;
end $$;

create trigger trg_team_sync
after insert
or
update on public.teams for each row
execute procedure public.trg_sync_team ();

-- Protection triggers for sensitive fields
create
or replace function public.protect_organization_fields () returns trigger language plpgsql as $$
begin
  if current_role = 'authenticated' then
    -- these are protected fields that users are not allowed to update themselves
    -- platform admins should be very careful about updating them as well.
    if NEW.id <> old.id or NEW.primary_owner_user_id <> old.primary_owner_user_id then
      raise exception 'you do not have permission to update this field';
    end if;
  end if;
  return new;
end $$;

create trigger protect_organization_fields before
update on public.organizations for each row
execute function public.protect_organization_fields ();

create
or replace function public.protect_team_fields () returns trigger language plpgsql as $$
begin
  if current_role = 'authenticated' then
    -- these are protected fields that users are not allowed to update themselves
    -- platform admins should be very careful about updating them as well.
    if NEW.id <> old.id or NEW.primary_owner_user_id <> old.primary_owner_user_id then
      raise exception 'you do not have permission to update this field';
    end if;
  end if;
  return new;
end $$;

create trigger protect_team_fields before
update on public.teams for each row
execute function public.protect_team_fields ();

-- Note: Role/permission consistency is now enforced via composite foreign keys
-- No validation trigger needed
/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. PERMISSION CHECKING FUNCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
-- Helper function to get current user's permissions for a resource/action
create
or replace function supajump.current_user_permissions (_resource text, _action text) returns table (group_id uuid, scope text) language sql stable -- lets planner treat result as constant
parallel SAFE -- allows parallel join
cost 1 rows 10 -- good cardinality hint
as $$
  SELECT group_id, scope
  FROM   supajump.user_permissions_view
  WHERE  user_id  = auth.uid()
    AND  resource = _resource
    AND  action   = _action;
$$;

-- Helper function to determine if a user has a permission for a resource/action for use in RLS
-- Direct row ownership does not grant access; owners must have explicit permissions
-- (e.g. with scope='own'). Only organization or team primary owners bypass RBAC checks.
CREATE
OR REPLACE FUNCTION supajump.has_permission (
  _resource text,
  _action text,
  _org_id uuid,
  _team_id uuid DEFAULT NULL,
  _owner_id uuid DEFAULT NULL
) RETURNS boolean LANGUAGE sql STABLE PARALLEL SAFE COST 1 AS $$
  SELECT
    -- Fast path: org/team primary owner bypass (primary key lookups)
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = _org_id AND primary_owner_user_id = auth.uid()
    )
    OR (
      _team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM teams
        WHERE id = _team_id AND primary_owner_user_id = auth.uid()
      )
    )
    OR
    -- Permission-based access
    EXISTS (
      SELECT 1
      FROM supajump.user_permissions_view p
      WHERE p.user_id = auth.uid()
        AND p.resource = _resource
        AND p.action = _action
        AND (
          p.group_id = _org_id
          OR (_team_id IS NOT NULL AND p.group_id = _team_id)
        )
        AND (
          p.scope = 'all'
          OR (p.scope = 'own' AND _owner_id = auth.uid())
        )
    );
$$;

grant
execute on function supajump.has_permission (text, text, uuid, uuid, uuid) TO authenticated;

/*───────────────────────────────────────────────────────────────┐
│  7.A FAST RPC HELPERS – NO HEAVY JOINS                            │
│  These run from Supabase-JS to toggle UI (NOT inside RLS).    │
└───────────────────────────────────────────────────────────────*/
/*--------------------------------------------------------------
7.A.1.  Org-level permission check
----------------------------------------------------------------*/
create
or replace function public.has_org_permission (_org_id uuid, _resource text, _action text) returns boolean language sql stable -- executes once per statement
as $$
  /* Lookup is a single index-backed EXISTS against the view that
     already holds cascaded permissions. Lightning-fast (~μs). */
  select exists (
    select 1
    from   supajump.current_user_permissions(_resource, _action) up
    where  up.group_id = _org_id         -- org row in groups view
  );
$$;

/*--------------------------------------------------------------
7.A.2.  Team-level permission check
----------------------------------------------------------------*/
create
or replace function public.has_team_permission (_team_id uuid, _resource text, _action text) returns boolean language sql stable as $$
  select exists (
    select 1
    from   supajump.current_user_permissions(_resource, _action) up
    where  up.group_id = _team_id        -- team row in groups view
  );
$$;

/*--------------------------------------------------------------
7.A.3.  Grant execute to app users
----------------------------------------------------------------*/
grant
execute on function public.has_org_permission (uuid, text, text),
public.has_team_permission (uuid, text, text) to authenticated;

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7B. STATIC VS DYNAMIC ROLE MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
/**
 * Application settings table for global configuration
 * This allows toggling between static and dynamic role management modes
 */
create table if not exists
  public.app_settings (
    key text primary key,
    value jsonb not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
  );

-- App settings index for efficient lookups
create index if not exists idx_app_settings_key on public.app_settings (key);

alter table public.app_settings enable row level security;

-- Insert default setting for dynamic roles (disabled by default for security)
insert into
  public.app_settings (key, value)
values
  ('dynamic_roles_enabled', 'false'::jsonb) on conflict (key)
do nothing;

-- Timestamp trigger for app_settings
create trigger set_timestamps_app_settings before
update on public.app_settings for each row
execute function supajump.trigger_set_timestamps ();

-- Function to check if dynamic roles are enabled globally
create
or replace function supajump.dynamic_roles_enabled () returns boolean language sql stable security definer
set
  search_path = public as $$
  select coalesce(
    (select value #>> '{}' from app_settings where key = 'dynamic_roles_enabled'),
    'false'
  )::boolean;
$$;

-- Public wrapper for the dynamic roles check
create
or replace function public.is_dynamic_roles_enabled () returns boolean language sql stable security definer
set
  search_path = public as $$
  select supajump.dynamic_roles_enabled();
$$;

grant
execute on function public.is_dynamic_roles_enabled () to authenticated;

-- Function to enable/disable dynamic roles (service role only)
create
or replace function supajump.set_dynamic_roles_enabled (enabled boolean) returns void language plpgsql security definer
set
  search_path = public as $$
begin
  insert into app_settings (key, value)
  values ('dynamic_roles_enabled', to_jsonb(enabled))
  on conflict (key) do update
  set value = excluded.value, updated_at = now();

  raise notice 'Dynamic roles %', case when enabled then 'ENABLED' else 'DISABLED' end;
end;
$$;

revoke all on function supajump.set_dynamic_roles_enabled (boolean)
from
  public,
  authenticated;

grant
execute on function supajump.set_dynamic_roles_enabled (boolean) to service_role;

-- App settings policies (only superusers can modify)
create policy "Superusers can manage app settings" on public.app_settings for all using (
  exists (
    select
      1
    from
      pg_roles
    where
      rolname = current_user
      and rolsuper = true
  )
);

create policy "Authenticated users can view app settings" on public.app_settings for
select
  to authenticated using (true);

-- Helper function to check if role management is allowed
create
or replace function supajump.can_manage_roles () returns boolean language sql stable security definer
set
  search_path = public as $$
  select supajump.dynamic_roles_enabled();
$$;

-- Public wrapper for role management check
create
or replace function public.can_manage_roles () returns boolean language sql stable security definer
set
  search_path = public as $$
  select supajump.can_manage_roles();
$$;

grant
execute on function public.can_manage_roles () to authenticated;

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATIC VS DYNAMIC ROLE MANAGEMENT USAGE:

1. STATIC MODE (Default):
- Roles and permissions are pre-defined in the database
- Users cannot create, modify, or delete roles
- Only role assignments (org_member_roles, team_member_roles) can be modified
- Suitable for applications with fixed permission structures

2. DYNAMIC MODE:
- Primary owners can create custom roles and permissions
- Full CRUD operations available on roles and role_permissions tables
- Suitable for applications requiring flexible permission management

3. TOGGLE BETWEEN MODES:
To enable dynamic roles (service role only):
SELECT supajump.set_dynamic_roles_enabled(true);

To disable dynamic roles (service role only):
SELECT supajump.set_dynamic_roles_enabled(false);

4. CHECK CURRENT MODE:
SELECT public.is_dynamic_roles_enabled();

5. APPLICATION INTEGRATION:
Your application should check can_manage_roles() before showing
role management UI components to users.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. ROLE MANAGEMENT HELPER FUNCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
create
or replace function supajump.is_set (field_name text) returns boolean language plpgsql as $$
declare
  result boolean;
begin
  execute format('select %I from supajump.config limit 1', field_name) into result;
  return result;
end;
$$;

-- Get role ID by name and scope
create
or replace function supajump.get_role_id_by_name (role_name text, role_scope text default 'organization') returns uuid language sql security definer
set
  search_path = public as $$
  select id from roles where name = role_name and scope = role_scope limit 1
$$;

-- Get role name by ID
create
or replace function supajump.get_role_name_by_id (role_id uuid) returns text language sql security definer
set
  search_path = public as $$
  select name from roles where id = role_id limit 1
$$;

create
or replace function supajump.get_org_role_id (role_name text, _org_id uuid) returns uuid language sql security definer
set
  search_path = public as $$
  select id
  from roles
  where name = role_name and scope = 'organization' and org_id = _org_id
  limit 1
$$;

create
or replace function supajump.get_team_role_id (role_name text, _team_id uuid) returns uuid language sql security definer
set
  search_path = public as $$
  select id
  from roles
  where name = role_name and scope = 'team' and team_id = _team_id
  limit 1
$$;

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. USER CONTEXT FUNCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
-- Get organizations for current user
create
or replace function public.get_organizations_for_current_user (passed_in_role_id uuid default null) returns setof uuid language sql security definer
set
  search_path = public as $$
  select distinct om.org_id
  from org_memberships om
  join org_member_roles omr on omr.org_member_id = om.id
  where om.user_id = auth.uid()
    and (omr.role_id = passed_in_role_id or passed_in_role_id is null)
$$;

-- Get organizations for current user matching any of the provided role IDs
create
or replace function public.get_organizations_for_current_user_matching_roles (passed_in_role_ids uuid[] default null) returns setof uuid language sql security definer
set
  search_path = public as $$
  select distinct om.org_id
  from org_memberships om
  join org_member_roles omr on omr.org_member_id = om.id
  where om.user_id = auth.uid()
    and (
      omr.role_id = ANY(passed_in_role_ids)
      or passed_in_role_ids is null
    )
$$;

grant
execute on function public.get_organizations_for_current_user (uuid) to authenticated;

grant
execute on function public.get_organizations_for_current_user_matching_roles (uuid[]) to authenticated;

-- Organizations by role name function already exists in public schema below
create
or replace function public.get_organizations_for_current_user_by_role_name (role_name text) returns setof uuid language sql security definer
set
  search_path = public as $$
  select distinct om.org_id
  from org_memberships om
  join org_member_roles omr on omr.org_member_id = om.id
  join roles r on r.id = omr.role_id
  where om.user_id = auth.uid()
    and r.scope = 'organization'
    and r.name = role_name
$$;

-- Get teams for current user
create
or replace function public.get_teams_for_current_user (passed_in_role_id uuid default null) returns setof uuid language sql security definer
set
  search_path = public as $$
  select distinct tm.team_id
  from team_memberships tm
  join team_member_roles tmr on tmr.team_member_id = tm.id
  where tm.user_id = auth.uid()
    and (tmr.role_id = passed_in_role_id or passed_in_role_id is null)
$$;

create
or replace function public.get_teams_for_current_user_matching_roles (passed_in_role_ids uuid[] default null) returns setof uuid language sql security definer
set
  search_path = public as $$
  select distinct tm.team_id
  from team_memberships tm
  join team_member_roles tmr on tmr.team_member_id = tm.id
  where tm.user_id = auth.uid()
    and (
      tmr.role_id = ANY(passed_in_role_ids)
      or passed_in_role_ids is null
    )
$$;

grant
execute on function public.get_teams_for_current_user (uuid) to authenticated;

grant
execute on function public.get_teams_for_current_user_matching_roles (uuid[]) to authenticated;

-- Teams by role name function already exists in public schema below
create
or replace function public.get_teams_for_current_user_by_role_name (role_name text) returns setof uuid language sql security definer
set
  search_path = public as $$
  select distinct tm.team_id
  from team_memberships tm
  join team_member_roles tmr on tmr.team_member_id = tm.id
  join roles r on r.id = tmr.role_id
  where tm.user_id = auth.uid()
    and r.scope = 'team'
    and r.name = role_name
$$;

grant
execute on function public.get_organizations_for_current_user_by_role_name (text) to authenticated;

grant
execute on function public.get_teams_for_current_user_by_role_name (text) to authenticated;

-- Get current user's role info for an organization
create
or replace function public.current_user_org_member_role (lookup_org_id uuid) returns jsonb language plpgsql as $$
declare
  user_org_member_roles jsonb;
  is_organization_primary_owner boolean;
  is_personal boolean;
begin
  if lookup_org_id is null then
    raise exception 'org_id is required';
  end if;

  -- Get all roles for the user in this organization
  select jsonb_agg(
    jsonb_build_object(
      'role_id', r.id,
      'role_name', r.name,
      'display_name', r.display_name,
      'description', r.description
    )
  )
  into user_org_member_roles
  from org_memberships om
  join org_member_roles omr on omr.org_member_id = om.id
  join roles r on r.id = omr.role_id
  where om.user_id = auth.uid() and om.org_id = lookup_org_id;

  select
    (primary_owner_user_id = auth.uid()), (type = 'personal')
  into
    is_organization_primary_owner, is_personal
  from organizations
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

-- Get current user's role info for a team
create
or replace function public.current_user_teams_member_role (lookup_team_id uuid) returns jsonb language plpgsql as $$
declare
  user_teams_member_roles jsonb;
  is_team_primary_owner boolean;
begin
  if lookup_team_id is null then
    raise exception 'team_id is required';
  end if;

  -- Get all roles for the user in this team
  select jsonb_agg(
    jsonb_build_object(
      'role_id', r.id,
      'role_name', r.name,
      'display_name', r.display_name,
      'description', r.description
    )
  )
  into user_teams_member_roles
  from team_memberships tm
  join team_member_roles tmr on tmr.team_member_id = tm.id
  join roles r on r.id = tmr.role_id
  where tm.user_id = auth.uid() and tm.team_id = lookup_team_id;

  select primary_owner_user_id = auth.uid() 
  into is_team_primary_owner 
  from teams where id = lookup_team_id;

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
execute on function public.current_user_org_member_role (uuid) to authenticated;

grant
execute on function public.current_user_teams_member_role (uuid) to authenticated;

create
or replace function public.update_org_memberships_role (
  org_id uuid,
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
    select primary_owner_user_id = auth.uid(), primary_owner_user_id = update_org_memberships_role.user_id
      into is_organization_primary_owner, changing_primary_owner
      from public.organizations where id = update_org_memberships_role.org_id;

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
or replace function public.update_team_memberships_role (
  team_id uuid,
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
    select primary_owner_user_id = auth.uid(), primary_owner_user_id = update_team_memberships_role.user_id
      into is_team_primary_owner, changing_primary_owner from public.teams where id = update_team_memberships_role.team_id;

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
execute on function public.update_team_memberships_role (uuid, uuid, uuid[], boolean) to authenticated;

-- Bulk role assignment for better performance
create
or replace function public.bulk_assign_org_roles (
  org_id uuid,
  user_role_pairs jsonb -- [{"user_id": "uuid", "role_name": "string"}]
) returns void language plpgsql security definer as $$
declare
  pair jsonb;
  user_uuid uuid;
  role_uuid uuid;
  member_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(org_id::text));
  -- Verify permission to manage this org
  if not exists (
    select 1 from public.organizations o
    where o.id = org_id and o.primary_owner_user_id = auth.uid()
  ) then
    raise exception 'PERMISSION_DENIED: Only organization owners can bulk assign roles';
  end if;
  
  -- Process each user-role pair
  for pair in select * from jsonb_array_elements(user_role_pairs)
  loop
    user_uuid := (pair->>'user_id')::uuid;
    role_uuid := supajump.get_org_role_id(pair->>'role_name', org_id);
    
    if role_uuid is null then
      raise exception 'ROLE_NOT_FOUND: Role % not found', pair->>'role_name';
    end if;
    
    -- Get or create membership
    select id into member_id 
    from public.org_memberships 
    where org_id = bulk_assign_org_roles.org_id and user_id = user_uuid;
    
    if member_id is null then
      insert into public.org_memberships (org_id, user_id)
      values (bulk_assign_org_roles.org_id, user_uuid)
      returning id into member_id;
    end if;
    
    -- Assign role
    insert into public.org_member_roles (role_id, org_member_id, org_id)
    values (role_uuid, member_id, bulk_assign_org_roles.org_id)
    on conflict (role_id, org_member_id) do nothing;
  end loop;
end;
$$;

grant
execute on function public.bulk_assign_org_roles (uuid, jsonb) to authenticated;

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. ORGANIZATION AND TEAM CREATION FUNCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
-- Create organization with current user as owner
create
or replace function public.create_organization_and_add_current_user_as_owner (
  name text,
  type text default 'organization'
) returns uuid language plpgsql security definer
set search_path = public
 as $$
declare
  new_org_id uuid;
begin
  insert into public.organizations (name, type, primary_owner_user_id)
  values (name, type, auth.uid())
  returning id into new_org_id;

  if not exists (select 1 from organizations where id = new_org_id) then
    raise exception 'failed to create organization.';
  end if;

  -- The AFTER INSERT trigger will seed roles, permissions, and the owner membership.
  return new_org_id;

exception
  when unique_violation then
    declare
      v_state text; v_constraint text; v_detail text; v_hint text;
    begin
      get stacked diagnostics
        v_state      = returned_sqlstate,
        v_constraint = constraint_name,
        v_detail     = pg_exception_detail,
        v_hint       = pg_exception_hint;
      raise exception using
        errcode = v_state,
        message = format('unique_violation on constraint %s', coalesce(v_constraint,'<unknown>')),
        detail  = v_detail,
        hint    = v_hint;
    end;
  end;
$$;

-- Create team with current user as owner
create
or replace function public.create_team_and_add_current_user_as_owner (team_name text, input_org_id uuid) returns uuid language plpgsql security definer
set
  search_path = public as $$
declare
  new_team_id uuid;
  is_member boolean;
  is_primary_owner boolean;
begin
  -- verify the current user is a member of the provided organization
  select exists(
    select 1
    from org_memberships om
    where om.user_id = auth.uid()
      and om.org_id = input_org_id
  ) into is_member;

  -- check if the current user is the primary owner of the organization
  select primary_owner_user_id = auth.uid() 
  into is_primary_owner 
  from organizations where id = input_org_id;

  if is_member is not true and is_primary_owner is not true then
    raise exception 'you must be a member of the organization to create a team';
  end if;

  -- create the team
  insert into public.teams (name, org_id, primary_owner_user_id)
  values (team_name, input_org_id, auth.uid())
  returning id into new_team_id;

  -- The AFTER INSERT trigger will seed roles, permissions, and the owner membership.
  return new_team_id;


  exception
  when unique_violation then
    declare
      v_state text; v_constraint text; v_detail text; v_hint text;
    begin
      get stacked diagnostics
        v_state      = returned_sqlstate,
        v_constraint = constraint_name,
        v_detail     = pg_exception_detail,
        v_hint       = pg_exception_hint;
      raise exception using
        errcode = v_state,
        message = format('unique_violation on constraint %s', coalesce(v_constraint,'<unknown>')),
        detail  = v_detail,
        hint    = v_hint;
    end;

end;
$$;

grant
execute on function public.create_organization_and_add_current_user_as_owner (text, text) to authenticated;

grant
execute on function public.create_team_and_add_current_user_as_owner (text, uuid) to authenticated;

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. ROW LEVEL SECURITY POLICIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
-- Organizations policies
create policy "Users can view organizations they are members of" on public.organizations for
select
  to authenticated using (
    id in (
      select
        public.get_organizations_for_current_user ()
    )
    or primary_owner_user_id = auth.uid ()
  );

-- Organization memberships policies  
create policy "Users can view org memberships for their orgs" on public.org_memberships for
select
  to authenticated using (
    user_id = auth.uid () -- Users can see their own memberships
    or org_id in (
      select
        id
      from
        organizations
      where
        primary_owner_user_id = auth.uid ()
    ) -- Org owners can see all members
    or org_id in (
      select
        public.get_organizations_for_current_user ()
    ) -- Users can see members in orgs they belong to
  );

-- Teams policies
create policy "Users can view teams they are members of" on public.teams for
select
  to authenticated using (
    id in (
      select
        public.get_teams_for_current_user ()
    )
    or primary_owner_user_id = auth.uid ()
  );

-- Team memberships policies
create policy "Users can view team memberships for their teams" on public.team_memberships for
select
  to authenticated using (
    user_id = auth.uid () -- Users can see their own memberships
    or team_id in (
      select
        id
      from
        teams
      where
        primary_owner_user_id = auth.uid ()
    ) -- Team owners can see all members
    or team_id in (
      select
        public.get_teams_for_current_user ()
    ) -- Users can see members in teams they belong to
  );

-- Org member roles policies
create policy "Users can view org member roles for their orgs" on public.org_member_roles for
select
  to authenticated using (
    org_id in (
      select
        org_id
      from
        org_memberships
      where
        user_id = auth.uid ()
    ) -- Users can see roles in orgs they belong to
    or org_id in (
      select
        id
      from
        organizations
      where
        primary_owner_user_id = auth.uid ()
    ) -- Org owners can see all roles
  );

-- Team member roles policies
create policy "Users can view team member roles for their teams" on public.team_member_roles for
select
  to authenticated using (
    team_id in (
      select
        team_id
      from
        team_memberships
      where
        user_id = auth.uid ()
    ) -- Users can see roles in teams they belong to
    or team_id in (
      select
        id
      from
        teams
      where
        primary_owner_user_id = auth.uid ()
    ) -- Team owners can see all roles
  );

-- Groups policies
create policy "Groups visible within member orgs" on public.groups for
select
  to authenticated using (
    org_id in (
      select
        om.org_id
      from
        public.org_memberships om
      where
        om.user_id = auth.uid ()
    )
    or primary_owner_user_id = auth.uid ()
  );

-- Simple RLS policies for roles (no circular dependencies)
create policy "roles_select_simple" on public.roles for
select
  to authenticated using (
    -- Organization primary owner bypass
    exists (
      select
        1
      from
        organizations o
      where
        o.id = roles.org_id
        and o.primary_owner_user_id = auth.uid ()
    )
    -- Team primary owner bypass (if team-scoped)
    or exists (
      select
        1
      from
        teams t
      where
        t.id = roles.team_id
        and t.primary_owner_user_id = auth.uid ()
    )
    -- Users can see roles in orgs they belong to
    or exists (
      select
        1
      from
        org_memberships om
      where
        om.user_id = auth.uid ()
        and om.org_id = roles.org_id
    )
    -- Users can see roles in teams they belong to (if team-scoped)
    or (
      roles.team_id is not null
      and exists (
        select
          1
        from
          team_memberships tm
        where
          tm.user_id = auth.uid ()
          and tm.team_id = roles.team_id
      )
    )
  );

create policy "roles_insert_simple" on public.roles for insert to authenticated
with
  check (
    supajump.dynamic_roles_enabled ()
    and (
      -- Organization primary owner can create org roles
      exists (
        select
          1
        from
          organizations o
        where
          o.id = org_id
          and o.primary_owner_user_id = auth.uid ()
      )
      -- Team primary owner can create team roles
      or exists (
        select
          1
        from
          teams t
        where
          t.id = team_id
          and t.primary_owner_user_id = auth.uid ()
      )
    )
  );

create policy "roles_update_simple" on public.roles for
update to authenticated using (
  supajump.dynamic_roles_enabled ()
  and (
    -- Organization primary owner can edit org roles
    exists (
      select
        1
      from
        organizations o
      where
        o.id = roles.org_id
        and o.primary_owner_user_id = auth.uid ()
    )
    -- Team primary owner can edit team roles
    or exists (
      select
        1
      from
        teams t
      where
        t.id = roles.team_id
        and t.primary_owner_user_id = auth.uid ()
    )
  )
)
with
  check (
    supajump.dynamic_roles_enabled ()
    and (
      -- Same check for the updated values
      exists (
        select
          1
        from
          organizations o
        where
          o.id = org_id
          and o.primary_owner_user_id = auth.uid ()
      )
      or exists (
        select
          1
        from
          teams t
        where
          t.id = team_id
          and t.primary_owner_user_id = auth.uid ()
      )
    )
  );

create policy "roles_delete_simple" on public.roles for delete to authenticated using (
  supajump.dynamic_roles_enabled ()
  and (
    -- Organization primary owner can delete org roles
    exists (
      select
        1
      from
        organizations o
      where
        o.id = roles.org_id
        and o.primary_owner_user_id = auth.uid ()
    )
    -- Team primary owner can delete team roles
    or exists (
      select
        1
      from
        teams t
      where
        t.id = roles.team_id
        and t.primary_owner_user_id = auth.uid ()
    )
  )
);

-- Simple RLS policies for role_permissions (no circular dependencies)
create policy "role_permissions_select_simple" on public.role_permissions for
select
  to authenticated using (
    -- Organization primary owner bypass
    exists (
      select
        1
      from
        organizations o
      where
        o.id = role_permissions.org_id
        and o.primary_owner_user_id = auth.uid ()
    )
    -- Team primary owner bypass (if team-scoped)
    or exists (
      select
        1
      from
        teams t
      where
        t.id = role_permissions.team_id
        and t.primary_owner_user_id = auth.uid ()
    )
    -- Users can see role permissions in orgs they belong to
    or exists (
      select
        1
      from
        org_memberships om
      where
        om.user_id = auth.uid ()
        and om.org_id = role_permissions.org_id
    )
    -- Users can see role permissions in teams they belong to (if team-scoped)
    or (
      role_permissions.team_id is not null
      and exists (
        select
          1
        from
          team_memberships tm
        where
          tm.user_id = auth.uid ()
          and tm.team_id = role_permissions.team_id
      )
    )
  );

create policy "role_permissions_insert_simple" on public.role_permissions for insert to authenticated
with
  check (
    supajump.dynamic_roles_enabled ()
    and (
      -- Organization primary owner can create org role permissions
      exists (
        select
          1
        from
          organizations o
        where
          o.id = org_id
          and o.primary_owner_user_id = auth.uid ()
      )
      -- Team primary owner can create team role permissions
      or exists (
        select
          1
        from
          teams t
        where
          t.id = team_id
          and t.primary_owner_user_id = auth.uid ()
      )
    )
  );

create policy "role_permissions_update_simple" on public.role_permissions for
update to authenticated using (
  supajump.dynamic_roles_enabled ()
  and (
    -- Organization primary owner can edit org role permissions
    exists (
      select
        1
      from
        organizations o
      where
        o.id = role_permissions.org_id
        and o.primary_owner_user_id = auth.uid ()
    )
    -- Team primary owner can edit team role permissions
    or exists (
      select
        1
      from
        teams t
      where
        t.id = role_permissions.team_id
        and t.primary_owner_user_id = auth.uid ()
    )
  )
)
with
  check (
    supajump.dynamic_roles_enabled ()
    and (
      -- Same check for the updated values
      exists (
        select
          1
        from
          organizations o
        where
          o.id = org_id
          and o.primary_owner_user_id = auth.uid ()
      )
      or exists (
        select
          1
        from
          teams t
        where
          t.id = team_id
          and t.primary_owner_user_id = auth.uid ()
      )
    )
  );

create policy "role_permissions_delete_simple" on public.role_permissions for delete to authenticated using (
  supajump.dynamic_roles_enabled ()
  and (
    -- Organization primary owner can delete org role permissions
    exists (
      select
        1
      from
        organizations o
      where
        o.id = role_permissions.org_id
        and o.primary_owner_user_id = auth.uid ()
    )
    -- Team primary owner can delete team role permissions
    or exists (
      select
        1
      from
        teams t
      where
        t.id = role_permissions.team_id
        and t.primary_owner_user_id = auth.uid ()
    )
  )
);

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. GENERIC RLS POLICY TEMPLATES

These are template policies that can be applied to any table that follows
the multi-tenant pattern with org_id, team_id, and owner_id columns.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
-- Template for SELECT policies
-- Replace <TABLE_NAME> with your actual table name
/*
create policy rls_<TABLE_NAME>_select on <TABLE_NAME> for select to authenticated using (
supajump.has_permission('<TABLE_NAME>', 'view', org_id, team_id, owner_id)
);
 */
-- Template for INSERT policies  
-- Replace <TABLE_NAME> with your actual table name
/*
create policy "rls_insert_<TABLE_NAME>" on <TABLE_NAME> for insert to authenticated with check (
supajump.has_permission('<TABLE_NAME>', 'create', org_id, team_id, owner_id)
);
 */
-- Template for UPDATE policies
-- Replace <TABLE_NAME> with your actual table name
/*
create policy "rls_update_<TABLE_NAME>" on <TABLE_NAME> for update to authenticated with check (
supajump.has_permission('<TABLE_NAME>', 'edit', org_id, team_id, owner_id)
);
 */
-- Template for DELETE policies
-- Replace <TABLE_NAME> with your actual table name
/*
create policy "rls_delete_<TABLE_NAME>" on <TABLE_NAME> for delete to authenticated with check (
supajump.has_permission('<TABLE_NAME>', 'delete', org_id, team_id, owner_id)
);
 */
/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END OF MULTI-TENANT RBAC SCHEMA

This schema provides a complete foundation for multi-tenant applications
with sophisticated role-based access control, permission inheritance,
and comprehensive security policies.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
-- Performance monitoring functions
create
or replace function supajump.get_permission_stats () returns table (
  total_users bigint,
  total_orgs bigint,
  total_teams bigint,
  total_roles bigint,
  total_permissions bigint,
  avg_permissions_per_user numeric
) language sql stable as $$
  select 
    (select count(*) from auth.users),
    (select count(*) from public.organizations),
    (select count(*) from public.teams),
    (select count(*) from public.roles),
    (select count(*) from public.role_permissions),
    (select avg(cnt) from (
      select count(*) as cnt 
      from supajump.user_permissions_view 
      group by user_id
    ) t)
$$;

grant
execute on function supajump.get_permission_stats () to authenticated;

-- Configuration validation function
create
or replace function supajump.validate_app_setting (key text, value jsonb) returns boolean language plpgsql as $$
begin
  case key
    when 'dynamic_roles_enabled' then
      if jsonb_typeof(value) != 'boolean' then
        raise exception 'dynamic_roles_enabled must be a boolean value';
      end if;
    -- Add more validations as needed
    else
      raise exception 'Unknown app setting: %', key;
  end case;
  return true;
end;
$$;

-- Add validation trigger
create
or replace function supajump.validate_app_settings_trigger () returns trigger language plpgsql as $$
begin
  perform supajump.validate_app_setting(NEW.key, NEW.value);
  return new;
end;
$$;

create trigger validate_app_settings before insert
or
update on public.app_settings for each row
execute function supajump.validate_app_settings_trigger ();