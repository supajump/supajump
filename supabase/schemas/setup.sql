comment on schema public is 'standard public schema';

create extension if not exists http
with
    schema extensions;

create extension if not exists pg_tle;

create extension if not exists pgtap
with
    schema extensions;

create schema if not exists supajump;

grant usage on schema supajump to authenticated;

grant usage on schema supajump to service_role;

create
or replace function public.increment_rank_order (rank_val text) returns text language plpgsql as $$
declare
    valid_chars constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    idx         int;
    prefix      text;
    last_char   text;
begin
    -- if rank_val is empty, seed with "a0" or something you like
    if rank_val = '' then
        return 'a0';
    end if;

    last_char := right(rank_val, 1);

    -- find the position (1-based) of the last character within valid_chars.
    -- we'll subtract 1 from that to make it 0-based for easier logic.
    idx := strpos(valid_chars, last_char) - 1;

    if idx = -1 then
        ----------------------------------------------------------------------
        -- last_char was not in valid_chars at all
        -- fallback: just append '0' or first valid char
        ----------------------------------------------------------------------
        return rank_val || '0';
    elsif idx < length(valid_chars) - 1 then
        ----------------------------------------------------------------------
        -- we can increment within the valid_chars range
        -- e.g., if last_char = 'z' (position 35 in a 0-based index),
        -- next char is 'a' (position 36).
        ----------------------------------------------------------------------
        prefix := left(rank_val, length(rank_val) - 1);
        return prefix || substr(valid_chars, idx + 2, 1);
    else
        ----------------------------------------------------------------------
        -- last_char is the highest valid character (e.g., 'z' in base62).
        -- we'll keep it the same and append '0' or the first valid character.
        ----------------------------------------------------------------------
        return rank_val || '0';
    end if;
end;
$$;

create
or replace function public.is_valid_org_id (input_text text) returns boolean language plpgsql security definer as $_$
begin
  return input_text ~ '^[0-9a-z]{16}$';
end;
$_$;

create
or replace function public.is_valid_team_id (input_text text) returns boolean language plpgsql security definer as $_$
begin
  return input_text ~ '^[0-9a-z]{16}$';
end;
$_$;

create
or replace function public.is_valid_team_name (input_text text) returns boolean language plpgsql security definer as $_$
begin
  -- Check if the team name is between 1 and 60 characters and contains only alphanumeric characters, hyphens, underscores, and spaces
  return input_text is not null
    and length(input_text) >= 1
    and length(input_text) <= 60
    and input_text ~ '^[a-zA-Z0-9\s_-]+$';
end;
$_$;

create
or replace function public.nanoid (
    size integer default 16,
    alphabet text default '0123456789abcdefghijklmnopqrstuvwxyz'::text
) returns text language plpgsql as $$
declare
    idbuilder      text := '';
    counter        int  := 0;
    bytes          bytea;
    alphabetindex  int;
    alphabetarray  text[];
    alphabetlength int;
    mask           int;
    step           int;
begin
    alphabetarray := regexp_split_to_array(alphabet, '');
    alphabetlength := array_length(alphabetarray, 1);
    mask := (2 << cast(floor(log(alphabetlength - 1) / log(2)) as int)) - 1;
    step := cast(ceil(1.6 * mask * size / alphabetlength) as int);

    while true
        loop
            bytes := extensions.gen_random_bytes(step);
            while counter < step
                loop
                    alphabetindex := (get_byte(bytes, counter) & mask) + 1;
                    if alphabetindex <= alphabetlength then
                        idbuilder := idbuilder || alphabetarray[alphabetindex];
                        if length(idbuilder) = size then
                            return idbuilder;
                        end if;
                    end if;
                    counter := counter + 1;
                end loop;

            counter := 0;
        end loop;
end
$$;

alter function public.nanoid (size integer, alphabet text) owner to postgres;

create
or replace function public.set_default_rank_order () returns trigger language plpgsql security definer as $_$
declare
    last_rank       text;
    rank_order_col  text := tg_argv[0];  -- e.g., 'rank_order'
    grouping_col    text := tg_argv[1];  -- e.g., 'import_schema_id'
    table_name      text := tg_table_name;
    grouping_val    text;
    records_exist   boolean;
begin
    -------------------------------------------------------------------------
    -- 1) Safety-check: only allow 'rank_order'
    -------------------------------------------------------------------------
    if rank_order_col != 'rank_order' then
        raise exception 'This trigger only supports column name "rank_order"';
    end if;

    -------------------------------------------------------------------------
    -- 2) If NEW.rank_order is already set (non-null & non-empty), just return
    -------------------------------------------------------------------------
    if coalesce(new.rank_order, '') <> '' then
        return new;
    end if;

    -------------------------------------------------------------------------
    -- 3) Dynamically fetch the grouping_col from NEW
    --    (e.g., NEW.import_schema_id -> grouping_val)
    -------------------------------------------------------------------------
    execute format('SELECT ($1).%I::text', grouping_col)
       into grouping_val
       using new;

    if grouping_val is null then
        raise exception 'Column "%" cannot be NULL for rank ordering',
                        grouping_col;
    end if;

    -------------------------------------------------------------------------
    -- 4) Check if there are any rows in this table for that group
    -------------------------------------------------------------------------
    execute format('
        SELECT EXISTS (
            SELECT 1
            FROM %I
            WHERE %I = $1::uuid
        )
    ', table_name, grouping_col)
    into records_exist
    using grouping_val;

    if not records_exist then
        ---------------------------------------------------------------------
        -- 4a) If it's the first row in the group, seed rank_order with "a0"
        ---------------------------------------------------------------------
        NEW.rank_order := 'a0';
    else
        ---------------------------------------------------------------------
        -- 4b) otherwise, find the highest rank in that group
        ---------------------------------------------------------------------
        execute format('
            select %i
            from %i
            where %i = $1::uuid
            order by %i desc
            limit 1
        ', rank_order_col, table_name, grouping_col, rank_order_col)
        into last_rank
        using grouping_val;

        if coalesce(last_rank, '') = '' then
            new.rank_order := 'a0';
        else
            -- for a "fractional" ordering approach, increment the last rank
            new.rank_order := increment_rank_order(last_rank);
        end if;
    end if;

    return new;
end;
$_$;

create
or replace function public.slugify (text) returns text language sql as $_$
    select replace(replace($1, ' ', '-'), '[^a-z0-9-]', '')
$_$;

create
or replace function public.get_org_member_count (org_id uuid) returns integer language plpgsql security definer as $$
declare
    member_count integer;
begin
    select count(*)
    into member_count
    from public.org_memberships
    where org_memberships.org_id = get_org_member_count.org_id;

    return member_count;
end;
$$;

create
or replace function public.get_org_member_quota (org_id uuid) returns integer language plpgsql security definer as $$
declare
    quota integer := 10; -- default quota
begin
    -- for now, return a default quota of 10 members per organization
    -- this can be enhanced later to check subscription plans
    -- select quota into quota from billing_subscriptions where org_id = get_org_member_quota.org_id;

    return quota;
end;
$$;

-- Create a schema for the supajump private functions.
create schema if not exists supajump;

grant usage on schema supajump to authenticated;

grant usage on schema supajump to service_role;

create
or replace function supajump.generate_token (length integer) returns bytea language plpgsql as $$
begin
    return replace(replace(replace(encode(gen_random_bytes(length)::bytea, 'base64'), '/', '-'), '+', '_'), '\', '-');
end
$$;

create table if not exists
    supajump.config (
        enable_personal_organizations boolean default true,
        enable_team_organizations boolean default true
    );

alter table supajump.config enable row level security;

create
or replace function supajump.get_config () returns json language plpgsql as $$
declare
    result RECORD;
begin
    select * from supajump.config limit 1 into result;
    return row_to_json(result);
end;
$$;

create
or replace function supajump.trigger_set_invitation_details () returns trigger language plpgsql as $$
begin
    NEW.invited_by_user_id = auth.uid();
    NEW.org_name = (select org_name from public.organizations where id = NEW.org_id);
    return NEW;
end
$$;

create
or replace function supajump.trigger_set_timestamps () returns trigger language plpgsql as $$
begin
    if TG_OP = 'INSERT' then
        NEW.created_at = now();
        NEW.updated_at = now();
    else
        NEW.updated_at = now();
        NEW.created_at = OLD.created_at;
    end if;
    return NEW;
end
$$;

create policy "supajump settings can be read by authenticated users" on supajump.config for
select
    to authenticated using (true);