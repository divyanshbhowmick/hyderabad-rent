# Supabase Migration Design — hyderabad.rent v2

## Goal

Migrate the data layer from localStorage (30 hardcoded seed pins, single-user) to Supabase (PostgreSQL, multi-user, persistent, crowdsourced). After this migration, every pin dropped by any user is stored permanently and visible to all visitors — enabling the crowdsourcing flywheel that bengaluru.rent used to hit ₹185 Cr pinned.

## Architecture

**Approach:** Thin swap — keep PinService as the abstraction layer, swap its internals from localStorage to Supabase. All Zustand stores and React components remain unchanged except for async handling. No real-time subscriptions (v3 feature).

**New additions on top of the swap:**
- `EmailClaimModal` — soft post-submit prompt for optional email (feeds matching engine + unlocks Verified badge)
- 3 Supabase RPC functions for security-sensitive operations (rate limiting, reporting, claiming)
- Plausibility gate for Hyderabad rent ranges per BHK

## Database Schema

### `pins` table
```sql
id             uuid primary key default gen_random_uuid()
lat            float8 not null
lng            float8 not null
rent           int not null
bhk            int not null check (bhk between 1 and 5)
furnished      text not null check (furnished in ('furnished','semi','unfurnished'))
gated          bool not null
maintenance    text not null check (maintenance in ('included','excluded'))
tenant_type    text not null check (tenant_type in ('family','bachelor','any'))
deposit_months int not null check (deposit_months between 1 and 12)
pets           bool not null
available      bool not null default true
locality       text
sqft           int
device_id      text not null
ip_hash        text not null
report_count   int not null default 0
verified       bool not null default false
is_seed        bool not null default false
created_at     timestamptz not null default now()
```

### `pin_reports` table
```sql
id         uuid primary key default gen_random_uuid()
pin_id     uuid not null references pins(id) on delete cascade
ip_hash    text not null
created_at timestamptz not null default now()
unique(pin_id, ip_hash)  -- one report per IP per pin
```

### `pin_emails` table (kept separate from pins for privacy)
```sql
id         uuid primary key default gen_random_uuid()
pin_id     uuid not null references pins(id) on delete cascade unique
email      text not null
created_at timestamptz not null default now()
```

### `rate_limits` table
```sql
device_id    text primary key
pin_count    int not null default 0
window_start timestamptz not null default now()
```

## Row Level Security

- **`pins`**: SELECT open to all (anon). INSERT via RPC only (never direct). UPDATE/DELETE blocked for anon.
- **`pin_reports`**: INSERT via RPC only. No SELECT for anon.
- **`pin_emails`**: INSERT via RPC only. No SELECT for anon.
- **`rate_limits`**: No direct access. Managed by RPC.

## Supabase RPC Functions

All security-sensitive operations go through server-side RPCs so IP hashing and rate limiting can never be bypassed by the client.

### `add_pin(p_pin jsonb, p_device_id text) → uuid`
1. Hash `x-forwarded-for` header → `ip_hash`
2. Check rate_limits: if device_id has ≥ 3 pins in last 24 hours → raise exception 'RATE_LIMITED'
3. Plausibility gate: check rent vs BHK ranges (see below) → raise exception 'IMPLAUSIBLE_RENT' if out of range
4. Insert into `pins`, returning the new `id`
5. Upsert `rate_limits` (increment count or reset window if > 24h)

### `report_pin(p_pin_id uuid) → void`
1. Hash `x-forwarded-for` → `ip_hash`
2. Insert into `pin_reports(pin_id, ip_hash)` — unique constraint prevents double-reporting
3. Update `pins.report_count = report_count + 1`
4. If `report_count >= 3` → set `pins.available = false` (auto-hidden)

### `claim_pin(p_pin_id uuid, p_email text) → void`
1. Validate email format server-side
2. Insert into `pin_emails(pin_id, email)`
3. Set `pins.verified = true` for that pin

## Plausibility Gate (Hyderabad ranges)

| BHK | Min ₹ | Max ₹ |
|-----|--------|--------|
| 1   | 5,000  | 80,000 |
| 2   | 8,000  | 1,50,000 |
| 3   | 12,000 | 2,50,000 |
| 4   | 20,000 | 4,00,000 |
| 5   | 30,000 | 6,00,000 |

Rents outside this range are rejected with a user-friendly message (not a hard crash).

## New / Modified Files

### New files
```
src/lib/
  supabase.ts                          — Supabase client (createClient from env vars)

src/components/Modals/
  EmailClaimModal.tsx                  — soft post-submit email prompt
  EmailClaimModal.module.css
  EmailClaimModal.test.tsx

supabase/
  migrations/
    001_initial.sql                    — full schema + RLS + RPC functions
  seed.sql                             — 30 Hyderabad seed pins (converted from seed-pins.ts)
```

### Modified files
```
src/services/PinService.ts             — swap localStorage → Supabase RPC/queries
src/store/usePinStore.ts               — addPin becomes async, loadPins uses Supabase
src/types/Pin.ts                       — add sqft?, verified, is_seed fields
src/store/useUIStore.ts                — add 'emailClaim' to ModalType + pendingPinId state
src/App.tsx                            — render EmailClaimModal, pass pendingPinId
.env.example                           — add VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

## PinService Public API (unchanged signatures, new async internals)

```typescript
getAllPins(): Promise<Pin[]>
  // supabase.from('pins').select('*').eq('available', true) — filters hidden pins

addPin(submission: PinSubmission): Promise<Pin>
  // supabase.rpc('add_pin', { p_pin: submission, p_device_id: DEVICE_ID })
  // throws: 'RATE_LIMITED' | 'IMPLAUSIBLE_RENT' | 'OUT_OF_BOUNDS'

reportPin(id: string): Promise<void>
  // supabase.rpc('report_pin', { p_pin_id: id })

claimPin(id: string, email: string): Promise<void>
  // supabase.rpc('claim_pin', { p_pin_id: id, p_email: email })

getTotalRent(): Promise<number>
  // computed from getAllPins() result — no separate query needed
```

## EmailClaimModal UX Flow

Triggered immediately after a successful `addPin()` call (activeModal = 'emailClaim').

```
┌─────────────────────────────────────┐
│  Pin added! 📍                      │
│                                     │
│  Add your email to:                 │
│  • Get matched when seekers are     │
│    looking near your area           │
│  • Edit or remove this pin later    │
│  • Get a Verified ✓ badge           │
│                                     │
│  [email input]                      │
│                                     │
│  [Notify me]    [Skip for now]      │
└─────────────────────────────────────┘
```

- Skipping closes the modal immediately, pin is live as unverified
- On submit: calls `claimPin(pendingPinId, email)` → shows "You're in! ✓" → closes after 1.5s
- Email input validated client-side (must contain @) before submitting
- Timer ref cleaned up on unmount

## Error Handling

| Error | User-facing message |
|-------|-------------------|
| RATE_LIMITED | "You've added 3 pins today — come back tomorrow!" |
| IMPLAUSIBLE_RENT | "That rent looks off for a {N}BHK in Hyderabad. Double-check?" |
| OUT_OF_BOUNDS | "Please pin within Hyderabad." |
| Network error | "Couldn't save your pin — check your connection and try again." |

## Environment Variables

```env
VITE_MAPBOX_TOKEN=pk.your_token_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Both Supabase vars must be added to Vercel's environment settings after migration.

## Seed Data Strategy

The 30 hardcoded pins in `src/data/seed-pins.ts` are converted to SQL and inserted via `supabase/seed.sql` with `is_seed = true` and `device_id = 'seed'`. They use a fake ip_hash of `'seed'`. This populates the map on day 1 before real users arrive.

## Out of Scope (v3)

- Real-time pin subscriptions (Supabase channels)
- Email delivery for match notifications (Claude nightly cron)
- Auth-based pin management dashboard
- Supabase Storage for flat photos
