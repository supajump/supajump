/**
 * USAGE METERS
 * Define how usage events are aggregated for billing.
 */
create table if not exists
    public.usage_meters (
        id uuid primary key default gen_random_uuid(),
        created_at timestamp with time zone default now(),
        updated_at timestamp with time zone,
        org_id text not null references public.organizations (id) on delete cascade,
        name text not null,
        description text,
        event_name text not null,
        aggregation text not null check (aggregation in ('count', 'sum')),
        property text
    );

alter table public.usage_meters enable row level security;

-- triggers
create trigger set_timestamps_usage_meters before insert or update on public.usage_meters
for each row execute function supajump.trigger_set_timestamps();

-- No policies as these tables are managed via server-side endpoints.

/**
 * USAGE EVENTS
 * Raw events that increment meters and consume credits.
 */
create table if not exists
    public.usage_events (
        id uuid primary key default gen_random_uuid(),
        created_at timestamp with time zone default now(),
        updated_at timestamp with time zone,
        org_id text not null references public.organizations (id) on delete cascade,
        meter_id uuid references public.usage_meters (id) on delete cascade,
        user_id uuid references auth.users (id) on delete set null,
        quantity numeric not null default 1,
        metadata jsonb
    );

alter table public.usage_events enable row level security;

-- indexes
create index if not exists usage_events_org_id_idx on public.usage_events using btree (org_id);
create index if not exists usage_events_meter_id_idx on public.usage_events using btree (meter_id);
create index if not exists usage_events_created_at_idx on public.usage_events using btree (created_at desc);

-- triggers
create trigger set_timestamps_usage_events before insert or update on public.usage_events
for each row execute function supajump.trigger_set_timestamps();

-- No policies as these tables are managed via server-side endpoints.

/**
 * METER CREDITS
 * Credits balance that can be consumed by usage events.
 */
create table if not exists
    public.meter_credits (
        id uuid primary key default gen_random_uuid(),
        created_at timestamp with time zone default now(),
        updated_at timestamp with time zone,
        org_id text not null references public.organizations (id) on delete cascade,
        meter_id uuid references public.usage_meters (id) on delete cascade,
        quantity numeric not null,
        remaining numeric not null,
        expires_at timestamp with time zone
    );

alter table public.meter_credits enable row level security;

create index if not exists meter_credits_org_id_idx on public.meter_credits using btree (org_id);
create index if not exists meter_credits_meter_id_idx on public.meter_credits using btree (meter_id);

-- triggers
create trigger set_timestamps_meter_credits before insert or update on public.meter_credits
for each row execute function supajump.trigger_set_timestamps();

-- No policies as these tables are managed via server-side endpoints.
