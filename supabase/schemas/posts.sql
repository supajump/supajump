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

-- triggers
create
or replace trigger set_posts_timestamp before insert
or
update on public.posts for each row
execute function supajump.trigger_set_timestamps ();

-- row level security
-- create policy "only team members can delete posts" on public.posts for delete to authenticated using (
--     (
--         team_id in (
--             select
--                 supajump.get_teams_for_current_user () as get_teams_for_current_user
--         )
--     )
-- );
-- create policy "only team members can insert posts" on public.posts for insert to authenticated
-- with
--     check (
--         (
--             team_id in (
--                 select
--                     supajump.get_teams_for_current_user () as get_teams_for_current_user
--             )
--         )
--     );
-- create policy "only team members can select posts" on public.posts for
-- select
--     to authenticated using (
--         (
--             team_id in (
--                 select
--                     supajump.get_teams_for_current_user () as get_teams_for_current_user
--             )
--         )
--     );
-- create policy "only team members can update posts" on public.posts for
-- update to authenticated using (
--     (
--         team_id in (
--             select
--                 supajump.get_teams_for_current_user () as get_teams_for_current_user
--         )
--     )
-- )
-- with
--     check (
--         (
--             team_id in (
--                 select
--                     supajump.get_teams_for_current_user () as get_teams_for_current_user
--             )
--         )
--     );