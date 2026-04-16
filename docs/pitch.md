# hyderabad.rent — Product Pitch

> "What Hyderabadis actually pay in rent."

---

## The Problem

Rent in Hyderabad is opaque. Brokers quote inflated rates. Listings on NoBroker and MagicBricks show asking prices, not what people actually pay. First-time renters — students, IT freshers, families relocating — have no baseline. They overpay because they don't know better.

The information exists. It lives in WhatsApp groups, office corridors, and housing society chats. It just isn't public.

**hyderabad.rent makes it public.**

---

## What It Is

A community-driven, crowdsourced rent transparency map for Hyderabad. No login. No broker. No AI estimates. Real rents from real Hyderabadis, pinned on a map.

Anyone can:
- See what a 2BHK actually costs in Kondapur vs. Ameerpet
- Drop a pin with what they pay in 30 seconds
- Filter by BHK, locality, furnishing, society type, rent range

**Proof of concept:** bengaluru.rent — the Bangalore equivalent — hit **₹185 Crore in total rent pinned** with the same model. Hyderabad has a larger IT corridor population and no equivalent product.

---

## The Flows

### Flow 1 — Rent Transparency (Live)

**Problem:** A new joiner at an IT company in Hitech City doesn't know if ₹28,000 for a 2BHK in Kondapur is fair or inflated.

**Solution:** Open the map, filter by 2BHK + Kondapur. See 12 real pins. Form an informed view in under a minute.

```
User opens map
→ Sees 30+ pins across Hyderabad
→ Taps filter → selects 2BHK + Kondapur + ₹20K–40K
→ Sees pins with rent, furnishing, society type, deposit
→ Taps a pin → full detail (gated/open, pets, tenant preference, days pinned)
```

**Status:** Shipped. Live at hyd.rentals.

---

### Flow 2 — Pin Submission (Live)

**Problem:** People know what they pay but have nowhere to share it publicly without a broker extracting value from that information.

**Solution:** Tap the map, fill a 30-second form, pin your rent anonymously. No login, no broker, no intermediary.

```
User taps map at their location
→ Form: rent, BHK, furnishing, gated?, maintenance, tenant type, deposit months, pets
→ Submits → pin appears on map immediately
→ EmailClaimModal: optional email for Verified badge + matching alerts
```

**Security:** Rate-limited (3 pins/device/day). Plausibility gate rejects implausible rents (e.g., ₹200K for a 1BHK). Community reporting auto-hides pins with 3+ flags. IP hashing server-side — no client manipulation.

**Status:** Shipped. Pins persist in Supabase, visible to all users globally.

---

### Flow 3 — Verified Badge + Ownership (Live — partial)

**Problem:** Anonymous pins are useful but untrustworthy at scale. Fake pins undermine the dataset.

**Solution:** After pinning, users can optionally claim their pin with an email. This:
- Gives them a Verified ✓ badge on their pin
- Lets them edit or remove the pin later (v3)
- Feeds them into the matching engine (v3)

```
Pin submitted
→ EmailClaimModal: "Add your email to get matched + Verified badge"
→ User enters email → claimPin() RPC stores email securely
→ Pin shows Verified ✓ badge on detail view
```

**Status:** Email capture shipped. Badge displayed. Edit/remove + matching engine next.

---

### Flow 4 — Seeker Intent Capture (Next)

**Problem:** Someone looking for a flat in Gachibowli under ₹30K has to manually check the map repeatedly. There's no way to say "notify me when something matching my criteria comes up."

**Solution:** The "Find Flat" button captures seeker intent: area + BHK + budget + email. A nightly matching job connects seekers to landlords who've claimed nearby pins.

```
User taps "Find Flat" CTA
→ SeekerModal: areas (multi-select), BHK preference, max budget, email
→ Stored in seekers table
→ Nightly Edge Function: matches seekers to verified pins within 3km
→ Email to seeker: "New 2BHK in Kondapur for ₹26K — matches your search"
→ Email to landlord: "Someone's looking for exactly what you pinned"
```

**This closes the two-sided loop.** Landlords get leads. Seekers get alerts. No broker needed.

**Status:** Designed. Building next.

---

### Flow 5 — Area Intelligence (Planned)

**Problem:** Aggregate rent data is only useful if you can draw insights from it — not just see individual pins.

**Solution:** Draw a polygon on the map to get area stats: median rent by BHK, price trends, density heatmap.

```
User taps "Area Stats" FAB (currently disabled)
→ Draw mode: tap to draw polygon around any neighborhood
→ Stats panel: median rent per BHK, total pins in area, avg deposit, furnished %, gated %
→ Shareable link: "Rents in Madhapur"
```

**Status:** FABs present in UI, disabled with "Coming soon." Data exists in Supabase.

---

### Flow 6 — Metro + Commute Overlay (Planned)

**Problem:** Rent decisions are commute decisions. A flat in Miyapur for ₹18K is very different depending on whether you work near HICC or Financial District.

**Solution:** Overlay HMRL metro lines and stations on the map. Show commute time from any pin to any station.

```
User taps "Metro Lines" FAB
→ HMRL Phase 1 + 2 lines drawn on map
→ Station markers
→ Tap a pin → "12 min walk to Hitech City Metro"
```

**Status:** FAB present, disabled. Data sourced from HMRL open data.

---

### Flow 7 — Flat Photos + Condition (Planned)

**Problem:** Rent alone doesn't tell you the condition. ₹25K in Kondapur could be a 2019 apartment or a 1990s building.

**Solution:** When claiming a pin, owners can upload photos via Supabase Storage. Photos appear in the detail modal.

```
Landlord claims pin with email
→ Optional: upload up to 3 photos
→ Photos stored in Supabase Storage, shown in detail modal
→ Verified badge upgrades to Verified + Photos badge
```

**Status:** Planned for v4. Supabase Storage already available.

---

## The Flywheel

```
More seekers register intent
        ↓
More incentive for landlords to claim pins with email
        ↓
More verified, high-quality pins
        ↓
Better matches → more value for both sides
        ↓
Word of mouth → more users drop pins
        ↓
More pins → more seekers trust the data
```

Each side reinforces the other. bengaluru.rent demonstrated this works — they have no seeker flow yet. We will.

---

## Market

- **Hyderabad rental market:** ~2.5 lakh active rental transactions/year in the IT corridor alone (Gachibowli, Hitech City, Kondapur, Madhapur, Financial District)
- **Primary users:** IT professionals (70% of Hyderabad's rental demand), students (BITS, IIIT, CBIT), families relocating from other cities
- **Pain:** Median broker commission = 1 month's rent (₹20K–60K per transaction). The information asymmetry is the broker's entire business model.
- **Comparable:** bengaluru.rent, launched ~2024, ~₹185 Cr pinned, no seeker flow, no matching

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Map | Mapbox GL JS (dark style) |
| State | Zustand |
| Backend | Supabase (PostgreSQL + RLS + Edge Functions) |
| Security | Server-side RPC functions, IP hashing, rate limiting |
| Hosting | Vercel (auto-deploy from GitHub) |
| Domain | hyd.rentals |

---

## What's Live Today

| Feature | Status |
|---------|--------|
| Full-screen dark map, Hyderabad-centered | ✅ |
| 30 seed pins (realistic 2024-25 market rates) | ✅ |
| Anonymous pin submission (30 seconds) | ✅ |
| Persistent storage — all pins visible to all users | ✅ |
| Plausibility gate + rate limiting + community reporting | ✅ |
| Filter by BHK, locality, rent range, furnishing, society | ✅ |
| Email claim → Verified badge | ✅ |
| GPS "My Location" | ✅ |
| Mobile-first responsive | ✅ |

---

## Roadmap

| Version | Features |
|---------|---------|
| **v2 (live)** | Supabase persistence, email claim, Verified badge, rate limiting, community reporting |
| **v3 (next)** | Seeker intent form, nightly matching emails, seeker ↔ landlord connection |
| **v4** | Area stats (draw-to-analyse), pin clustering for dense zones |
| **v5** | Metro overlay (HMRL), commute time from pin to station |
| **v6** | Flat photos via Supabase Storage, edit/remove owned pins |
| **Future** | Real-time pin subscriptions, broker-free direct messaging, PWA, Hyderabad-specific insights (IT corridor vs Old City rent gap) |

---

## Why This Wins

1. **Zero friction.** No login. No app download. Tap, fill, pin. 30 seconds.
2. **Community-owned data.** Not scraped, not AI-generated, not brokered. Real people, real rents.
3. **Both sides win.** Seekers find fair-priced flats. Landlords get leads without broker commission.
4. **Moat is the data.** Every pin makes the product more valuable. Competitors can copy the UI — they can't copy 10,000 real Hyderabad rent data points.
5. **Proven model.** bengaluru.rent validated demand. We're Hyderabad-first with a better product roadmap.

---

*Built with React, Supabase, and Mapbox. Deployed on Vercel. Live at hyd.rentals.*
