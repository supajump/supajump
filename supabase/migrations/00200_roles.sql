-- ────────────────────────
-- 1  ROLES
-- scope = 'organization' | 'team'
-- name  = 'owner' | 'admin' | 'member' | 'post_editor' | …
-- ────────────────────────
create table
    roles (
        id uuid primary key default gen_random_uuid (),
        scope text not null check (scope in ('organization', 'team')),
        org_id text not null references organizations (id) on delete cascade,
        team_id text references teams (id) on delete cascade,
        name text not null,
        display_name text,
        description text,
        unique (org_id, team_id, scope, name),
        unique (org_id, scope, name)
    );

alter table roles enable row level security;

-- ────────────────────────
-- 2  ROLE ↔ PERMISSION MATRIX
-- resource  = logical entity (posts, billing, settings …)
-- action    = view | edit | delete | manage …
-- ────────────────────────
create table
    role_permissions (
        id uuid primary key default gen_random_uuid (),
        role_id uuid references roles (id) on delete cascade,
        org_id text not null references organizations (id) on delete cascade,
        team_id text references teams (id) on delete cascade,
        resource text not null,
        action text not null,
        unique (org_id, team_id, role_id, resource, action),
        unique (org_id, role_id, resource, action)
    );

alter table role_permissions enable row level security;