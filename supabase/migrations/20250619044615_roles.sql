drop policy "Users can view other organization members" on "public"."org_memberships";

drop policy "only team members can insert posts" on "public"."posts";

drop policy "only team members can select posts" on "public"."posts";

drop policy "only team members can update posts" on "public"."posts";

create policy "Primary owners of organization can create role permissions"
on "public"."role_permissions"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.primary_owner_user_id = auth.uid()) AND (o.id = role_permissions.org_id)))));


create policy "Primary owners of organization can delete role permissions"
on "public"."role_permissions"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.primary_owner_user_id = auth.uid()) AND (o.id = role_permissions.org_id)))));


create policy "Primary owners of organization can update role permissions"
on "public"."role_permissions"
as permissive
for update
to public
with check ((EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.primary_owner_user_id = auth.uid()) AND (o.id = role_permissions.org_id)))));


create policy "Primary owners of organization can view role permissions"
on "public"."role_permissions"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.primary_owner_user_id = auth.uid()) AND (o.id = role_permissions.org_id)))));


create policy "Primary owners of organization can create roles"
on "public"."roles"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.primary_owner_user_id = auth.uid()) AND (o.id = roles.org_id)))));


create policy "Primary owners of organization can delete roles"
on "public"."roles"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.primary_owner_user_id = auth.uid()) AND (o.id = roles.org_id)))));


create policy "Primary owners of organization can update roles"
on "public"."roles"
as permissive
for update
to public
with check ((EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.primary_owner_user_id = auth.uid()) AND (o.id = roles.org_id)))));


create policy "Primary owners of organization can view roles"
on "public"."roles"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.primary_owner_user_id = auth.uid()) AND (o.id = roles.org_id)))));


create policy "Users can view other organization members"
on "public"."org_memberships"
as permissive
for select
to authenticated
using ((has_org_permission(org_id, 'org_memberships'::text, 'view'::text) OR (org_id IN ( SELECT org_memberships.org_id
   FROM organizations
  WHERE (organizations.primary_owner_user_id = auth.uid())))));


create policy "only team members can insert posts"
on "public"."posts"
as permissive
for insert
to authenticated
with check ((has_team_permission(team_id, 'posts'::text, 'create'::text) OR has_org_permission(org_id, 'posts'::text, 'create'::text)));


create policy "only team members can select posts"
on "public"."posts"
as permissive
for select
to authenticated
using ((has_team_permission(team_id, 'posts'::text, 'view'::text) OR has_org_permission(org_id, 'posts'::text, 'view'::text)));


create policy "only team members can update posts"
on "public"."posts"
as permissive
for update
to authenticated
using ((has_team_permission(team_id, 'posts'::text, 'edit'::text) OR has_org_permission(org_id, 'posts'::text, 'edit'::text)))
with check ((has_team_permission(team_id, 'posts'::text, 'edit'::text) OR has_org_permission(org_id, 'posts'::text, 'edit'::text)));



