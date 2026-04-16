-- Enable pgcrypto for SHA-256 hashing
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────

create table pins (
  id             uuid primary key default gen_random_uuid(),
  lat            float8 not null,
  lng            float8 not null,
  rent           int not null,
  bhk            int not null check (bhk between 1 and 5),
  furnished      text not null check (furnished in ('furnished','semi','unfurnished')),
  gated          bool not null,
  maintenance    text not null check (maintenance in ('included','excluded')),
  tenant_type    text not null check (tenant_type in ('family','bachelor','any')),
  deposit_months int not null check (deposit_months between 1 and 12),
  pets           bool not null,
  available      bool not null default true,
  locality       text,
  sqft           int,
  device_id      text not null,
  ip_hash        text not null,
  report_count   int not null default 0,
  verified       bool not null default false,
  is_seed        bool not null default false,
  created_at     timestamptz not null default now()
);

create table pin_reports (
  id         uuid primary key default gen_random_uuid(),
  pin_id     uuid not null references pins(id) on delete cascade,
  ip_hash    text not null,
  created_at timestamptz not null default now(),
  unique(pin_id, ip_hash)
);

create table pin_emails (
  id         uuid primary key default gen_random_uuid(),
  pin_id     uuid not null references pins(id) on delete cascade unique,
  email      text not null,
  created_at timestamptz not null default now()
);

create table rate_limits (
  device_id    text primary key,
  pin_count    int not null default 0,
  window_start timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

alter table pins enable row level security;
alter table pin_reports enable row level security;
alter table pin_emails enable row level security;
alter table rate_limits enable row level security;

-- pins: anyone can SELECT; INSERT/UPDATE/DELETE only via RPC (security definer)
create policy "pins_select" on pins for select using (true);

-- pin_reports: no direct access for anon
-- pin_emails: no direct access for anon
-- rate_limits: no direct access for anon
-- (no policies added = default deny for those tables)

-- ─────────────────────────────────────────
-- RPC: add_pin
-- ─────────────────────────────────────────

create or replace function add_pin(p_pin jsonb, p_device_id text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_ip_hash     text;
  v_count       int;
  v_window      timestamptz;
  v_rent        int;
  v_bhk         int;
  v_min         int;
  v_max         int;
  v_new_id      uuid;
begin
  -- Hash the client IP from the request header
  v_ip_hash := encode(
    digest(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', 'unknown'), 'sha256'),
    'hex'
  );

  -- Rate limit check
  select pin_count, window_start
  into v_count, v_window
  from rate_limits
  where device_id = p_device_id;

  if found then
    if now() - v_window < interval '24 hours' then
      if v_count >= 3 then
        raise exception 'RATE_LIMITED';
      end if;
    else
      -- Window expired, reset
      update rate_limits set pin_count = 0, window_start = now() where device_id = p_device_id;
      v_count := 0;
    end if;
  end if;

  -- Plausibility gate
  v_rent := (p_pin->>'rent')::int;
  v_bhk  := (p_pin->>'bhk')::int;

  select min_rent, max_rent into v_min, v_max from (values
    (1, 5000,  80000),
    (2, 8000,  150000),
    (3, 12000, 250000),
    (4, 20000, 400000),
    (5, 30000, 600000)
  ) as t(bhk, min_rent, max_rent)
  where t.bhk = v_bhk;

  if v_rent < v_min or v_rent > v_max then
    raise exception 'IMPLAUSIBLE_RENT';
  end if;

  -- Insert pin
  insert into pins (
    lat, lng, rent, bhk, furnished, gated, maintenance,
    tenant_type, deposit_months, pets, available, locality,
    device_id, ip_hash, is_seed
  ) values (
    (p_pin->>'lat')::float8,
    (p_pin->>'lng')::float8,
    v_rent,
    v_bhk,
    p_pin->>'furnished',
    (p_pin->>'gated')::bool,
    p_pin->>'maintenance',
    p_pin->>'tenantType',
    (p_pin->>'depositMonths')::int,
    (p_pin->>'pets')::bool,
    coalesce((p_pin->>'available')::bool, true),
    nullif(p_pin->>'locality', ''),
    p_device_id,
    v_ip_hash,
    false
  )
  returning id into v_new_id;

  -- Upsert rate limit
  insert into rate_limits (device_id, pin_count, window_start)
  values (p_device_id, 1, now())
  on conflict (device_id) do update
    set pin_count = rate_limits.pin_count + 1;

  return v_new_id;
end;
$$;

-- ─────────────────────────────────────────
-- RPC: report_pin
-- ─────────────────────────────────────────

create or replace function report_pin(p_pin_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_ip_hash text;
  v_count   int;
begin
  v_ip_hash := encode(
    digest(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', 'unknown'), 'sha256'),
    'hex'
  );

  insert into pin_reports (pin_id, ip_hash) values (p_pin_id, v_ip_hash);

  update pins set report_count = report_count + 1 where id = p_pin_id
  returning report_count into v_count;

  if v_count >= 3 then
    update pins set available = false where id = p_pin_id;
  end if;
end;
$$;

-- ─────────────────────────────────────────
-- RPC: claim_pin
-- ─────────────────────────────────────────

create or replace function claim_pin(p_pin_id uuid, p_email text)
returns void
language plpgsql
security definer
as $$
begin
  if p_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'INVALID_EMAIL';
  end if;

  insert into pin_emails (pin_id, email) values (p_pin_id, p_email);
  update pins set verified = true where id = p_pin_id;
end;
$$;
