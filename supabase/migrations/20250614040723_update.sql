drop policy "only team members can insert posts" on "public"."posts";

drop policy "only team members can select posts" on "public"."posts";

drop policy "only team members can update posts" on "public"."posts";

create policy "Users can view other organization members"
on "public"."org_memberships"
as permissive
for select
to authenticated
using (has_org_permission(org_id, 'org_memberships'::text, 'view'::text));


create policy "Users can view organizations they are members of"
on "public"."organizations"
as permissive
for select
to authenticated
using ((id IN ( SELECT supajump.get_organizations_for_current_user() AS get_organizations_for_current_user)));


create policy "Users can view teams they are members of"
on "public"."teams"
as permissive
for select
to authenticated
using ((id IN ( SELECT supajump.get_teams_for_current_user() AS get_teams_for_current_user)));


create policy "only team members can insert posts"
on "public"."posts"
as permissive
for insert
to authenticated
with check ((has_team_permission(team_id, 'posts'::text, 'insert'::text) OR has_org_permission(org_id, 'posts'::text, 'insert'::text)));


create policy "only team members can select posts"
on "public"."posts"
as permissive
for select
to authenticated
using ((has_team_permission(team_id, 'posts'::text, 'select'::text) OR has_org_permission(org_id, 'posts'::text, 'select'::text)));


create policy "only team members can update posts"
on "public"."posts"
as permissive
for update
to authenticated
using ((has_team_permission(team_id, 'posts'::text, 'update'::text) OR has_org_permission(org_id, 'posts'::text, 'update'::text)))
with check ((has_team_permission(team_id, 'posts'::text, 'update'::text) OR has_org_permission(org_id, 'posts'::text, 'update'::text)));



