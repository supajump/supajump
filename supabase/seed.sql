-- Seed basic roles for organizations and teams
-- Insert organization-scoped roles
insert into
    roles (scope, name, display_name, description)
values
    (
        'organization',
        'owner',
        'Owner',
        'Full access to the organization including billing and member management'
    ),
    (
        'organization',
        'admin',
        'Admin',
        'Administrative access to the organization excluding billing'
    ),
    (
        'organization',
        'member',
        'Member',
        'Basic member access to the organization'
    ) on conflict (scope, name)
do nothing;

-- Insert team-scoped roles
insert into
    roles (scope, name, display_name, description)
values
    (
        'team',
        'owner',
        'Team Owner',
        'Full access to the team including member management'
    ),
    (
        'team',
        'admin',
        'Team Admin',
        'Administrative access to the team'
    ),
    (
        'team',
        'member',
        'Team Member',
        'Basic member access to the team'
    ),
    (
        'team',
        'post_editor',
        'Post Editor',
        'Can create and edit posts within the team'
    ) on conflict (scope, name)
do nothing;

-- Insert basic role permissions for organization roles
-- Organization owner permissions
insert into
    role_permissions (role_id, resource, action)
select
    r.id,
    resource,
    action
from
    roles r,
    (
        values
            ('organizations', 'view'),
            ('organizations', 'edit'),
            ('organizations', 'delete'),
            ('organizations', 'manage'),
            ('billing', 'view'),
            ('billing', 'edit'),
            ('billing', 'manage'),
            ('members', 'view'),
            ('members', 'edit'),
            ('members', 'delete'),
            ('members', 'invite'),
            ('teams', 'view'),
            ('teams', 'edit'),
            ('teams', 'delete'),
            ('teams', 'create'),
            ('posts', 'view'),
            ('posts', 'edit'),
            ('posts', 'delete'),
            ('posts', 'create')
    ) as perms (resource, action)
where
    r.scope = 'organization'
    and r.name = 'owner' on conflict (role_id, resource, action)
do nothing;

-- Organization admin permissions
insert into
    role_permissions (role_id, resource, action)
select
    r.id,
    resource,
    action
from
    roles r,
    (
        values
            ('organizations', 'view'),
            ('organizations', 'edit'),
            ('members', 'view'),
            ('members', 'edit'),
            ('members', 'invite'),
            ('teams', 'view'),
            ('teams', 'edit'),
            ('teams', 'delete'),
            ('teams', 'create'),
            ('posts', 'view'),
            ('posts', 'edit'),
            ('posts', 'delete'),
            ('posts', 'create')
    ) as perms (resource, action)
where
    r.scope = 'organization'
    and r.name = 'admin' on conflict (role_id, resource, action)
do nothing;

-- Organization member permissions
insert into
    role_permissions (role_id, resource, action)
select
    r.id,
    resource,
    action
from
    roles r,
    (
        values
            ('organizations', 'view'),
            ('teams', 'view'),
            ('posts', 'view')
    ) as perms (resource, action)
where
    r.scope = 'organization'
    and r.name = 'member' on conflict (role_id, resource, action)
do nothing;

-- Team owner permissions
insert into
    role_permissions (role_id, resource, action)
select
    r.id,
    resource,
    action
from
    roles r,
    (
        values
            ('teams', 'view'),
            ('teams', 'edit'),
            ('teams', 'delete'),
            ('teams', 'manage'),
            ('team_members', 'view'),
            ('team_members', 'edit'),
            ('team_members', 'delete'),
            ('team_members', 'invite'),
            ('posts', 'view'),
            ('posts', 'edit'),
            ('posts', 'delete'),
            ('posts', 'create')
    ) as perms (resource, action)
where
    r.scope = 'team'
    and r.name = 'owner' on conflict (role_id, resource, action)
do nothing;

-- Team admin permissions
insert into
    role_permissions (role_id, resource, action)
select
    r.id,
    resource,
    action
from
    roles r,
    (
        values
            ('teams', 'view'),
            ('teams', 'edit'),
            ('team_members', 'view'),
            ('team_members', 'edit'),
            ('team_members', 'invite'),
            ('posts', 'view'),
            ('posts', 'edit'),
            ('posts', 'delete'),
            ('posts', 'create')
    ) as perms (resource, action)
where
    r.scope = 'team'
    and r.name = 'admin' on conflict (role_id, resource, action)
do nothing;

-- Team member permissions
insert into
    role_permissions (role_id, resource, action)
select
    r.id,
    resource,
    action
from
    roles r,
    (
        values
            ('teams', 'view'),
            ('team_members', 'view'),
            ('posts', 'view')
    ) as perms (resource, action)
where
    r.scope = 'team'
    and r.name = 'member' on conflict (role_id, resource, action)
do nothing;

-- Team post editor permissions
insert into
    role_permissions (role_id, resource, action)
select
    r.id,
    resource,
    action
from
    roles r,
    (
        values
            ('teams', 'view'),
            ('team_members', 'view'),
            ('posts', 'view'),
            ('posts', 'edit'),
            ('posts', 'create')
    ) as perms (resource, action)
where
    r.scope = 'team'
    and r.name = 'post_editor' on conflict (role_id, resource, action)
do nothing;