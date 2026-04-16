# Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap the data layer from localStorage to Supabase (PostgreSQL) so every pin is permanently stored and visible to all visitors — enabling the crowdsourcing flywheel.

**Architecture:** Thin swap — PinService keeps its public API but all internals become async Supabase calls. All Zustand stores and React components updated for async. EmailClaimModal added as post-submit soft prompt for optional email (feeds matching engine + Verified badge). All security-sensitive operations (rate limiting, IP hashing, reporting) go through server-side Supabase RPC functions.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Supabase (PostgreSQL + RLS + RPC), @supabase/supabase-js, Vitest

**Spec:** `docs/superpowers/specs/2026-04-16-supabase-migration-design.md`

---

## File Structure

**New files:**
```
src/lib/supabase.ts                          — Supabase client (singleton)
src/lib/deviceId.ts                          — device ID via crypto.randomUUID() + localStorage
src/components/Modals/EmailClaimModal.tsx    — post-submit email prompt
src/components/Modals/EmailClaimModal.module.css
src/components/Modals/EmailClaimModal.test.tsx
supabase/migrations/001_initial.sql          — schema + RLS + RPC functions
supabase/seed.sql                            — 30 seed pins as SQL INSERTs
```

**Modified files:**
```
src/types/Pin.ts                             — add verified, isSeed fields
src/services/PinService.ts                   — full async rewrite, Supabase-backed
src/store/usePinStore.ts                     — async actions + loading state
src/store/useUIStore.ts                      — add 'emailClaim' modal + pendingPinId
src/components/Modals/PinSubmitModal.tsx     — async submit + error states + emailClaim transition
src/App.tsx                                  — render EmailClaimModal
.env.example                                 — add VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

---

### Task 1: Install Supabase client + scaffold lib files + update .env.example

- [ ] Install `@supabase/supabase-js`:
  ```bash
  npm install @supabase/supabase-js
  ```
  Expected: package added to `node_modules`, `package.json` updated.

- [ ] Update `.env.example` to add Supabase vars (read existing file first, then replace):
  ```env
  VITE_MAPBOX_TOKEN=pk.your_token_here
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...your_anon_key_here
  ```

- [ ] Create `src/lib/supabase.ts`:
  ```typescript
  import { createClient } from '@supabase/supabase-js'

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set — copy .env.example to .env.local',
    )
  }

  export const supabase = createClient(supabaseUrl, supabaseAnonKey)
  ```

- [ ] Create `src/lib/deviceId.ts`:
  ```typescript
  const KEY = 'hyd_device_id'

  export function getDeviceId(): string {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  }
  ```

- [ ] Run type check to make sure no errors from new files:
  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors (these are new standalone files, no consumers yet).

- [ ] Commit:
  ```bash
  git add src/lib/supabase.ts src/lib/deviceId.ts .env.example package.json package-lock.json
  git commit -m "feat: install @supabase/supabase-js, scaffold supabase client and deviceId lib"
  ```

---

### Task 2: SQL migration — schema + RLS + RPC functions

- [ ] Create directory:
  ```bash
  mkdir -p supabase/migrations
  ```

- [ ] Create `supabase/migrations/001_initial.sql` with the full content below. This file is run once in the Supabase SQL editor or via `supabase db push`. Copy exactly:

  ```sql
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
  ```

- [ ] Commit:
  ```bash
  git add supabase/migrations/001_initial.sql
  git commit -m "feat: add Supabase migration — schema, RLS, RPC functions"
  ```

---

### Task 3: Seed SQL — convert 30 TypeScript seed pins to SQL INSERTs

- [ ] Create `supabase/seed.sql` with INSERT statements for all 30 seed pins. The `device_id` and `ip_hash` are `'seed'`, `is_seed = true`. Timestamps use fixed past dates matching the original `daysAgo()` values (relative to 2026-04-16):

  ```sql
  -- Seed data: 30 realistic Hyderabad rent pins
  -- Run this after 001_initial.sql in the Supabase SQL editor

  insert into pins (lat, lng, rent, bhk, furnished, gated, maintenance, tenant_type, deposit_months, pets, available, locality, device_id, ip_hash, is_seed, created_at) values
  (17.4401, 78.3489, 22000,  1, 'furnished',   true,  'excluded', 'any',     2, false, false, 'Gachibowli',        'seed', 'seed', true, now() - interval '5 days'),
  (17.4474, 78.3762, 38000,  2, 'semi',         true,  'included', 'family',  3, false, true,  'Hitech City',       'seed', 'seed', true, now() - interval '2 days'),
  (17.4616, 78.3519, 65000,  3, 'furnished',   true,  'excluded', 'family',  3, true,  false, 'Kondapur',          'seed', 'seed', true, now() - interval '10 days'),
  (17.4486, 78.3908, 18000,  1, 'unfurnished', false, 'excluded', 'bachelor',2, false, false, 'Madhapur',          'seed', 'seed', true, now() - interval '15 days'),
  (17.4156, 78.3512, 42000,  2, 'furnished',   true,  'included', 'any',     3, false, false, 'Nanakramguda',      'seed', 'seed', true, now() - interval '7 days'),
  (17.3996, 78.3271, 55000,  3, 'semi',         true,  'excluded', 'family',  6, false, true,  'Kokapet',           'seed', 'seed', true, now() - interval '1 day'),
  (17.4231, 78.4601, 45000,  2, 'furnished',   true,  'included', 'any',     3, true,  false, 'Banjara Hills',     'seed', 'seed', true, now() - interval '20 days'),
  (17.4326, 78.4071, 75000,  3, 'furnished',   true,  'excluded', 'family',  3, false, false, 'Jubilee Hills',     'seed', 'seed', true, now() - interval '30 days'),
  (17.4453, 78.4564, 28000,  2, 'unfurnished', false, 'excluded', 'any',     2, false, false, 'Begumpet',          'seed', 'seed', true, now() - interval '8 days'),
  (17.4849, 78.4138, 20000,  1, 'semi',         true,  'included', 'bachelor',2, false, false, 'Kukatpally',        'seed', 'seed', true, now() - interval '12 days'),
  (17.3953, 78.4744, 14000,  1, 'unfurnished', false, 'excluded', 'any',     1, false, false, 'Ameerpet',          'seed', 'seed', true, now() - interval '45 days'),
  (17.4399, 78.4983, 35000,  2, 'semi',         true,  'included', 'family',  3, false, true,  'Secunderabad',      'seed', 'seed', true, now() - interval '3 days'),
  (17.3299, 78.4754, 12000,  1, 'unfurnished', false, 'excluded', 'any',     1, false, false, 'LB Nagar',          'seed', 'seed', true, now() - interval '60 days'),
  (17.3683, 78.5247, 13500,  1, 'semi',         false, 'excluded', 'bachelor',2, false, false, 'Dilsukhnagar',      'seed', 'seed', true, now() - interval '25 days'),
  (17.4063, 78.5595, 16000,  1, 'unfurnished', false, 'excluded', 'any',     2, false, false, 'Uppal',             'seed', 'seed', true, now() - interval '18 days'),
  (17.4930, 78.3428, 19000,  1, 'semi',         true,  'included', 'any',     2, false, true,  'Miyapur',           'seed', 'seed', true, now() - interval '4 days'),
  (17.4700, 78.3230, 32000,  2, 'furnished',   true,  'excluded', 'family',  3, false, false, 'Nallagandla',       'seed', 'seed', true, now() - interval '9 days'),
  (17.3988, 78.3420, 85000,  3, 'furnished',   true,  'included', 'family',  6, true,  false, 'Financial District','seed', 'seed', true, now() - interval '14 days'),
  (17.3989, 78.4290, 25000,  2, 'unfurnished', false, 'excluded', 'any',     2, false, false, 'Manikonda',         'seed', 'seed', true, now() - interval '22 days'),
  (17.4563, 78.3699, 48000,  2, 'furnished',   true,  'included', 'any',     3, false, true,  'Hitech City',       'seed', 'seed', true, now() - interval '6 days'),
  (17.4272, 78.3614, 95000,  4, 'furnished',   true,  'included', 'family',  6, true,  false, 'Gachibowli',        'seed', 'seed', true, now() - interval '40 days'),
  (17.4384, 78.3888, 21000,  1, 'furnished',   true,  'excluded', 'bachelor',2, false, false, 'Kondapur',          'seed', 'seed', true, now() - interval '11 days'),
  (17.3820, 78.4120, 30000,  2, 'semi',         true,  'excluded', 'family',  3, false, false, 'Mehdipatnam',       'seed', 'seed', true, now() - interval '17 days'),
  (17.3650, 78.4740, 11000,  1, 'unfurnished', false, 'excluded', 'bachelor',1, false, false, 'Abids',             'seed', 'seed', true, now() - interval '50 days'),
  (17.5062, 78.4150, 17000,  1, 'semi',         false, 'excluded', 'any',     2, false, false, 'Kompally',          'seed', 'seed', true, now() - interval '35 days'),
  (17.4610, 78.5020, 22000,  2, 'unfurnished', false, 'excluded', 'family',  2, false, false, 'Alwal',             'seed', 'seed', true, now() - interval '28 days'),
  (17.3510, 78.5088, 9000,   1, 'unfurnished', false, 'excluded', 'bachelor',1, false, false, 'Uppal',             'seed', 'seed', true, now() - interval '90 days'),
  (17.4742, 78.3914, 26000,  2, 'semi',         true,  'included', 'any',     2, false, false, 'Kukatpally',        'seed', 'seed', true, now() - interval '13 days'),
  (17.4161, 78.4501, 58000,  3, 'furnished',   true,  'included', 'family',  3, true,  true,  'Banjara Hills',     'seed', 'seed', true, now() - interval '2 days'),
  (17.4400, 78.4680, 120000, 4, 'furnished',   true,  'included', 'family',  6, true,  false, 'Jubilee Hills',     'seed', 'seed', true, now() - interval '55 days');
  ```

- [ ] Commit:
  ```bash
  git add supabase/seed.sql
  git commit -m "feat: add seed.sql — 30 Hyderabad rent pins for day-1 map population"
  ```

---

### Task 4: Update `src/types/Pin.ts` — add `verified` and `isSeed` fields

- [ ] Read `src/types/Pin.ts` (already done above), then edit it. Add `verified` and `isSeed` to the `Pin` interface and add optional `sqft`:

  ```typescript
  // src/types/Pin.ts
  export type BHK = 1 | 2 | 3 | 4 | 5
  export type Furnished = 'furnished' | 'semi' | 'unfurnished'
  export type TenantType = 'family' | 'bachelor' | 'any'
  export type Maintenance = 'included' | 'excluded'

  export interface Pin {
    id: string
    lat: number
    lng: number
    rent: number
    bhk: BHK
    furnished: Furnished
    gated: boolean
    maintenance: Maintenance
    tenantType: TenantType
    depositMonths: number
    pets: boolean
    available: boolean
    reportCount: number
    createdAt: string   // ISO string
    locality?: string
    sqft?: number
    verified: boolean
    isSeed: boolean
  }

  export interface PinSubmission {
    lat: number
    lng: number
    rent: number
    bhk: BHK
    furnished: Furnished
    gated: boolean
    maintenance: Maintenance
    tenantType: TenantType
    depositMonths: number
    pets: boolean
    available: boolean
    locality?: string
  }

  export interface FilterState {
    locality: string | null
    bhk: BHK[]
    rentMin: number
    rentMax: number
    furnished: Furnished[]
    gated: boolean | null
  }

  export const DEFAULT_FILTERS: FilterState = {
    locality: null,
    bhk: [],
    rentMin: 5000,
    rentMax: 200000,
    furnished: [],
    gated: null,
  }
  ```

- [ ] Run type check:
  ```bash
  npx tsc --noEmit
  ```
  Expected: errors on `seed-pins.ts` and any other file constructing `Pin` objects directly — these will be fixed in the next task.

- [ ] Commit:
  ```bash
  git add src/types/Pin.ts
  git commit -m "feat: add verified and isSeed fields to Pin type"
  ```

---

### Task 5: Rewrite `src/services/PinService.ts` — async, Supabase-backed

**Files:**
- Modify: `src/services/PinService.ts`
- Delete consumers of `SEED_PINS` in PinService (seeds now come from DB)
- Note: `src/data/seed-pins.ts` is kept as-is (still needed for `getPinsInBounds` was removed, seeds now in DB)

- [ ] Write the failing test first. Create `src/services/PinService.test.ts` (replace existing if it exists — check with `cat src/services/PinService.test.ts`):

  ```typescript
  // src/services/PinService.test.ts
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  // Mock supabase module before importing PinService
  vi.mock('../lib/supabase', () => ({
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
    },
  }))

  vi.mock('../lib/deviceId', () => ({
    getDeviceId: vi.fn(() => 'test-device-id'),
  }))

  import { PinService } from './PinService'
  import { supabase } from '../lib/supabase'

  const mockPin = {
    id: 'test-uuid',
    lat: 17.44,
    lng: 78.38,
    rent: 25000,
    bhk: 2,
    furnished: 'semi',
    gated: true,
    maintenance: 'included',
    tenant_type: 'any',
    deposit_months: 2,
    pets: false,
    available: true,
    locality: 'Gachibowli',
    sqft: null,
    report_count: 0,
    verified: false,
    is_seed: false,
    created_at: '2026-04-16T00:00:00.000Z',
  }

  describe('PinService', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('getAllPins returns mapped pins', async () => {
      const selectMock = vi.fn().mockResolvedValue({ data: [mockPin], error: null })
      const eqMock = vi.fn(() => ({ select: () => ({ eq: selectMock }) }))
      vi.mocked(supabase.from).mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [mockPin], error: null }) }) } as any)

      // Simplified: test rowToPin mapping directly via getAllPins result shape
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [mockPin], error: null }),
        }),
      } as any)

      const pins = await PinService.getAllPins()
      expect(pins[0].tenantType).toBe('any')       // snake_case → camelCase
      expect(pins[0].depositMonths).toBe(2)
      expect(pins[0].reportCount).toBe(0)
      expect(pins[0].isSeed).toBe(false)
      expect(pins[0].verified).toBe(false)
    })

    it('addPin calls rpc with submission and device id', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: 'new-uuid', error: null } as any)
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPin, error: null }),
          }),
        }),
      } as any)

      const submission = {
        lat: 17.44, lng: 78.38, rent: 25000, bhk: 2 as const,
        furnished: 'semi' as const, gated: true, maintenance: 'included' as const,
        tenantType: 'any' as const, depositMonths: 2, pets: false, available: true,
      }

      const pin = await PinService.addPin(submission)
      expect(supabase.rpc).toHaveBeenCalledWith('add_pin', expect.objectContaining({
        p_device_id: 'test-device-id',
      }))
      expect(pin.id).toBe('test-uuid')
    })

    it('addPin throws RATE_LIMITED when rpc returns that error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'RATE_LIMITED', code: 'P0001' },
      } as any)

      const submission = {
        lat: 17.44, lng: 78.38, rent: 25000, bhk: 2 as const,
        furnished: 'semi' as const, gated: true, maintenance: 'included' as const,
        tenantType: 'any' as const, depositMonths: 2, pets: false, available: true,
      }

      await expect(PinService.addPin(submission)).rejects.toThrow('RATE_LIMITED')
    })

    it('reportPin calls rpc with pin id', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any)
      await PinService.reportPin('pin-123')
      expect(supabase.rpc).toHaveBeenCalledWith('report_pin', { p_pin_id: 'pin-123' })
    })

    it('claimPin calls rpc with pin id and email', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any)
      await PinService.claimPin('pin-123', 'user@example.com')
      expect(supabase.rpc).toHaveBeenCalledWith('claim_pin', {
        p_pin_id: 'pin-123',
        p_email: 'user@example.com',
      })
    })
  })
  ```

- [ ] Run test to confirm it fails:
  ```bash
  npx vitest run src/services/PinService.test.ts
  ```
  Expected: FAIL — PinService still has old sync implementation.

- [ ] Rewrite `src/services/PinService.ts`:

  ```typescript
  // src/services/PinService.ts
  import { supabase } from '../lib/supabase'
  import { getDeviceId } from '../lib/deviceId'
  import type { Pin, PinSubmission } from '../types/Pin'

  // Map DB snake_case row to TypeScript camelCase Pin
  function rowToPin(row: Record<string, unknown>): Pin {
    return {
      id:            row.id as string,
      lat:           row.lat as number,
      lng:           row.lng as number,
      rent:          row.rent as number,
      bhk:           row.bhk as Pin['bhk'],
      furnished:     row.furnished as Pin['furnished'],
      gated:         row.gated as boolean,
      maintenance:   row.maintenance as Pin['maintenance'],
      tenantType:    row.tenant_type as Pin['tenantType'],
      depositMonths: row.deposit_months as number,
      pets:          row.pets as boolean,
      available:     row.available as boolean,
      reportCount:   row.report_count as number,
      createdAt:     row.created_at as string,
      locality:      row.locality as string | undefined,
      sqft:          row.sqft as number | undefined,
      verified:      row.verified as boolean,
      isSeed:        row.is_seed as boolean,
    }
  }

  export const PinService = {
    async getAllPins(): Promise<Pin[]> {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('available', true)
      if (error) throw new Error(error.message)
      return (data ?? []).map(rowToPin)
    },

    async addPin(submission: PinSubmission): Promise<Pin> {
      const deviceId = getDeviceId()
      const { data: newId, error } = await supabase.rpc('add_pin', {
        p_pin: {
          lat:           submission.lat,
          lng:           submission.lng,
          rent:          submission.rent,
          bhk:           submission.bhk,
          furnished:     submission.furnished,
          gated:         submission.gated,
          maintenance:   submission.maintenance,
          tenantType:    submission.tenantType,
          depositMonths: submission.depositMonths,
          pets:          submission.pets,
          available:     submission.available,
          locality:      submission.locality ?? '',
        },
        p_device_id: deviceId,
      })

      if (error) {
        // Surface structured error codes from the RPC
        if (error.message.includes('RATE_LIMITED')) throw new Error('RATE_LIMITED')
        if (error.message.includes('IMPLAUSIBLE_RENT')) throw new Error('IMPLAUSIBLE_RENT')
        throw new Error(error.message)
      }

      // Fetch the full row so we return a proper Pin
      const { data: row, error: fetchError } = await supabase
        .from('pins')
        .select('*')
        .eq('id', newId)
        .single()
      if (fetchError) throw new Error(fetchError.message)
      return rowToPin(row)
    },

    async reportPin(id: string): Promise<void> {
      const { error } = await supabase.rpc('report_pin', { p_pin_id: id })
      if (error) throw new Error(error.message)
    },

    async claimPin(id: string, email: string): Promise<void> {
      const { error } = await supabase.rpc('claim_pin', {
        p_pin_id: id,
        p_email: email,
      })
      if (error) throw new Error(error.message)
    },

    async getTotalRent(): Promise<number> {
      const pins = await this.getAllPins()
      return pins.reduce((sum, p) => sum + p.rent, 0)
    },
  }
  ```

- [ ] Run tests:
  ```bash
  npx vitest run src/services/PinService.test.ts
  ```
  Expected: all 5 tests pass.

- [ ] Run type check:
  ```bash
  npx tsc --noEmit
  ```
  Expected: errors in `usePinStore.ts` (consumers of sync PinService) — fixed in next task.

- [ ] Commit:
  ```bash
  git add src/services/PinService.ts src/services/PinService.test.ts
  git commit -m "feat: rewrite PinService — async Supabase-backed with rowToPin mapper and claimPin"
  ```

---

### Task 6: Update `src/store/usePinStore.ts` — async actions + loading state

- [ ] Write the failing test. Replace `src/store/usePinStore.test.ts` (check if it exists first):

  ```typescript
  // src/store/usePinStore.test.ts
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  vi.mock('../services/PinService', () => ({
    PinService: {
      getAllPins: vi.fn(),
      addPin: vi.fn(),
      reportPin: vi.fn(),
      getTotalRent: vi.fn(),
    },
  }))

  import { usePinStore } from './usePinStore'
  import { PinService } from '../services/PinService'

  const mockPin = {
    id: 'p1', lat: 17.44, lng: 78.38, rent: 25000, bhk: 2 as const,
    furnished: 'semi' as const, gated: true, maintenance: 'included' as const,
    tenantType: 'any' as const, depositMonths: 2, pets: false, available: true,
    reportCount: 0, createdAt: '2026-04-16T00:00:00.000Z',
    verified: false, isSeed: false,
  }

  describe('usePinStore', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      usePinStore.setState({ pins: [], totalRent: 0, loading: false })
    })

    it('loadPins sets pins and totalRent', async () => {
      vi.mocked(PinService.getAllPins).mockResolvedValue([mockPin])
      await usePinStore.getState().loadPins()
      const state = usePinStore.getState()
      expect(state.pins).toHaveLength(1)
      expect(state.totalRent).toBe(25000)
      expect(state.loading).toBe(false)
    })

    it('addPin appends pin and updates totalRent', async () => {
      vi.mocked(PinService.addPin).mockResolvedValue(mockPin)
      const submission = {
        lat: 17.44, lng: 78.38, rent: 25000, bhk: 2 as const,
        furnished: 'semi' as const, gated: true, maintenance: 'included' as const,
        tenantType: 'any' as const, depositMonths: 2, pets: false, available: true,
      }
      const pin = await usePinStore.getState().addPin(submission)
      expect(pin.id).toBe('p1')
      expect(usePinStore.getState().pins).toHaveLength(1)
      expect(usePinStore.getState().totalRent).toBe(25000)
    })

    it('addPin propagates RATE_LIMITED error', async () => {
      vi.mocked(PinService.addPin).mockRejectedValue(new Error('RATE_LIMITED'))
      const submission = {
        lat: 17.44, lng: 78.38, rent: 25000, bhk: 2 as const,
        furnished: 'semi' as const, gated: true, maintenance: 'included' as const,
        tenantType: 'any' as const, depositMonths: 2, pets: false, available: true,
      }
      await expect(usePinStore.getState().addPin(submission)).rejects.toThrow('RATE_LIMITED')
    })

    it('reportPin updates reportCount in place', async () => {
      vi.mocked(PinService.reportPin).mockResolvedValue()
      usePinStore.setState({ pins: [mockPin], totalRent: 25000, loading: false })
      await usePinStore.getState().reportPin('p1')
      expect(usePinStore.getState().pins[0].reportCount).toBe(1)
    })
  })
  ```

- [ ] Run test to confirm fail:
  ```bash
  npx vitest run src/store/usePinStore.test.ts
  ```
  Expected: FAIL — store still has sync signatures.

- [ ] Rewrite `src/store/usePinStore.ts`:

  ```typescript
  // src/store/usePinStore.ts
  import { create } from 'zustand'
  import { PinService } from '../services/PinService'
  import type { Pin, PinSubmission } from '../types/Pin'

  interface PinStore {
    pins: Pin[]
    totalRent: number
    loading: boolean
    loadPins: () => Promise<void>
    addPin: (submission: PinSubmission) => Promise<Pin>
    reportPin: (id: string) => Promise<void>
  }

  export const usePinStore = create<PinStore>((set, get) => ({
    pins: [],
    totalRent: 0,
    loading: false,

    async loadPins() {
      set({ loading: true })
      try {
        const pins = await PinService.getAllPins()
        const totalRent = pins.reduce((sum, p) => sum + p.rent, 0)
        set({ pins, totalRent, loading: false })
      } catch (err) {
        console.error('loadPins failed:', err)
        set({ loading: false })
      }
    },

    async addPin(submission) {
      const pin = await PinService.addPin(submission)
      set(state => ({
        pins: [...state.pins, pin],
        totalRent: state.totalRent + pin.rent,
      }))
      return pin
    },

    async reportPin(id) {
      await PinService.reportPin(id)
      set(state => ({
        pins: state.pins.map(p =>
          p.id === id ? { ...p, reportCount: p.reportCount + 1 } : p,
        ),
      }))
    },
  }))
  ```

- [ ] Run tests:
  ```bash
  npx vitest run src/store/usePinStore.test.ts
  ```
  Expected: 4 tests pass.

- [ ] Run type check:
  ```bash
  npx tsc --noEmit
  ```
  Expected: errors in `PinSubmitModal.tsx` (calls sync `addPin`) — fixed in Task 8.

- [ ] Commit:
  ```bash
  git add src/store/usePinStore.ts src/store/usePinStore.test.ts
  git commit -m "feat: make usePinStore async — loadPins, addPin, reportPin all return Promises"
  ```

---

### Task 7: Update `src/store/useUIStore.ts` — add `emailClaim` modal + `pendingPinId`

- [ ] Edit `src/store/useUIStore.ts`. Add `'emailClaim'` to the `Modal` union, add `pendingPinId` state and `setPendingPinId` action:

  ```typescript
  // src/store/useUIStore.ts
  import { create } from 'zustand'
  import type { Pin } from '../types/Pin'

  type Modal = 'onboarding' | 'pinSubmit' | 'pinDetail' | 'filter' | 'emailClaim' | null

  interface UIStore {
    activeModal: Modal
    pendingLatLng: { lat: number; lng: number } | null
    selectedPin: Pin | null
    pendingPinId: string | null
    openModal: (modal: Modal) => void
    closeModal: () => void
    setPendingLatLng: (latlng: { lat: number; lng: number }) => void
    setSelectedPin: (pin: Pin | null) => void
    setPendingPinId: (id: string | null) => void
  }

  export const useUIStore = create<UIStore>((set) => ({
    activeModal: null,
    pendingLatLng: null,
    selectedPin: null,
    pendingPinId: null,

    openModal(modal) {
      set({ activeModal: modal })
    },

    closeModal() {
      set({ activeModal: null, pendingLatLng: null, selectedPin: null, pendingPinId: null })
    },

    setPendingLatLng(latlng) {
      set({ pendingLatLng: latlng })
    },

    setSelectedPin(pin) {
      set({ selectedPin: pin })
    },

    setPendingPinId(id) {
      set({ pendingPinId: id })
    },
  }))
  ```

- [ ] Run type check:
  ```bash
  npx tsc --noEmit
  ```
  Expected: no new errors from this change (consumers of `closeModal` and `openModal` don't need to change).

- [ ] Commit:
  ```bash
  git add src/store/useUIStore.ts
  git commit -m "feat: add emailClaim modal type and pendingPinId to useUIStore"
  ```

---

### Task 8: Update `src/components/Modals/PinSubmitModal.tsx` — async submit + error states + emailClaim transition

**Key changes:**
- `handleSubmit` becomes `async`
- Error state now includes API errors (RATE_LIMITED, IMPLAUSIBLE_RENT, network)
- On success: set `pendingPinId` then open `emailClaim` modal (instead of `closeModal`)
- `addPin` from store now returns `Promise<Pin>` — await it
- Add `submitting` state to disable button during in-flight request

- [ ] Write the failing test. Check existing test at `src/components/Modals/PinSubmitModal.test.tsx` and replace:

  ```typescript
  // src/components/Modals/PinSubmitModal.test.tsx
  import { describe, it, expect, vi, beforeEach } from 'vitest'
  import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

  vi.mock('../../store/usePinStore', () => ({
    usePinStore: vi.fn(),
  }))
  vi.mock('../../store/useUIStore', () => ({
    useUIStore: vi.fn(),
  }))

  import { PinSubmitModal } from './PinSubmitModal'
  import { usePinStore } from '../../store/usePinStore'
  import { useUIStore } from '../../store/useUIStore'

  const mockAddPin = vi.fn()
  const mockCloseModal = vi.fn()
  const mockOpenModal = vi.fn()
  const mockSetPendingPinId = vi.fn()

  function setup() {
    vi.mocked(usePinStore).mockImplementation((selector: any) =>
      selector({ addPin: mockAddPin, pins: [], totalRent: 0, loading: false, loadPins: vi.fn(), reportPin: vi.fn() })
    )
    vi.mocked(useUIStore).mockImplementation((selector: any) =>
      selector({
        pendingLatLng: { lat: 17.44, lng: 78.38 },
        closeModal: mockCloseModal,
        openModal: mockOpenModal,
        setPendingPinId: mockSetPendingPinId,
        activeModal: 'pinSubmit',
        selectedPin: null,
        pendingPinId: null,
      })
    )
    return render(<PinSubmitModal />)
  }

  function fillValidForm() {
    fireEvent.change(screen.getByPlaceholderText('e.g. 22000'), { target: { value: '25000' } })
    fireEvent.click(screen.getByText('2BHK'))
    fireEvent.click(screen.getByText('Semi'))
    fireEvent.click(screen.getByText('Yes'))   // gated
    fireEvent.click(screen.getByText('Included'))
    fireEvent.click(screen.getByText('Any'))
    fireEvent.click(screen.getAllByText('Yes')[1]) // pets (second Yes button)
    fireEvent.click(screen.getByText('Available'))
  }

  describe('PinSubmitModal', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('shows validation errors for empty form', () => {
      setup()
      fireEvent.click(screen.getByText('Pin rent'))
      expect(screen.getByText(/valid rent/i)).toBeInTheDocument()
    })

    it('on success opens emailClaim modal with pendingPinId', async () => {
      const newPin = {
        id: 'new-pin-id', lat: 17.44, lng: 78.38, rent: 25000, bhk: 2,
        furnished: 'semi', gated: true, maintenance: 'included',
        tenantType: 'any', depositMonths: 2, pets: false, available: true,
        reportCount: 0, createdAt: '2026-04-16T00:00:00.000Z',
        verified: false, isSeed: false,
      }
      mockAddPin.mockResolvedValue(newPin)
      setup()
      fillValidForm()
      fireEvent.click(screen.getByText('Pin rent'))
      await waitFor(() => {
        expect(mockSetPendingPinId).toHaveBeenCalledWith('new-pin-id')
        expect(mockOpenModal).toHaveBeenCalledWith('emailClaim')
      })
    })

    it('shows RATE_LIMITED user-friendly message', async () => {
      mockAddPin.mockRejectedValue(new Error('RATE_LIMITED'))
      setup()
      fillValidForm()
      fireEvent.click(screen.getByText('Pin rent'))
      await waitFor(() => {
        expect(screen.getByText(/3 pins today/i)).toBeInTheDocument()
      })
    })

    it('shows IMPLAUSIBLE_RENT user-friendly message', async () => {
      mockAddPin.mockRejectedValue(new Error('IMPLAUSIBLE_RENT'))
      setup()
      fillValidForm()
      fireEvent.click(screen.getByText('Pin rent'))
      await waitFor(() => {
        expect(screen.getByText(/rent looks off/i)).toBeInTheDocument()
      })
    })

    it('shows generic network error message', async () => {
      mockAddPin.mockRejectedValue(new Error('Network request failed'))
      setup()
      fillValidForm()
      fireEvent.click(screen.getByText('Pin rent'))
      await waitFor(() => {
        expect(screen.getByText(/check your connection/i)).toBeInTheDocument()
      })
    })
  })
  ```

- [ ] Run test to confirm fail:
  ```bash
  npx vitest run src/components/Modals/PinSubmitModal.test.tsx
  ```
  Expected: FAIL — `openModal('emailClaim')` not called, error messages not shown.

- [ ] Edit `src/components/Modals/PinSubmitModal.tsx`. Replace the `handleSubmit` function, add `submitting` state, change the success flow, and update imports:

  Replace the top of the file (imports and state declarations):
  ```typescript
  // src/components/Modals/PinSubmitModal.tsx
  import { useState, useRef, useEffect } from 'react'
  import { usePinStore } from '../../store/usePinStore'
  import { useUIStore } from '../../store/useUIStore'
  import { LOCALITIES } from '../../data/localities'
  import type { BHK, Furnished, TenantType, Maintenance } from '../../types/Pin'
  import styles from './PinSubmitModal.module.css'

  interface FormState {
    rent: string
    bhk: BHK | null
    furnished: Furnished | null
    gated: boolean | null
    maintenance: Maintenance | null
    tenantType: TenantType | null
    depositMonths: string
    pets: boolean | null
    available: boolean | null
    locality: string
  }

  const INITIAL: FormState = {
    rent: '', bhk: null, furnished: null, gated: null,
    maintenance: null, tenantType: null, depositMonths: '2',
    pets: null, available: null, locality: '',
  }

  export function PinSubmitModal() {
    const [form, setForm] = useState<FormState>(INITIAL)
    const [errors, setErrors] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }, [])

    const pendingLatLng = useUIStore(s => s.pendingLatLng)
    const closeModal = useUIStore(s => s.closeModal)
    const openModal = useUIStore(s => s.openModal)
    const setPendingPinId = useUIStore(s => s.setPendingPinId)
    const addPin = usePinStore(s => s.addPin)

    function validate(): string[] {
      const errs: string[] = []
      const rent = Number(form.rent)
      if (!form.rent || isNaN(rent) || rent < 1000) errs.push('Enter a valid rent (min ₹1,000)')
      if (form.bhk === null) errs.push('Select BHK')
      if (form.furnished === null) errs.push('Select furnishing')
      if (form.gated === null) errs.push('Select society type')
      if (form.maintenance === null) errs.push('Select maintenance')
      if (form.tenantType === null) errs.push('Select tenant type')
      const dep = Number(form.depositMonths)
      if (!form.depositMonths || isNaN(dep) || dep < 1 || dep > 12) errs.push('Deposit months must be 1–12')
      if (form.pets === null) errs.push('Select pets policy')
      if (form.available === null) errs.push('Select availability')
      return errs
    }

    async function handleSubmit() {
      if (!pendingLatLng || submitting) return
      const errs = validate()
      if (errs.length > 0) { setErrors(errs); return }
      setErrors([])
      setSubmitting(true)
      try {
        const pin = await addPin({
          lat: pendingLatLng.lat,
          lng: pendingLatLng.lng,
          rent: Number(form.rent),
          bhk: form.bhk!,
          furnished: form.furnished!,
          gated: form.gated!,
          maintenance: form.maintenance!,
          tenantType: form.tenantType!,
          depositMonths: Number(form.depositMonths),
          pets: form.pets!,
          available: form.available!,
          locality: form.locality || undefined,
        })
        setPendingPinId(pin.id)
        openModal('emailClaim')
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('RATE_LIMITED')) {
          setErrors(["You've added 3 pins today — come back tomorrow!"])
        } else if (msg.includes('IMPLAUSIBLE_RENT')) {
          setErrors([`That rent looks off for a ${form.bhk}BHK in Hyderabad. Double-check?`])
        } else {
          setErrors(["Couldn't save your pin — check your connection and try again."])
        }
      } finally {
        setSubmitting(false)
      }
    }
  ```

  Keep the rest of the JSX identical, except update the submit button to show loading state and disable during submit:
  ```tsx
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          type="button"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Pin rent'}
        </button>
  ```

  Also remove the `success` state and its early return — success is now handled by the emailClaim modal transition. Delete these lines:
  ```typescript
  // DELETE: const [success, setSuccess] = useState(false)
  // DELETE: if (success) { return (<div>...</div>) }
  // DELETE: setSuccess(true)
  // DELETE: timerRef.current = setTimeout(() => closeModal(), 1500)
  ```

- [ ] Run tests:
  ```bash
  npx vitest run src/components/Modals/PinSubmitModal.test.tsx
  ```
  Expected: 5 tests pass.

- [ ] Run type check:
  ```bash
  npx tsc --noEmit
  ```

- [ ] Commit:
  ```bash
  git add src/components/Modals/PinSubmitModal.tsx src/components/Modals/PinSubmitModal.test.tsx
  git commit -m "feat: make PinSubmitModal async — error states, rate limit messages, emailClaim transition"
  ```

---

### Task 9: Create `EmailClaimModal` — post-submit soft email prompt

**Files:**
- Create: `src/components/Modals/EmailClaimModal.tsx`
- Create: `src/components/Modals/EmailClaimModal.module.css`
- Create: `src/components/Modals/EmailClaimModal.test.tsx`

- [ ] Write the test first:

  ```typescript
  // src/components/Modals/EmailClaimModal.test.tsx
  import { describe, it, expect, vi, beforeEach } from 'vitest'
  import { render, screen, fireEvent, waitFor } from '@testing-library/react'

  vi.mock('../../store/useUIStore', () => ({
    useUIStore: vi.fn(),
  }))
  vi.mock('../../services/PinService', () => ({
    PinService: {
      claimPin: vi.fn(),
    },
  }))

  import { EmailClaimModal } from './EmailClaimModal'
  import { useUIStore } from '../../store/useUIStore'
  import { PinService } from '../../services/PinService'

  const mockCloseModal = vi.fn()

  function setup(pendingPinId = 'pin-abc') {
    vi.mocked(useUIStore).mockImplementation((selector: any) =>
      selector({
        pendingPinId,
        closeModal: mockCloseModal,
        activeModal: 'emailClaim',
        pendingLatLng: null,
        selectedPin: null,
        openModal: vi.fn(),
        setPendingLatLng: vi.fn(),
        setSelectedPin: vi.fn(),
        setPendingPinId: vi.fn(),
      })
    )
    return render(<EmailClaimModal />)
  }

  describe('EmailClaimModal', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('renders the email prompt', () => {
      setup()
      expect(screen.getByText(/Pin added/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/your@email/i)).toBeInTheDocument()
    })

    it('Skip for now closes modal without calling claimPin', () => {
      setup()
      fireEvent.click(screen.getByText('Skip for now'))
      expect(mockCloseModal).toHaveBeenCalled()
      expect(PinService.claimPin).not.toHaveBeenCalled()
    })

    it('validates email contains @', async () => {
      setup()
      fireEvent.change(screen.getByPlaceholderText(/your@email/i), { target: { value: 'notanemail' } })
      fireEvent.click(screen.getByText('Notify me'))
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
      expect(PinService.claimPin).not.toHaveBeenCalled()
    })

    it('on valid submit calls claimPin and shows success', async () => {
      vi.mocked(PinService.claimPin).mockResolvedValue()
      setup()
      fireEvent.change(screen.getByPlaceholderText(/your@email/i), { target: { value: 'user@example.com' } })
      fireEvent.click(screen.getByText('Notify me'))
      await waitFor(() => {
        expect(PinService.claimPin).toHaveBeenCalledWith('pin-abc', 'user@example.com')
        expect(screen.getByText(/You're in/i)).toBeInTheDocument()
      })
    })

    it('auto-closes after success', async () => {
      vi.useFakeTimers()
      vi.mocked(PinService.claimPin).mockResolvedValue()
      setup()
      fireEvent.change(screen.getByPlaceholderText(/your@email/i), { target: { value: 'user@example.com' } })
      fireEvent.click(screen.getByText('Notify me'))
      await waitFor(() => screen.getByText(/You're in/i))
      vi.advanceTimersByTime(1500)
      expect(mockCloseModal).toHaveBeenCalled()
      vi.useRealTimers()
    })
  })
  ```

- [ ] Run test to confirm fail:
  ```bash
  npx vitest run src/components/Modals/EmailClaimModal.test.tsx
  ```
  Expected: FAIL — component doesn't exist yet.

- [ ] Create `src/components/Modals/EmailClaimModal.tsx`:

  ```typescript
  // src/components/Modals/EmailClaimModal.tsx
  import { useState, useRef, useEffect } from 'react'
  import { useUIStore } from '../../store/useUIStore'
  import { PinService } from '../../services/PinService'
  import styles from './EmailClaimModal.module.css'

  export function EmailClaimModal() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const pendingPinId = useUIStore(s => s.pendingPinId)
    const closeModal = useUIStore(s => s.closeModal)

    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }, [])

    async function handleSubmit() {
      if (!pendingPinId || submitting) return
      if (!email.includes('@')) {
        setError('Please enter a valid email address')
        return
      }
      setError(null)
      setSubmitting(true)
      try {
        await PinService.claimPin(pendingPinId, email)
        setSuccess(true)
        timerRef.current = setTimeout(() => closeModal(), 1500)
      } catch {
        setError("Couldn't save your email — try again.")
      } finally {
        setSubmitting(false)
      }
    }

    if (success) {
      return (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <p className={styles.successMsg}>You're in! ✓</p>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.overlay}>
        <div className={styles.card}>
          <h2 className={styles.title}>Pin added! 📍</h2>
          <p className={styles.subtitle}>Add your email to:</p>
          <ul className={styles.benefits}>
            <li>Get matched when seekers are looking near your area</li>
            <li>Edit or remove this pin later</li>
            <li>Get a Verified ✓ badge</li>
          </ul>

          <input
            className={styles.input}
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={submitting}
          />

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              className={styles.notifyBtn}
              onClick={handleSubmit}
              type="button"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Notify me'}
            </button>
            <button
              className={styles.skipBtn}
              onClick={closeModal}
              type="button"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] Create `src/components/Modals/EmailClaimModal.module.css`:

  ```css
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 28px 24px;
    width: 100%;
    max-width: 380px;
  }

  .title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 8px;
  }

  .subtitle {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0 0 8px;
  }

  .benefits {
    font-size: 0.875rem;
    color: var(--text);
    padding-left: 20px;
    margin: 0 0 20px;
    line-height: 1.8;
  }

  .input {
    width: 100%;
    box-sizing: border-box;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    color: var(--text);
    font-size: 0.9375rem;
    outline: none;
    transition: border-color 0.15s;
  }

  .input:focus {
    border-color: var(--accent-light);
  }

  .error {
    color: var(--warning);
    font-size: 0.8125rem;
    margin: 6px 0 0;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 20px;
  }

  .notifyBtn {
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 12px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .notifyBtn:hover:not(:disabled) {
    background: var(--accent-dark);
  }

  .notifyBtn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .skipBtn {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: color 0.15s;
  }

  .skipBtn:hover {
    color: var(--text);
  }

  .successMsg {
    color: var(--success);
    font-size: 1.125rem;
    font-weight: 600;
    text-align: center;
    padding: 24px 0;
    margin: 0;
  }
  ```

- [ ] Run tests:
  ```bash
  npx vitest run src/components/Modals/EmailClaimModal.test.tsx
  ```
  Expected: 5 tests pass.

- [ ] Run type check:
  ```bash
  npx tsc --noEmit
  ```

- [ ] Commit:
  ```bash
  git add src/components/Modals/EmailClaimModal.tsx src/components/Modals/EmailClaimModal.module.css src/components/Modals/EmailClaimModal.test.tsx
  git commit -m "feat: add EmailClaimModal — post-submit optional email capture with Verified badge"
  ```

---

### Task 10: Update `src/App.tsx` — render EmailClaimModal

- [ ] Edit `src/App.tsx`. Add the import and modal render. The only two changes are:

  Add import after the FilterPanel import:
  ```typescript
  import { EmailClaimModal } from './components/Modals/EmailClaimModal'
  ```

  Add render after the filter modal line:
  ```tsx
  {activeModal === 'emailClaim' && <EmailClaimModal />}
  ```

  Full updated modals section:
  ```tsx
  {/* Modals */}
  {activeModal === 'onboarding' && <OnboardingModal />}
  {activeModal === 'pinSubmit' && <PinSubmitModal />}
  {activeModal === 'pinDetail' && <PinDetailModal />}
  {activeModal === 'filter' && <FilterPanel />}
  {activeModal === 'emailClaim' && <EmailClaimModal />}
  ```

- [ ] Run type check:
  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors.

- [ ] Run all tests:
  ```bash
  npx vitest run
  ```
  Expected: all tests pass.

- [ ] Commit:
  ```bash
  git add src/App.tsx
  git commit -m "feat: wire EmailClaimModal into App.tsx modal router"
  ```

---

### Task 11: Fix `src/data/seed-pins.ts` type errors from `verified`/`isSeed` addition

After Task 4 added `verified` and `isSeed` to the `Pin` interface, the 30 hardcoded seed pins in `seed-pins.ts` will fail `tsc` because they don't include these fields.

- [ ] Run type check to confirm the errors:
  ```bash
  npx tsc --noEmit 2>&1 | grep seed-pins
  ```
  Expected: errors about missing `verified` and `isSeed` on each Pin object.

- [ ] Edit `src/data/seed-pins.ts`. Add `verified: false, isSeed: true` to every pin object. The file has 30 objects — do a targeted edit. Each pin line currently ends with e.g. `locality: 'Gachibowli' }`. Add the two fields before the closing brace on every pin:

  Find: `, createdAt: daysAgo(5),  locality: 'Gachibowli' },`
  Replace: `, createdAt: daysAgo(5),  locality: 'Gachibowli', verified: false, isSeed: true },`

  Repeat for all 30 pins. (The seed file is only used for fallback display — the Supabase seeds are the source of truth in production.)

  Alternatively, add a `verified: false, isSeed: true` spread to every object by wrapping the array creation. But the simplest approach is to add the two fields to each object individually.

- [ ] Run type check:
  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors.

- [ ] Commit:
  ```bash
  git add src/data/seed-pins.ts
  git commit -m "fix: add verified and isSeed fields to seed-pins.ts Pin objects"
  ```

---

### Task 12: Deployment checklist

This task is manual — no code to write. Follow each step in order.

- [ ] **Create Supabase project** (if not done):
  1. Go to supabase.com → New project
  2. Name: `hyderabad-rent`, region: Southeast Asia (Singapore)
  3. Wait for provisioning (~2 min)

- [ ] **Run SQL migration**:
  1. In Supabase dashboard → SQL Editor
  2. Paste full contents of `supabase/migrations/001_initial.sql`
  3. Run. Expected: no errors, tables + functions created.

- [ ] **Run seed data**:
  1. In SQL Editor, paste full contents of `supabase/seed.sql`
  2. Run. Expected: "30 rows inserted"
  3. Verify: `select count(*) from pins;` → 30

- [ ] **Get Supabase credentials**:
  1. Settings → API → copy `Project URL` and `anon public` key

- [ ] **Add to `.env.local`** (local dev):
  ```env
  VITE_MAPBOX_TOKEN=pk.your_token
  VITE_SUPABASE_URL=https://xxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  ```

- [ ] **Test locally**:
  ```bash
  npm run dev
  ```
  - Open browser, map should load with 30 seed pins
  - Click map → fill form → submit → EmailClaimModal should appear
  - Click "Skip for now" → modal closes, pin appears on map
  - Submit with email → "You're in! ✓" → modal closes
  - Open DevTools Network tab, confirm Supabase API calls succeed (200s)

- [ ] **Add Vercel env vars**:
  1. Vercel dashboard → your project → Settings → Environment Variables
  2. Add `VITE_SUPABASE_URL` (all environments)
  3. Add `VITE_SUPABASE_ANON_KEY` (all environments)

- [ ] **Deploy**:
  ```bash
  git push origin main
  ```
  Vercel auto-deploys. Check build logs for success.

- [ ] **Smoke test production**:
  - Visit live URL
  - 30 seed pins visible on map
  - Submit a test pin, confirm it appears after page refresh (proving Supabase persistence)
  - Check Supabase Table Editor → pins → confirm the new row exists

---

## Self-Review Checklist

- **Spec coverage:**
  - ✅ `add_pin` RPC with rate limiting + plausibility gate (Task 2)
  - ✅ `report_pin` RPC with auto-hide at 3 reports (Task 2)
  - ✅ `claim_pin` RPC with email format validation (Task 2)
  - ✅ RLS: SELECT open, INSERT via RPC only (Task 2)
  - ✅ `rowToPin()` mapper for snake_case → camelCase (Task 5)
  - ✅ `getDeviceId()` using `crypto.randomUUID()` + localStorage (Task 1)
  - ✅ EmailClaimModal UX flow with Skip + Notify + success state (Task 9)
  - ✅ Error messages: RATE_LIMITED, IMPLAUSIBLE_RENT, network (Task 8)
  - ✅ `verified` + `isSeed` fields on Pin type (Task 4)
  - ✅ `pendingPinId` in UIStore for modal handoff (Task 7)
  - ✅ Seed SQL for day-1 map population (Task 3)
  - ✅ `.env.example` updated (Task 1)

- **No placeholders:** All tasks contain complete code.

- **Type consistency:** `tenantType` (camelCase in TS), `tenant_type` (snake_case in DB), mapped in `rowToPin()`. `depositMonths` ↔ `deposit_months`. `reportCount` ↔ `report_count`. All consistent across Tasks 4, 5, 6, 8, 9.

- **`getPinsInBounds` removed:** Spec says YAGNI — not in new PinService (was unused in UI).

- **`getTotalRent` made async:** Computed from `getAllPins()` result per spec.
