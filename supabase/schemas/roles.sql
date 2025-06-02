-- ────────────────────────
-- 1  ROLES
-- scope = 'organization' | 'team'
-- name  = 'owner' | 'admin' | 'member' | 'post_editor' | …
-- ────────────────────────
create table
    roles (
        id uuid primary key default gen_random_uuid (),
        scope text not null check (scope in ('organization', 'team')),
        name text not null,
        display_name text,
        description text,
        unique (scope, name)
    );

alter table roles enable row level security;

-- ────────────────────────
-- 2  ROLE ↔ PERMISSION MATRIX
-- resource  = logical entity (posts, billing, settings …)
-- action    = view | edit | delete | manage …
-- ────────────────────────
create table
    role_permissions (
        role_id uuid references roles (id) on delete cascade,
        resource text not null,
        action text not null,
        primary key (role_id, resource, action)
    );

alter table role_permissions enable row level security;