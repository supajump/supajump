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
        org_id text not null references public.organizations (id) on delete cascade,
        team_id text not null references public.teams (id) on delete cascade,
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

-- triggers
create
or replace trigger set_posts_timestamp before insert
or
update on public.posts for each row
execute function supajump.trigger_set_timestamps ();

-- row level security
create policy "only team members can delete posts" on public.posts for delete to authenticated using (
    (has_team_permission (team_id, 'posts', 'delete'))
    or has_org_permission (org_id, 'posts', 'delete')
);

create policy "only team members can insert posts" on public.posts for insert to authenticated
with
    check (
        (has_team_permission (team_id, 'posts', 'create'))
        or has_org_permission (org_id, 'posts', 'create')
    );

create policy "only team members can select posts" on public.posts for
select
    to authenticated using (
        (has_team_permission (team_id, 'posts', 'view'))
        or has_org_permission (org_id, 'posts', 'view')
    );

create policy "only team members can update posts" on public.posts for
update to authenticated using (
    (has_team_permission (team_id, 'posts', 'edit'))
    or has_org_permission (org_id, 'posts', 'edit')
)
with
    check (
        (has_team_permission (team_id, 'posts', 'edit'))
        or has_org_permission (org_id, 'posts', 'edit')
    );