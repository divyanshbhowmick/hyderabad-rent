# hyderabad.rent — MVP Design Spec
**Date:** 2026-04-16
**Status:** Approved

---

## Overview

A community-driven, crowdsourced rent transparency map for Hyderabad. Real rents from real Hyderabadis — no scraping, no AI, no login. Users anonymously pin what they actually pay; the community self-moderates via reporting.

**Tagline:** "What Hyderabadis actually pay in rent"
**URL:** hyderabad.rent
**Map center:** 17.3850° N, 78.4867° E, default zoom 12

---

## Approach

MVP-first. Ship a focused core loop, then layer features.

- **Frontend:** React + TypeScript + Vite (SPA)
- **Map:** Mapbox GL JS (free tier, dark styles, no billing for dev)
- **State:** Zustand
- **Data (v1):** localStorage + 30 hardcoded seed pins
- **Data (v2):** Supabase (Postgres, anonymous inserts, RLS)
- **Hosting:** Vercel

---

## MVP Scope

### In MVP
- Full-screen dark Mapbox map centered on Hyderabad
- 30 hardcoded seed pins (realistic Hyderabad rents across IT corridor localities)
- Tap map → pin submission form → save to localStorage
- Click pin → detail modal (rent, tags, "pinned X days ago", report button)
- Basic filter panel (locality, BHK, rent range, furnishing, society type)
- 2-step onboarding (localStorage gated, never shown again)
- Counter bar (tap hint · total value · pin count · live stats link placeholder)
- Persistent bottom CTA bar ("Find Flat or Tenants")
- GPS "My Location" button
- Right-panel FAB buttons for Metro/Area Stats (present, disabled with "coming soon")
- Report button (UI only — increments local counter)
- Mobile-first responsive design

### Deferred to v2
- Supabase backend (real persistence)
- Metro overlay (HMRL lines + stations)
- Green cover satellite overlay
- Area stats (draw-to-analyse)
- Flat hunt / seeker matching + email notifications
- Live stats modal
- Comments + ratings on pins
- Zoom-based pin clustering
- PWA manifest

---

## Color Theme

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0d0d1a` | Page, map overlay |
| Surface | `#141428` | Cards, modals |
| Surface 2 | `#1e1e38` | Inputs, tags |
| Border | `#2a2a4a` | All borders |
| Accent | `#7c3aed` | Primary CTA, selected state |
| Accent light | `#a78bfa` | Links, secondary text |
| Success | `#10b981` | Available badge |
| Warning | `#f59e0b` | Report badge, stars |
| Text | `#e2e8f0` | Primary text |
| Muted | `#6b7280` | Labels, secondary |

---

## Architecture

```
src/
  components/
    Map/              # MapContainer, PinMarker
    Modals/           # PinSubmitModal, PinDetailModal, OnboardingModal, FilterPanel
    Layout/           # TopBar, CounterBar, BottomCTA, RightPanel
  services/
    PinService.ts     # getPins(), addPin(), reportPin() — localStorage v1
  store/
    usePinStore.ts    # pins[], addPin, reportPin
    useFilterStore.ts # filters, setFilter, clearFilters
    useUIStore.ts     # activeModal, pendingLatLng, selectedPin
  data/
    seed-pins.ts      # 30 hardcoded realistic Hyderabad pins
    localities.ts     # Hyderabad locality list (IT corridor weighted)
  types/
    Pin.ts            # Pin, PinSubmission, FilterState interfaces
  utils/
    formatters.ts     # formatRent, formatDaysAgo, formatTotal
    geo.ts            # inBounds, haversineKm
  hooks/
    useMap.ts         # Mapbox instance ref + event handlers
```

---

## Data Model

### Pin (localStorage v1)
```typescript
interface Pin {
  id: string
  lat: number
  lng: number
  rent: number
  bhk: 1 | 2 | 3 | 4 | 5
  furnished: 'furnished' | 'semi' | 'unfurnished'
  gated: boolean
  maintenance: 'included' | 'excluded'
  tenantType: 'family' | 'bachelor' | 'any'
  depositMonths: number
  pets: boolean
  available: boolean
  reportCount: number
  createdAt: string
  locality?: string
}
```

---

## Supabase Schema (v2 ready)

```sql
create table pins (
  id uuid primary key default gen_random_uuid(),
  lat float8 not null, lng float8 not null,
  rent int not null, bhk smallint not null,
  furnished text not null, gated boolean not null,
  maintenance text not null, tenant_type text not null,
  deposit_months smallint not null, pets boolean not null,
  available boolean not null default false,
  report_count int not null default 0,
  created_at timestamptz not null default now()
);
```

RLS: all selects public, inserts public (no auth), no client-side updates/deletes.
