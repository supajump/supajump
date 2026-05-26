-- Ensure UPDATE policy has USING so row-level updates are allowed for permitted users
drop policy if exists "rls_posts_update" on public.posts;

create policy "rls_posts_update" on public.posts
for update to authenticated
using (
  supajump.has_permission('posts', 'edit', org_id, team_id, owner_id)
)
with check (
  supajump.has_permission('posts', 'edit', org_id, team_id, owner_id)
);
