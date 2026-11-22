# tspots Design: "Living Paper Boston" (Agent C)

The whole app is a miniature Boston built from origami buildings, folded card stock and layered paper landscapes,
laid out on a warm kraft table. Every screen should feel handmade, tactile and warm, but stay fast, legible outdoors
and accessible. Gameplay, data and demo flows are unchanged by the visual system.

## 1. Principles
1. **Paper, not plastic.** Surfaces are card stock (cream on kraft) with a grain, hairline cut edges and soft
   *contact* shadows. No glassmorphism, no blur, no neon glow, no big rounded "app" radii (cards 6px, sheets 14px).
2. **Folds carry depth.** Depth comes from a lit face + shaded face + crease, never gradients for their own sake.
3. **Boston, recognizably.** Brownstones, triple-deckers, the State House dome, Custom House, Zakim, Citgo, Back Bay
   towers, Fenway, the Great Dome, Seaport cranes, swan boats. Scenery is decorative, never a factual claim.
4. **Line colors are identity.** Red/Orange/Blue/Green/Silver (contract) stay exact for chips, route strips and team
   buildings. Use the `--glow-*` twins for text on paper.
5. **Progressive detail.** Maps and the city show less when zoomed out and reveal labels/scenery as you zoom in.
6. **Demo path first.** ride -> points -> city grows -> delay -> hunt -> perk must keep working on every change.

## 2. Tokens (`src/styles/tokens.css`)
| Token | Use |
|---|---|
| `--kraft` (`--bg`) | Table / page backdrop |
| `--cream` (`--paper`), `--cream-2` (`--surface`), `--cream-3` (`--surface-2`) | Card stock layers |
| `--fold-shadow`, `--paper-edge`, `--paper-lift(-2)` | Fold half, cut edge, contact shadow |
| `--ink`, `--muted`, `--faint` | Warm graphite text; `--faint` is decorative only |
| `--accent` / `--accent-ink` / `--accent-soft` | Common green: points, primary CTA, active nav |
| `--brick`, `--gold` / `--gold-ink`, `--harbor`, `--hot` | Stamps/pins, rewards, water, live/delay |
| `--shadow-card`, `--shadow-float`, `--shadow-stack`, `--shadow-press` | Paper elevation |
| `--grain` | SVG noise background layer (add to any paper surface) |
| `--font-display` (Fraunces), `--font-hand` (Caveat), `--font-body` (Geist) | Headlines / notes & stamps / UI |
| `--ease-fold`, `--dur-fold` | Fold-in motion with slight overshoot |

Legacy names (`--surface`, `--glass`, `--glow-*`, `--radius-card`) remain and resolve to paper values, so older
components restyle automatically. `.glass` is now opaque card stock.

## 3. Paper primitives (`src/components/paper/Paper.tsx` + classes in `globals.css`)
- `PaperCard` (`.paper`): props `fold` (dog-ear), `stack` (layered sheet behind), `kraft`, `crease`, `tilt="l|r"`, `unfold` (entrance).
- `PaperButton` (`.paper-btn`): `variant="default|primary|danger|ghost"`, `size="md|sm"`. Presses *down* 2px.
- `Tape`, `Pin` (`.paper-tape`, `.paper-pin`): decorations, place in a `position:relative` parent.
- `Stamp` (`.paper-stamp`): rotated rubber-stamp label. `PaperBadge` (`.paper-badge`): punched luggage tag.
- `Eyebrow` (`.paper-eyebrow`): uppercase section label. `.hand`: handwritten text (decorative/short only).
- `.paper-unfold` animation; `paper-bob` keyframes for idle markers.
- `SimTrigger` (`paper/SimTrigger.tsx`): compact bottom-left demo control; drives the existing arrow-key stepper.

## 4. Origami illustration kit (`src/components/paper/origami.tsx`)
`Brownstone`, `TripleDecker`, `StateHouse`, `CustomHouse`, `OldNorth`, `Zakim`, `Citgo`, `BackBayTowers`, `Fenway`,
`GreatDome`, `SeaportCrane`, `SwanBoat`, `PaperTree`, `PaperElm`, `PaperCloud`, `PaperWaves`, `PaperFlag`, `PaperT`.
All take `height`, `tint`, `title`; sit on a bottom baseline so they line up as a street. Helpers: `shade(hex, amt)`,
`faces(hex)` (lit/mid/dark/crease), `artForStation(name)` and `<StationArt name>` for loose station-to-landmark art.

## 5. Navigation
Folded paper strip with a center crease; active tab gets a small folded flag. Ride is a faceted green origami
medallion; when active a five-line paper ring folds in around it. Live ride shows a blinking `--hot` dot.

## 6. Screens
- **Ride (top priority):** "Living Route Card": a horizontal paper strip of the current line showing the current
  station, next station, upcoming stops and nearby hotspots, with origami station art. Full system stays reachable
  via the Hunt map.
- **Hunt:** layered-paper transit network on kraft, papercut neighborhoods and landmarks, folded flag markers.
- **City:** isometric origami Boston: building archetypes per district, folded terrain, paper trees and water.
- **Perks / board:** station community noticeboard: pinned/taped paper notices, stamps.
- **Me / Friends:** rider passport with collectible stamps; papercut route illustrations on friend cards.

## 7. Accessibility
Tap targets >= 44px. Body text `--ink`/`--muted` on cream/kraft (>= 4.5:1). Never encode state by color alone.
Decorative SVG is `aria-hidden`. Honor `prefers-reduced-motion` (global rule already shortens animations).
Handwritten font only for short decorative labels.
