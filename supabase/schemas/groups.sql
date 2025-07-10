create table
    public.groups (
        id uuid primary key, -- mirrors org/team id
        org_id uuid not null references public.organizations (id), -- parent org_id, for orgs this is the org_id itself
        type text not null check (
            type in ('organization', 'team')
        ),
        primary_owner_user_id uuid not null references public.users (id),
        created_at timestamp with time zone default now()
    );

alter table public.groups enable row level security;

create index idx_groups_org_id_id on public.groups (org_id, id);

/*--- sync triggers (fast upsert) --------------------------------*/
create
or replace function public.trg_sync_org () returns trigger language plpgsql as $$
begin
  insert into public.groups(id, org_id, kind, primary_owner_user_id)
  values (new.id, new.id, 'org', new.primary_owner_user_id)
  on conflict(id) do update
      set primary_owner_user_id = excluded.primary_owner_user_id;
  return new;
end $$;

create trigger trg_org_sync
after insert
or
update on public.organizations for each row
execute procedure public.trg_sync_org ();

create
or replace function public.trg_sync_team () returns trigger language plpgsql as $$
begin
  insert into public.groups(id, org_id, kind, primary_owner_user_id)
  values (new.id, new.org_id, 'team', new.primary_owner_user_id)
  on conflict(id) do update
      set org_id = excluded.org_id,
          primary_owner_user_id = excluded.primary_owner_user_id;
  return new;
end $$;

create trigger trg_team_sync
after insert
or
update on public.teams for each row
execute procedure public.trg_sync_team ();