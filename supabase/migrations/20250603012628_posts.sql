create table "public"."posts" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone,
    "slug" text,
    "title" text,
    "content" text,
    "post_status" text not null default 'draft'::text,
    "post_type" text not null default 'post'::text,
    "org_id" text not null,
    "team_id" text not null
);


alter table "public"."posts" enable row level security;

CREATE UNIQUE INDEX posts_pkey ON public.posts USING btree (id);

CREATE INDEX posts_slug_idx ON public.posts USING btree (slug);

CREATE INDEX posts_team_id_idx ON public.posts USING btree (team_id);

CREATE UNIQUE INDEX posts_team_id_slug_key ON public.posts USING btree (team_id, slug);

alter table "public"."posts" add constraint "posts_pkey" PRIMARY KEY using index "posts_pkey";

alter table "public"."posts" add constraint "posts_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."posts" validate constraint "posts_org_id_fkey";

alter table "public"."posts" add constraint "posts_status_check" CHECK ((post_status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))) not valid;

alter table "public"."posts" validate constraint "posts_status_check";

alter table "public"."posts" add constraint "posts_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE not valid;

alter table "public"."posts" validate constraint "posts_team_id_fkey";

alter table "public"."posts" add constraint "posts_team_id_slug_key" UNIQUE using index "posts_team_id_slug_key";

grant delete on table "public"."posts" to "anon";

grant insert on table "public"."posts" to "anon";

grant references on table "public"."posts" to "anon";

grant select on table "public"."posts" to "anon";

grant trigger on table "public"."posts" to "anon";

grant truncate on table "public"."posts" to "anon";

grant update on table "public"."posts" to "anon";

grant delete on table "public"."posts" to "authenticated";

grant insert on table "public"."posts" to "authenticated";

grant references on table "public"."posts" to "authenticated";

grant select on table "public"."posts" to "authenticated";

grant trigger on table "public"."posts" to "authenticated";

grant truncate on table "public"."posts" to "authenticated";

grant update on table "public"."posts" to "authenticated";

grant delete on table "public"."posts" to "service_role";

grant insert on table "public"."posts" to "service_role";

grant references on table "public"."posts" to "service_role";

grant select on table "public"."posts" to "service_role";

grant trigger on table "public"."posts" to "service_role";

grant truncate on table "public"."posts" to "service_role";

grant update on table "public"."posts" to "service_role";

CREATE TRIGGER set_posts_timestamp BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION supajump.trigger_set_timestamps();


