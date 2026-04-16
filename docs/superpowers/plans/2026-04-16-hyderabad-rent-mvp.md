# hyderabad.rent MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the hyderabad.rent MVP — a community-driven, crowdsourced rent transparency map for Hyderabad with 30 seed pins, pin submission, detail view, filtering, and 2-step onboarding.

**Architecture:** React 18 + TypeScript + Vite SPA. Full-screen Mapbox GL JS dark map centered on Hyderabad. Zustand for state (3 slices). localStorage as v1 data layer via PinService abstraction (Supabase-ready for v2). CSS Modules throughout.

**Tech Stack:** React 18, TypeScript, Vite, Mapbox GL JS v3, Zustand v4, Vitest + happy-dom, CSS Modules

**Status:** ✅ Complete — all 12 tasks shipped (commit `3524310`)

---

## File Structure

```
src/
  components/
    Map/
      MapContainer.tsx + .module.css   — full-screen Mapbox map, loads pins on mount
      PinMarker.ts                     — safe DOM marker (wrapper+pill pattern, no innerHTML)
    Modals/
      OnboardingModal.tsx + .module.css + .test.tsx
      PinSubmitModal.tsx  + .module.css + .test.tsx
      PinDetailModal.tsx  + .module.css + .test.tsx
      FilterPanel.tsx     + .module.css + .test.tsx
    Layout/
      TopBar.tsx     + .module.css     — logo + filter button (active dot)
      CounterBar.tsx + .module.css     — tap hint, filtered pin count, filtered total
      BottomCTA.tsx  + .module.css     — "Find Flat or Tenants" placeholder
      RightPanel.tsx + .module.css     — Metro/Area Stats FABs (disabled)
  services/
    PinService.ts                      — getPins, addPin, reportPin (localStorage v1)
  store/
    usePinStore.ts                     — pins[], totalRent, loadPins, addPin, reportPin
    useFilterStore.ts                  — filters, setFilter, clearFilters
    useUIStore.ts                      — activeModal, pendingLatLng, selectedPin
  data/
    seed-pins.ts                       — 30 hardcoded realistic Hyderabad pins
    localities.ts                      — 25 Hyderabad localities (IT corridor weighted)
  types/
    Pin.ts                             — Pin, PinSubmission, FilterState, DEFAULT_FILTERS
  utils/
    formatters.ts                      — formatRent, formatDaysAgo, formatTotal
    geo.ts                             — inBounds, haversineKm
    pinFilter.ts                       — applyFilters (shared by useMap + CounterBar)
  hooks/
    useMap.ts                          — Mapbox init, marker sync, GPS registry (getMap)
  styles/
    globals.css                        — CSS custom properties (design tokens)
  App.tsx                              — root: onboarding gate, map, layout, modals, GPS
  main.tsx
```

---

### Task 1: Project scaffold ✅
`commit: 167f599`

- [x] `npm create vite@latest . -- --template react-ts`
- [x] `npm install mapbox-gl zustand uuid`
- [x] `npm install -D @types/uuid vitest happy-dom @vitejs/plugin-react`
- [x] Configure `vite.config.ts` with vitest (happy-dom environment, globals: true)
- [x] Add `.env.example` with `VITE_MAPBOX_TOKEN=pk.your_token_here`
- [x] Commit

---

### Task 2: Global CSS + design tokens ✅
`commit: 76558be`

- [x] Write `src/styles/globals.css` with all CSS custom properties
- [x] Import in `main.tsx`
- [x] Commit

Design tokens: `--bg #0d0d1a`, `--surface #141428`, `--surface-2 #1e1e38`, `--border #2a2a4a`, `--accent #7c3aed`, `--accent-dark #6d28d9`, `--accent-light #a78bfa`, `--success #10b981`, `--warning #f59e0b`, `--text #e2e8f0`, `--text-muted #6b7280`, `--text-dim #4b5563`

---

### Task 3: Types, seed data, localities, formatters, geo utils ✅
`commit: cea016f`

**Files:** `src/types/Pin.ts`, `src/data/seed-pins.ts`, `src/data/localities.ts`, `src/utils/formatters.ts`, `src/utils/geo.ts` + tests

- [x] Define `Pin`, `PinSubmission`, `FilterState`, `DEFAULT_FILTERS` in `Pin.ts`
- [x] Write 30 seed pins covering IT corridor + established areas + old city
- [x] Write 25 localities list (IT corridor weighted)
- [x] `formatRent(rent)`: 22000→'22K', 150000→'1.5L'
- [x] `formatDaysAgo(iso)`: 'today' / 'N days ago'
- [x] `formatTotal(totalRent)`: '₹2.3 Cr.'
- [x] `inBounds`, `haversineKm` utilities
- [x] Tests for all utils
- [x] Commit

---

### Task 4: PinService ✅
`commit: 7f883e2`

**Files:** `src/services/PinService.ts`, `src/services/PinService.test.ts`

- [x] `getAllPins()` — merges seed pins + localStorage, deduplicating by id
- [x] `getPinsInBounds(bounds)` — filters by geographic bounds
- [x] `addPin(submission)` — uuid, reportCount:0, createdAt ISO
- [x] `reportPin(id)` — increments; seed pins pulled into storage on first report
- [x] `getTotalRent()` — sum of all pins
- [x] Storage key: `'hyd_pins'`
- [x] Tests
- [x] Commit

---

### Task 5: Zustand stores ✅
`commit: 1437eee`

**Files:** `src/store/usePinStore.ts` + test, `src/store/useFilterStore.ts` + test, `src/store/useUIStore.ts`

- [x] `usePinStore`: `pins[]`, `totalRent`, `loadPins()`, `addPin(submission)→Pin`, `reportPin(id)`
- [x] `useFilterStore`: `filters: FilterState`, `setFilter<K>(key, value)`, `clearFilters()`
- [x] `useUIStore`: `activeModal`, `pendingLatLng`, `selectedPin`, `openModal`, `closeModal`, `setPendingLatLng`, `setSelectedPin`
- [x] Tests for pin store and filter store
- [x] Commit

---

### Task 6: Layout components ✅
`commit: a50fe81` + `329ea26`

**Files:** `src/components/Layout/` — 4 components × (tsx + module.css)

- [x] **TopBar**: fixed top, logo in accent-light, filter button, active-filter dot
- [x] **CounterBar**: fixed pill below TopBar, "tap map to pin rent · ₹X Cr. pinned · N pins" (uses `applyFilters` so count reflects active filters)
- [x] **BottomCTA**: fixed bottom "Find Flat or Tenants →" (placeholder)
- [x] **RightPanel**: fixed right FABs — Metro Lines + Area Stats, both disabled with hover tooltip "Coming soon"
- [x] All CSS via design tokens
- [x] Commit

---

### Task 7: MapContainer + PinMarker ✅
`commit: bf65d06` + `6605e8e`

**Files:** `src/hooks/useMap.ts`, `src/components/Map/PinMarker.ts`, `src/components/Map/MapContainer.tsx` + `.module.css`

- [x] Map: dark-v11, center `[78.4867, 17.3850]`, zoom 12, token from env
- [x] Map click (not on marker) → `setPendingLatLng` + `openModal('pinSubmit')`
- [x] Marker click → `setSelectedPin` + `openModal('pinDetail')`
- [x] `applyFilters` shared utility filters all 6 dimensions + hides `reportCount >= 3`
- [x] `visiblePins` memoized with `useMemo([pins, filters])`
- [x] **PinMarker wrapper+pill pattern**: outer `el` owned by Mapbox (never touch its transform), inner `pill` gets scale on hover — prevents markers jumping on hover
- [x] Named event listener refs for cleanup (no memory leaks)
- [x] Module-level `getMap()` registry for GPS in App.tsx
- [x] `loadPins()` called on MapContainer mount
- [x] Commit

---

### Task 8: OnboardingModal ✅
`commit: b0b26c5` + `1b4d67c`

**Files:** `src/components/Modals/OnboardingModal.tsx` + `.module.css` + `.test.tsx`

- [x] 2-step modal: "What Hyderabadis actually pay" → "How it works"
- [x] Step dots indicator
- [x] localStorage gate: `'hyd_onboarded'='1'` set on finish (not on Escape)
- [x] Escape: `document.addEventListener('keydown')` in `useEffect` (not div onKeyDown — that requires focus)
- [x] Share: `navigator.share` → clipboard fallback with "Copied! ✓" state, AbortError silenced
- [x] `hasOnboarded()` exported for App.tsx
- [x] copyTimerRef cleanup on unmount
- [x] 5 tests
- [x] Commit

---

### Task 9: PinSubmitModal ✅
`commit: d908e71` + `282bf6f`

**Files:** `src/components/Modals/PinSubmitModal.tsx` + `.module.css` + `.test.tsx`

- [x] 9-field form: rent, BHK (1–5), furnished, gated, maintenance, tenant type, deposit months, pets, availability
- [x] Optional locality dropdown
- [x] Read-only coordinates from `pendingLatLng`
- [x] Validation: all 9 required; rent ≥ 1000; deposit 1–12
- [x] `aria-pressed` on all toggle buttons
- [x] Submit → `addPin()` → success state "Pin added! 🙏" → `closeModal()` after 1.5s
- [x] `timerRef` + cleanup `useEffect` (no setState after unmount)
- [x] `hasReportedRef` guards against double-submit
- [x] `locality` passed through `PinSubmission` to `PinService`
- [x] 6 tests (includes fake-timer test for auto-close)
- [x] Commit

---

### Task 10: PinDetailModal ✅
`commit: 32a7afc` + `ff1ff80`

**Files:** `src/components/Modals/PinDetailModal.tsx` + `.module.css` + `.test.tsx`

- [x] Large rent in accent-light, BHK below, availability badge, close button
- [x] Locality line (conditional), timestamp via `formatDaysAgo`
- [x] 5 tag pills: furnished label, gated/open, maintenance, tenant label, pets
- [x] Deposit line
- [x] Share: navigator.share → clipboard fallback, "Copied! ✓", AbortError silenced
- [x] Report: `reportPin(id)` + 2s "Reported." feedback + `hasReportedRef` prevents re-report
- [x] Warning style on report button at `reportCount >= 2`
- [x] Live pin data: reads from `usePinStore.pins` by id so `reportCount` updates in real time
- [x] Both timer refs cleaned up on unmount
- [x] Guard: `if (!selectedPin) return null`
- [x] 5 tests
- [x] Commit

---

### Task 11: FilterPanel ✅
`commit: 28dbc8b` + `951ca6a`

**Files:** `src/components/Modals/FilterPanel.tsx` + `.module.css` + `.test.tsx`

- [x] Locality: `<select>` with "All localities" default
- [x] BHK: multi-select toggles, `aria-pressed`
- [x] Rent range: two inputs with `<label htmlFor>` (accessible), cross-validated (min ≤ max clamped on change)
- [x] Furnishing: multi-select toggles, `aria-pressed`
- [x] Gated: 3-way toggle (All / Gated / Open), `aria-pressed`
- [x] "Clear all" → `clearFilters()`
- [x] "Apply filters" → `closeModal()`
- [x] 8 tests (including rent range and min>max clamp tests)
- [x] Commit

---

### Task 12: Wire App.tsx ✅
`commit: 01e5311` + `8fc1c40` + `0b64d3b` + `3524310`

**Files:** `src/App.tsx`, `src/hooks/useMap.ts`

- [x] `VITE_MAPBOX_TOKEN` guard (throws actionable error if missing)
- [x] `useEffect` on mount: `!hasOnboarded()` → `openModal('onboarding')`
- [x] `<MapContainer token={MAPBOX_TOKEN} />`
- [x] Layout: `<TopBar />`, `<CounterBar />`, `<RightPanel />`, `<BottomCTA />`
- [x] GPS button (fixed bottom-left): `navigator.geolocation` → `getMap()?.flyTo({ zoom: 15, duration: 1500 })`
- [x] Modal switching: `activeModal` → renders correct modal
- [x] `.env.example` scrubbed of real token
- [x] Test files excluded from `tsc -b` via `tsconfig.app.json`
- [x] Commit

---

## Known Limitations (deferred to v2)

- Supabase backend (real persistence across users)
- Zoom-based pin clustering (for dense areas)
- Metro overlay (HMRL lines + stations)
- Area stats (draw-to-analyse)
- Flat hunt / seeker matching + email notifications
- Comments + ratings on pins
- PWA manifest + offline support
- `BottomCTA` "Find Flat or Tenants" → real destination
- `haversineKm` and `getPinsInBounds` implemented but unused in UI (ready for v2 nearby-pins feature)
