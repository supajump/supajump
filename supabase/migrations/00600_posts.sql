-- posts table
create table if not exists
    public.posts (
        id uuid primary key default gen_random_uuid (),
        created_at timestamp with time zone default now(),
        updated_at timestamp with time zone,
        slug text,
        title text,
        content text,
        post_status text default 'draft' not null,
        post_type text default 'post'::text not null,
        org_id uuid not null references public.organizations (id) on delete cascade,
        team_id uuid not null references public.teams (id) on delete cascade,
        owner_id uuid references auth.users (id) on delete set null default auth.uid (),
        constraint posts_team_id_slug_key unique (team_id, slug),
        constraint posts_status_check check (post_status in ('draft', 'published', 'archived'))
    );

alter table public.posts enable row level security;

-- indexes
create index posts_team_id_idx on public.posts using btree (team_id);

create index posts_slug_idx on public.posts using btree (slug);

create index posts_org_id_idx on public.posts using btree (org_id);

create index posts_post_status_idx on public.posts using btree (post_status);

create index posts_created_at_idx on public.posts using btree (created_at desc);

create index posts_team_status_created_idx on public.posts using btree (team_id, post_status, created_at desc);

create index posts_org_status_created_idx on public.posts using btree (org_id, post_status, created_at desc);

create index posts_owner_id_idx on public.posts using btree (owner_id);

-- triggers
create
or replace trigger set_posts_timestamp before insert
or
update on public.posts for each row
execute function supajump.trigger_set_timestamps ();

-- row level security policies
create policy "rls_select_posts" on public.posts for
select
    to authenticated using (
        -- Team-level permissions
        exists (
            select
                1
            from
                supajump.user_permissions_view up
            where
                up.user_id = auth.uid ()
                and up.group_id = posts.team_id
                and up.resource = 'posts'
                and up.action = 'view'
                and (
                    up.scope = 'all'
                    or (
                        up.scope = 'own'
                        and posts.owner_id = auth.uid ()
                    )
                )
        )
        -- Organization-level permissions
        or exists (
            select
                1
            from
                supajump.user_permissions_view up
            where
                up.user_id = auth.uid ()
                and up.group_id = posts.org_id
                and up.resource = 'posts'
                and up.action = 'view'
                and (
                    up.scope = 'all'
                    or (
                        up.scope = 'own'
                        and posts.owner_id = auth.uid ()
                    )
                )
        )
        -- Team primary owner bypass
        or exists (
            select
                1
            from
                teams t
            where
                t.id = posts.team_id
                and t.primary_owner_user_id = auth.uid ()
        )
        -- Organization primary owner bypass
        or exists (
            select
                1
            from
                organizations o
            where
                o.id = posts.org_id
                and o.primary_owner_user_id = auth.uid ()
        )
    );

create policy "rls_insert_posts" on public.posts for insert to authenticated
with
    check (
        -- Team-level permissions
        exists (
            select
                1
            from
                supajump.user_permissions_view up
            where
                up.user_id = auth.uid ()
                and up.group_id = team_id
                and up.resource = 'posts'
                and up.action = 'create'
                and (
                    up.scope = 'all'
                    or (
                        up.scope = 'own'
                        and owner_id = auth.uid ()
                    )
                )
        )
        -- Organization-level permissions
        or exists (
            select
                1
            from
                supajump.user_permissions_view up
            where
                up.user_id = auth.uid ()
                and up.group_id = org_id
                and up.resource = 'posts'
                and up.action = 'create'
                and (
                    up.scope = 'all'
                    or (
                        up.scope = 'own'
                        and owner_id = auth.uid ()
                    )
                )
        )
        -- Team primary owner bypass
        or exists (
            select
                1
            from
                teams t
            where
                t.id = team_id
                and t.primary_owner_user_id = auth.uid ()
        )
        -- Organization primary owner bypass
        or exists (
            select
                1
            from
                organizations o
            where
                o.id = org_id
                and o.primary_owner_user_id = auth.uid ()
        )
    );

create policy "rls_update_posts" on public.posts for
update to authenticated using (
    -- Team-level permissions
    exists (
        select
            1
        from
            supajump.user_permissions_view up
        where
            up.user_id = auth.uid ()
            and up.group_id = posts.team_id
            and up.resource = 'posts'
            and up.action = 'edit'
            and (
                up.scope = 'all'
                or (
                    up.scope = 'own'
                    and posts.owner_id = auth.uid ()
                )
            )
    )
    -- Organization-level permissions
    or exists (
        select
            1
        from
            supajump.user_permissions_view up
        where
            up.user_id = auth.uid ()
            and up.group_id = posts.org_id
            and up.resource = 'posts'
            and up.action = 'edit'
            and (
                up.scope = 'all'
                or (
                    up.scope = 'own'
                    and posts.owner_id = auth.uid ()
                )
            )
    )
    -- Team primary owner bypass
    or exists (
        select
            1
        from
            teams t
        where
            t.id = posts.team_id
            and t.primary_owner_user_id = auth.uid ()
    )
    -- Organization primary owner bypass
    or exists (
        select
            1
        from
            organizations o
        where
            o.id = posts.org_id
            and o.primary_owner_user_id = auth.uid ()
    )
)
with
    check (
        -- Team-level permissions
        exists (
            select
                1
            from
                supajump.user_permissions_view up
            where
                up.user_id = auth.uid ()
                and up.group_id = team_id
                and up.resource = 'posts'
                and up.action = 'edit'
                and (
                    up.scope = 'all'
                    or (
                        up.scope = 'own'
                        and owner_id = auth.uid ()
                    )
                )
        )
        -- Organization-level permissions
        or exists (
            select
                1
            from
                supajump.user_permissions_view up
            where
                up.user_id = auth.uid ()
                and up.group_id = org_id
                and up.resource = 'posts'
                and up.action = 'edit'
                and (
                    up.scope = 'all'
                    or (
                        up.scope = 'own'
                        and owner_id = auth.uid ()
                    )
                )
        )
        -- Team primary owner bypass
        or exists (
            select
                1
            from
                teams t
            where
                t.id = team_id
                and t.primary_owner_user_id = auth.uid ()
        )
        -- Organization primary owner bypass
        or exists (
            select
                1
            from
                organizations o
            where
                o.id = org_id
                and o.primary_owner_user_id = auth.uid ()
        )
    );

create policy "rls_delete_posts" on public.posts for delete to authenticated using (
    -- Team-level permissions
    exists (
        select
            1
        from
            supajump.user_permissions_view up
        where
            up.user_id = auth.uid ()
            and up.group_id = posts.team_id
            and up.resource = 'posts'
            and up.action = 'delete'
            and (
                up.scope = 'all'
                or (
                    up.scope = 'own'
                    and posts.owner_id = auth.uid ()
                )
            )
    )
    -- Organization-level permissions
    or exists (
        select
            1
        from
            supajump.user_permissions_view up
        where
            up.user_id = auth.uid ()
            and up.group_id = posts.org_id
            and up.resource = 'posts'
            and up.action = 'delete'
            and (
                up.scope = 'all'
                or (
                    up.scope = 'own'
                    and posts.owner_id = auth.uid ()
                )
            )
    )
    -- Team primary owner bypass
    or exists (
        select
            1
        from
            teams t
        where
            t.id = posts.team_id
            and t.primary_owner_user_id = auth.uid ()
    )
    -- Organization primary owner bypass
    or exists (
        select
            1
        from
            organizations o
        where
            o.id = posts.org_id
            and o.primary_owner_user_id = auth.uid ()
    )
);