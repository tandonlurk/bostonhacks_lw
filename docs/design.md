# T-City Design Notes (Agent C)

Status: draft, written before T01 scaffold lands. Will be revised against real components once `src/app/(app)/**` exists. Owner: C. Edit via normal PR, no `type:contract` needed (this file isn't shared infra).

## 1. Visual direction

**Feel:** MBTA signage, not generic gradient-SaaS. Flat color, bold line-color accents, high contrast for outdoor/sunlight phone use, system-UI type stack (no custom webfont to load on a 3G platform).

- **Palette:** line colors are fixed by `docs/CONTRACTS.md` section 1 — never reinvent them:
  - Red `#DA291C`, Orange `#ED8B00`, Blue `#003DA5`, Green `#00843D`, Silver `#7C878E`.
- **Neutrals:** near-black ink (`#14181C`) on off-white (`#F7F7F5`) for light; dark mode inverts to `#14181C` background / `#F2F2F0` ink, same line colors (they're all legible on both).
- **Type:** system-ui / -apple-system stack. Bold weights for numbers (points, tiers) so the leaderboard and district tiers read like a scoreboard, not body copy.
- **Shape language:** rounded-rect "pill" chips for line/team identity (mirrors MBTA line-badge style), card surfaces with 12-16px radius, no skeuomorphism.
- **Motion:** short (150-250ms), ease-out, respects `prefers-reduced-motion: reduce` (disable tier-up bounce, cross-fade instead).

## 2. Mobile-first layout

Design at 360-430px width first; nothing below a 44px tap target.

- **Shell:** fixed bottom tab bar (5 tabs max: Ride, City, Hunt, Perks, Me), top status strip only while a ride session is active (shows state: searching / on vehicle / in tunnel / left + elapsed stops).
- **Single-column everything.** No side-by-side panels below `sm`. Map and city view are full-bleed with overlay cards (bottom sheet pattern), not split-screen.
- **Safe areas:** padding via `env(safe-area-inset-*)` for notch/home-indicator devices.
- **Progressive disclosure:** hunt clues, perk redeem, and landmark claim all open as bottom sheets over the current screen rather than full navigation, so the rider never loses their map/ride context.

## 3. Component inventory

| Component | Purpose | Notes |
|---|---|---|
| `LineChip` | Line/team identity pill (color + short name) | Used in nav, leaderboard, ride status |
| `StatusBadge` | Ride state indicator | searching / on_vehicle / in_tunnel / left — color + icon, not color alone (accessibility) |
| `VehicleMarker` | Map marker for a live vehicle | Tinted by `teamRouteId` color, bearing-rotated arrow |
| `LeaderboardRow` | Per-team rank row | Big number, line chip, small rider count |
| `DistrictGrid` | Grid of lots for one line's district | Renders `BuildingTile` per lot from `/api/districts` |
| `BuildingTile` | One lot's building art | SVG tier 0-5, tinted to line color, tier-up bounce |
| `DelayBanner` | Sticky banner when `/api/delay` is active | Tap-through to `HuntCard` if near a station |
| `HuntCard` | Station clue list | Tap-to-confirm per clue, shows `verified:false` watermark until humans confirm in person |
| `LandmarkMarker` + `ClaimButton` | Map marker + geofenced claim action | Claim button disabled until within radius |
| `TokenWallet` | CitiToken balance pill | Shown in nav/profile |
| `PerkCard` | Catalog item | Cost, remaining stock, rotation countdown |
| `RedeemSheet` | Redeem confirmation + QR | Shows `redemptionCode` as QR for in-person scan |
| `EmptyState` / `LoadingState` | Shared placeholders | Every screen needs both before first real data arrives |

## 4. District city art concept

Each line's district (`GET /api/districts`) is a grid of lots; each lot has `tier: 0-5` per `docs/CONTRACTS.md` section 6 (thresholds 20/60/140/300/600 points).

**Approach:** one shared set of 6 tier-silhouette SVGs (`public/city/tiles/tier-0.svg` … `tier-5.svg`), drawn with `fill="currentColor"` so each lot is tinted at render time via `color: <line color>` — no per-line duplication of the base geometry. Shapes get taller and more detailed per tier: tier 0 is an empty lot marker, tier 5 is a landmark tower with a rooftop detail.

On top of that, each district gets a small **motif overlay** (`public/city/motifs/<line>.svg`) that appears once a lot reaches tier 4+, so districts read as visually distinct neighborhoods rather than identical colored blocks:

| Line | District theme | Motif (tier 4-5 overlay) |
|---|---|---|
| Red | Kendall/Harvard innovation | rooftop antenna/mast |
| Orange | JP / South End / Back Bay neighborhoods | brownstone cornice/bay-window silhouette |
| Blue | Harbor / Airport waterfront | shipping crane |
| Green | Fenway and campuses | clock tower / spire |
| Silver | Seaport | glass curtain-wall grid pattern |

`BuildingTile` renders: `tier-N.svg` (tinted) + motif overlay if `tier >= 4` + a tier-up animation (scale 0.9→1 with a small overshoot, 200ms) triggered when `tier` increases, implemented in T06.

Lot `kind` (from the districts sketch in `docs/KICKOFF.md` section 8) can later vary footprint size on the grid; out of scope for this first pass — all lots render as a uniform grid cell for now.

## 5. Assets shipped with this doc

- `public/city/tiles/tier-0.svg` … `tier-5.svg` — base building silhouettes, `currentColor` fill.
- `public/city/motifs/red.svg`, `orange.svg`, `blue.svg`, `green.svg`, `silver.svg` — per-district overlay accents.

These are placeholders for T06 to wire up against real `/api/districts` data; swap/refine freely once the district grid is actually on screen.
