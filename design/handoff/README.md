# Handoff: Clothesline — virtual wardrobe with TCI colour matching

## Overview
Clothesline is a mobile-first web app (it can be wrapped as a PWA or native later). Users photograph or upload clothes. The app cuts each garment out of its photo, tags it, and places its colour in one of the **TCI (True Colour International) 12 Tones**. The pieces then hang on two "clotheslines" (tops and bottoms) that the user flips through to build outfits.

Matching is personal. The user sets their TCI tone, and every piece and outfit is scored against it. **Match me** recommends outfits for an occasion the user types or picks ("Holiday party", "Thanksgiving", "Botanical garden walk", "Night out with the girls"…), weighing tone, dress code, weather and contrast.

## About the design files
The files in this bundle are **design references built in HTML**: working prototypes that show the intended look and behaviour. They are not production code to copy. Recreate them in the target codebase's environment using its established patterns. If there is no codebase yet, choose a suitable stack; a reasonable default is **React + TypeScript + Vite (PWA)**, or **Expo / React Native** if a native camera is needed early.

To open the prototypes, serve the folder over HTTP (e.g. `npx serve .`) and open `Clothesline App.dc.html`. `support.js` is only the prototype runtime and should be ignored for the build.

## Fidelity
**High-fidelity.** Colours, type, spacing, copy and interactions are final, and all of them come from the **Nocturne** design system (`_ds/.../styles.css`, guide in `_ds/.../readme.md`). Rebuild the UI to match. Use Nocturne tokens (`var(--color-*)`, `--space-*`, `--radius-*`, `--shadow-*`) rather than hard-coded values.

The garment drawings are **placeholder silhouettes**, simple SVG paths filled with the item colour. In production they are replaced by the real background-removed cut-out PNGs.

---

## App structure

The app is a single column with `max-width: 430px`, centred, `min-height: 100vh`.

- **Page background:** `linear-gradient(180deg, var(--color-surface) 0, var(--color-bg) 320px)` — the "Ledger" direction.
- **Bottom tab bar:** five tabs, `Outfit · Wardrobe · [Add] · Looks · Profile`.
  - Fixed, 76px tall, `background: var(--color-bg)`, top hairline `0 -1px 0 var(--color-neutral-800)`.
  - Labels are 11px. Active tab is `--color-accent-300`; inactive is `--color-neutral-500`.
  - **Add** is a 44px circle with a 1px accent ring and a glow when active (`0 0 18px var(--color-accent-800)`), and has no label.
- **Pushed screens:** Occasion, Match, Item, Quiz and Tones hide the tab bar. They show a back row instead: a ghost button with a chevron and the parent's name on the left, and context text in `--color-neutral-500` on the right (e.g. "Look 2 of 5", "2 of 3").

### Navigation map
```
Outfit ──Match me──▶ Occasion ──Find my outfit──▶ Match ──Hang this look──▶ Outfit
   │  └─tap piece in fitting panel──▶ Item
Wardrobe ──tap row──▶ Item ──Put on the line / tap "Goes with"──▶ Outfit
Add ──scan──▶ (done) ──Hang it on the line──▶ Outfit
Looks ──Wear──▶ Outfit
Profile ──Find your tone──▶ Quiz (3 steps + result) ──Use tone──▶ Profile
        └─Choose from all 12 tones──▶ Tones ──pick──▶ Profile
```

### Shared type patterns (all Inter, via `--font-body`)
| Role | Size / weight / tracking |
|---|---|
| Screen display title ("Mon 12", "Wardrobe", "Looks") | 48px / 500 / -0.04em / lh 0.95 |
| Tone name hero (Profile, Quiz result) | 44px / 500 / -0.04em / lh 1 |
| Pushed-screen title ("What's it for?", look title) | 34px / 500 / -0.03em / lh 1.05 |
| Quiz question | 30px / 500 / -0.03em / lh 1.1 |
| Kicker / section label | 11px / uppercase / 0.08em / `--color-neutral-500` |
| Body / rows | 13px; secondary 12px; meta 11px |
| Score numbers | 28px (Match), 72px (big variant in Directions 2b) |

Headings never go above weight 500. Primary buttons are **outlined** (`.btn-primary`), never filled. Accent glow on key CTAs: `box-shadow: 0 0 20px var(--color-accent-800)`.

---

## Screens

### 1. Outfit (tab, home)
**Purpose:** build today's outfit from two clotheslines.

- **Header** (padding 22px 17px 0):
  - Left: date `"{Weekday short} {day}"` at 48px. Under it, 13px `--color-neutral-400`: "17° overcast · {Tone name}".
  - Right: **Match me** button (`.btn-primary`, 44px tall, sparkle icon, glow). Opens Occasion.
- **Two strips**, Tops then Bottoms:
  - Label row: "TOPS · 4 / 7" (11px uppercase), with prev/next icon buttons (`.btn-ghost .btn-icon`) on the right.
  - Strip: 84px tall. The line is an SVG quadratic sag `M0 4 Q195 18 390 4`, stroke 1px, gradient that fades to transparent at both ends (Nocturne rule: lines fade over ~15% each side).
  - Each piece hangs at `left = 7% + i × (86% / (n−1))`, following a slight sine sag.
    - Unselected: 30px, opacity 0.55, neutral pin.
    - Selected: 58px, opacity 1, accent pin (`--color-accent`, 8% × 14%).
    - Size changes animate over 0.35s `cubic-bezier(.34,1.5,.5,1)`, a springy "swing".
  - Below each piece is a 4px tone-match dot: accent = in tone, `--color-neutral-400` = near, transparent with a hairline = outside.
  - Controls: tap a piece to select it, swipe the strip (|dx| > 36px) for next/previous (wraps around), or use the arrow buttons.
- **Fitting panel** (margin 22px 17px 0): grid `136px | 1fr`, gap 11px.
  - Left: 196px-tall rounded panel (`--radius-lg`) with background `radial-gradient(80% 60% at 50% 40%, var(--color-accent-900), var(--color-bg))`. The top (92px) and bottom (84×100) are composited as one figure.
  - Right column:
    - For each piece: a 22px colour swatch, name (12px/500), tone name (neutral-500), and match label (coloured by match). Tapping it opens Item.
    - **Contrast**: 4px gradient track (neutral-800 → neutral-500) with a 2×12px accent marker. Label is Low / Medium / High.
    - **Tone fit**: 4px track with an accent gradient fill; the number sits on the right.
- **Actions:** two `.btn-secondary` buttons, **Shuffle** (random pair, never the same pair twice in a row) and **Save look** / **Saved ♥** (toggle; label turns accent-300 when saved).

### 2. Occasion — "What's it for?" (pushed)
- Kicker "OCCASION", title "What's it for?".
- **Textarea** (`.input`, 3 rows, 16px). Placeholder: "e.g. Work holiday party, Friday evening". It is parsed live (see *Occasion parsing*).
- **Quick-pick chips** (pill, 12px, 1px inset ring): Holiday party · Thanksgiving · Botanical garden walk · Night out with the girls · Date night · Interview.
  - Active chip: accent ring, `--color-accent-900` background, `--color-accent-200` text.
  - Tapping a chip fills the textarea with its label.
- **"WHAT WE PICKED UP · {label}"**: rows for When / Setting / Weather. Each row is a 84px label column plus the value, 44px tall, with a neutral-800 hairline.
- **Dress code** segmented control (4 buttons): Casual · Smart · Dressy · Formal. It defaults from the parsed occasion and the user can override it.
- **Find my outfit** (block primary button with glow). Helper text under it: "Uses your {Tone} profile and the {n} pieces you own".

### 3. Match (pushed, "Match me" results)
- **Pips:** 3px bars; the active one is 18px wide in accent, the rest 6px in neutral-700.
- Kicker "FOR · {occasion label}". Look title, e.g. "Rust & slate", at 34px; on the right, the **tone fit** number at 28px with a "TONE FIT" caption.
- **Tags** (`.tag .tag-neutral`): dress code, time of day, setting.
- **Stage**, 270px tall:
  - Radial glow (`closest-side, --color-accent-800 → transparent`, opacity 0.75).
  - A short fading line, with the top (128px, two accent pins) hanging above the bottom (136×150). Drop shadow `0 12px 16px rgba(0,0,0,.5)`.
  - **Callouts**: a 14px accent hairline plus text, to the right of the top and to the left of the bottom. Each shows the name (11px/500) and the match label.
  - Swipe left/right on the stage to change looks.
- **Reasons**: three rows in a `72px | 1fr` grid. Keys are 10.5px uppercase neutral-500 (OCCASION / TONE / WEATHER); values are 12px neutral-200. All copy is generated (see *Reason copy*).
- **"FINISH IT WITH"**: pill chips, each with an 8px colour dot, listing accessories from the occasion preset.
- **Actions** (grid `44px | 1fr | 1.4fr`): Save (heart, fills when saved) · **Another look** (secondary, cycles) · **Hang this look** (primary; sets the outfit and returns to Outfit).

### 4. Wardrobe (tab)
- Title "Wardrobe", with "13 pieces · 7 tops · 6 bottoms" under it.
- Filter buttons (`.btn-primary` when active, otherwise `.btn-ghost`; 12px): **All · In my tone · Tops · Bottoms**.
- **Grouped list**:
  - All: grouped as Tops / Bottoms.
  - In my tone: grouped as "In your tone" / "Near your tone", followed by "{n} outside your tone hidden" and a **Show** link.
- **Row** (56px tall; grid `40px | 1fr | auto`):
  - 40px rounded tile on `--color-bg` with a 30px garment.
  - Name (13px/500) and "{Colour} · {Fabric} · {Tone}" (11px neutral-500).
  - 7px match dot.
- Tapping a row opens Item.

### 5. Item detail (pushed)
- **Stage** (250px tall): glow, fading line, and the garment at 210px with two accent pins. Uses the real photo cut-out when there is one, wrapped in Nocturne `.lighten` (`mix-blend-mode: lighten`).
- Category kicker, name at 34px, and a match row (dot plus "In your tone" / "Near your tone · {tone}" / "Outside your tone · {tone}").
- **Attribute rows** (`96px | 1fr`, 44px tall):
  - Colour (with a swatch)
  - Tone
  - Fabric
  - Formality (4 dots)
  - Warmth (3 dots)
  - Worn ("{n} times" / "Not yet")
- **"GOES WITH"**: three `.card` tiles showing the best partners from the other category for an everyday occasion, each with a "Fit {n}" label. Tapping one hangs that pair.
- **Actions:** **Remove** (ghost; blocked if it would empty a category; also deletes saved looks that use the piece) and **Put on the line** (primary).

### 6. Add a piece (tab)
- Title "Add a piece". Helper text: "Shoot it flat or on a hanger in daylight. We cut it out, tag it and place its colour in a tone."
- **Viewfinder:** square, `--radius-lg`, with four 22px accent corner brackets.
- **Idle state:**
  - Hanger icon, with "One item per photo works best".
  - **Take photo** (primary; `<input capture="environment">`) and **Upload** (secondary).
  - Ghost button "Try with a sample photo".
- **Scanning:**
  - An accent scan line with a glow sweeps top↔bottom (1.8s ease-in-out, infinite).
  - Four steps tick through at about 750ms each: Finding the garment → Removing the background → Reading its colour → Placing it in a TCI tone.
  - Step dot colours: done = accent, current = accent-300, pending = neutral-700.
- **Done:**
  - Editable **Name** (`.field` + `.input`).
  - **Top / Bottom** segmented control.
  - The detected colour swatch, with "{Tone} · {match}".
  - **Retake** (ghost) and **Hang it on the line** (primary; adds the item, selects it on its line and goes to Outfit).

### 7. Looks (tab)
- Title "Looks" with "{n} saved". Empty state: "Save a look from Outfit or Match me and it lands here."
- **Two-column grid of `.card`s:**
  - 132px composite figure on the glow background.
  - Title "{Top colour} & {bottom colour}" and "{occasion} · Fit {n}".
  - **Wear** (secondary) and a remove icon button.

### 8. Colour profile (tab)
- Kicker "COLOUR PROFILE · TCI 12 TONES", the tone name at 44px, and "{Hue} · {Value} · {Chroma}" (e.g. "Warm-neutral · Medium · Soft").
- **Palette:** a 4×2 grid of swatches (aspect 1.3, `--radius-md`).
- **Dimension sliders** (Hue Cool↔Warm, Value Light↔Dark, Chroma Soft↔Bright):
  - 4px gradient track with a 12px ring marker (`--color-bg` fill, 2px accent ring).
  - End labels at 10.5px neutral-600.
- **Wardrobe fit:** an 8px segmented bar (in = accent, near = neutral-500, out = neutral-800), with counts under it.
- **Rows:** "Find your tone in 3 questions ›" and "Choose from all 12 tones ›".

### 9. Find your tone (quiz, pushed)
- Progress: three 3px bars.
- One question per screen. Kicker is the dimension name, then the question at 30px and helper text at 13px:
  1. **Hue** — "Which metal looks better against your skin?" Options: Gold (+1) · Both, gold edges it (+0.5) · Both, silver edges it (−0.5) · Silver (−1).
  2. **Value** — "Which shades sit best near your face?" Options: Light (.15) · Mid (.5) · Deep (.85).
  3. **Chroma** — "Clear and bright, or soft and muted?" Options: Clear and bright (.9) · In between (.5) · Soft and muted (.15).
- **Option card** (grid `96px | 1fr | 18px`): a 4-colour example strip, label and sub-label, and a radio. Selected: `0 0 0 1px accent, 0 0 18px accent-900`.
- **"NARROWING TO"**: all 12 tones as pills. The best candidates are full-colour (top 5 − answered; top 3 once all three are answered), the rest dim to neutral-700, and the best match gets an accent ring.
- **Result:** "YOUR CLOSEST TONE", the tone at 44px, its description, the 8-swatch palette, and its neighbouring tones highlighted. CTA: "Use {Tone}".
- Footer: "A starting point. A certified TCI analysis confirms your tone."
- Continue is disabled until the current question is answered. Back steps through the questions.

### 10. All 12 tones (pushed)
- Grouped by season (Spring / Summer / Autumn / Winter), three tones per row.
- Each tile shows a 4-swatch strip and the name. The current tone gets the accent ring with a glow. Picking a tile sets the tone and returns to Profile.

---

## Domain logic (implement as a pure, unit-tested module)

### TCI 12 Tones: natural order (adjacent = "neighbour")
`Light Spring, True Spring, Bright Spring, Bright Winter, True Winter, Dark Winter, Dark Autumn, True Autumn, Soft Autumn, Soft Summer, True Summer, Light Summer` (wraps around).

Each tone has the vector `t` (temperature −1 cool … +1 warm), `v` (value 0 light … 1 dark), `c` (chroma 0 soft … 1 bright), plus an 8-colour palette. See `TONES` in `Clothesline App.dc.html`.

> ⚠️ The palette hexes are **placeholders**. Production needs TCI's licensed tone database or palettes, and colour→tone allocation should use TCI's data where it's available. TCI hand-allocates its hues, and they also offer a matching extension.

### Item → tone
- In production, each garment stores the tone determined at scan time.
- The prototype's fallback classifier (`classifyHex`):
  - sRGB → OKLCH.
  - `t = cos(h − 70°) × min(1, C/0.05)`; `v = clamp((0.95 − L)/0.7)`; `c = min(1, C/0.15)`.
  - Pick the nearest tone by weighted distance: `0.8·Δt² + Δv² + 1.2·Δc²`.

### Match
- Circular distance between the item's tone and the user's tone: 0 → **in**, 1 → **near**, otherwise **out**.
- **Tone fit** (0–100) = `FIT[top]·0.6 + FIT[bottom]·0.4`, where in = 100, near = 72, out = 38. The top weighs more because it sits near the face.

### Item attributes
- `cat` (top|bottom), `kind` (shirt, tee, tank, jeans, shorts, skirt)
- `color` (hex), `colorName`, `fabric`, `tone`
- `f` = formality, 1 Casual … 4 Formal
- `w` = warmth, 1 Light … 3 Warm
- `wears`, `photo` (cut-out URL)

### Occasion presets
| key | label | code | when | setting | weather | warmth | contrast | finish |
|---|---|---|---|---|---|---|---|---|
| today | Today | 1 | Today · daytime | Out and about | 17° overcast | 2 | – | White trainers, Canvas tote |
| holiday | Holiday party | 3 | Evening | Indoors, standing, then a bar | 4° out, warm inside | 2 | – | Gold hoops, Tan ankle boots, Bronze lip |
| thanksgiving | Thanksgiving | 2 | Afternoon into evening | Indoors, long sit-down meal | 6° out, cosy inside | 3 | – | Suede loafers, Knit scarf, Gold studs |
| garden | Botanical garden walk | 1 | Daytime | Outdoors, lots of walking | 17° overcast | 1.5 | – | White trainers, Woven tote, Sage scarf |
| night | Night out with the girls | 3 | Late evening | Bars, maybe dancing | 9° out | 1.5 | high | Heeled boots, Statement earrings, Cropped jacket |
| date | Date night | 3 | Evening | Dinner | 11° out | 2 | – | Fine gold chain, Block heels |
| interview | Interview | 3 | Morning | Office | 14° out | 2 | medium | Leather loafers, Structured bag |

Each preset also has a one-line `line` used in the reason copy (see source).

### Occasion parsing (prototype = keywords; production = LLM)
- Keyword lists are checked in this order: holiday → thanksgiving → night → date → garden → interview → dinner/lunch/brunch (falls back to thanksgiving).
- Unknown text becomes a `custom` occasion: the label is the user's text (capitalised, ≤32 chars), with code 2 (Smart).
- **Production recommendation:** send the free text to an LLM (e.g. the Claude API) and get structured JSON back: `{label, code, when, setting, indoor, warmth, contrastPref, finish[]}`. Get weather from a forecast API using the parsed date and location. Keep the presets as quick picks and as the offline fallback.

### Outfit scoring (`scoreLook`)
```
tone   = (MS[top]*.6 + MS[bottom]*.4) / 2          // MS: in 2, near 1, out 0
form   = 1 − |avg(f) − code| / 3
         − 0.5 if code ≥ 3 and max(f) < code        // dressy event needs at least one dressy piece
         − 0.3 if code ≤ 1 and min(f) > 2
warm   = 1 − |max(w) − preset.warmth| / 2
con    = high: min(1, ΔL/.35) · medium: 1 − |ΔL − .2|/.3 · default: 1 if .08<ΔL<.4 else .5
score  = .45·tone + .35·form + .15·warm + .05·con
```
Rank every top × bottom pair and show the top 5. ΔL is the OKLCH lightness difference. Contrast label: ΔL > .3 High, < .12 Low, otherwise Medium.

### Reason copy (`describe`)
- **Occasion:** `preset.line`, followed by:
  - code ≥ 3: "The {fabric+name} does the dressing up." if the dressier piece is formal enough; otherwise "Nothing you own is quite that dressy, so lift it with the accessories below."
  - code ≤ 1: "Nothing here needs fussing over."
  - otherwise: "Smart enough to sit down to, relaxed enough to stay in all day."
  - Don't repeat the fabric if the name already contains it.
- **Tone:** one of these cases, then the contrast sentence:
  - both in: "{A} and {b} both sit in your {Tone} palette."
  - one in, one near: "{A} is core {Tone}; {b} borrows from {neighbour} next door, so it still flatters."
  - one in, one out: "…sits outside it, so keep it under a layer / away from your face."
  - near only: "Close to {Tone} rather than in it. Add an in-tone accessory near your face."
  - neither: "Neither piece is in your tone. It works for the occasion, but it won't flatter you as much."
- **Weather:** "{weather}." followed by "Bring a warm layer." / "This runs warm, fine indoors." / "Right weight for it."

### Look title
`"{Top colourName} & {bottom colourName lower}"`, e.g. "Rust & slate".

---

## Image pipeline (production; the prototype only simulates it)
1. **Capture/upload:** camera via `<input type=file accept=image/* capture=environment>` (web) or the native camera.
2. **Garment segmentation / background removal:** server-side (e.g. SAM / rembg / a cloud vision API), or on-device. Output a transparent PNG cut-out.
3. **Category and attribute tagging:** a vision model returns `cat`, `kind`, `fabric`, `formality`, `warmth` and a colour name. The user can edit them on the Done screen.
4. **Dominant colour:** cluster the cut-out's opaque pixels (k-means, k=3) and take the largest cluster. The prototype averages the centre 20×20 px of a 48px downsample and skips near-white and near-black pixels (`sampleColor`).
5. **Tone placement:** use the TCI database lookup, or `classifyHex` as a fallback.
6. Store the item and render the cut-out with `.lighten` so dark backgrounds fall away.

## State
```ts
screen: 'outfit'|'wardrobe'|'add'|'looks'|'profile'|'occasion'|'match'|'item'|'quiz'|'tones'
from: previous screen (for back labels)
tone: number|null              // index into TONES; default Soft Autumn (configurable)
items: Item[]                  // wardrobe
topId, botId: string           // current outfit
saved: {id, topId, botId, occ}[]
filter: 'all'|'tone'|'tops'|'bottoms'
itemId: string|null
occText: string; occKey: preset key|'custom'; code: 1-4|null (override); lookI: number
qStep: 0-3; qh, qv, qc: number|null
add flow: step 'idle'|'scan'|'done', scanI, photo, newColor, newName, newCat
```
The prototype persists `tone`, `saved`, `topId` and `botId` to `localStorage` under `clothesline-app-v1`. Production needs a user account, a backend (items, photos in object storage, saved looks, wear history), and an "I wore this" action that increments `wears`.

## Motion
- **Strip select:** width/height/margin over 0.35s `cubic-bezier(.34,1.5,.5,1)`; opacity over 0.3s.
- **Bars and markers** (contrast, fit, profile sliders, wardrobe-fit flex): 0.4s.
- **Pop-in** (cards, results): `opacity 0→1, translateY 6px→0` over 0.35s ease.
- **Scan line:** keyframes moving `top` 6% → 92% → 6% over 1.8s, infinite.
- The Directions file also shows a livelier swing on wide lines: `rotate(o × −7°)` with `cubic-bezier(.34,1.7,.5,1)` over 0.7s.

## Design tokens (Nocturne; from `_ds/.../styles.css`)
- **Colours:**
  - bg `#161826` · surface `#232532` · text `#e9e9ed` · accent `#9184d9`
  - neutral 100–900: `#f3f5fe #e4e7f5 #cfd3e5 #b2b6ca #9397ab #75798c #595d6c #3f424d #292b31`
  - accent 100–900: `#f5f4ff #e7e5fe #d2cefd #b5abfc #968ae0 #796cbf #5d5294 #423a6a #2b2741`
- **Spacing:** `--space-1` 2.8 · `-2` 5.6 · `-3` 8.4 · `-4` 11.2 · `-6` 16.8 · `-8` 22.4 (px)
- **Radius:** sm 4 · md 8 · lg 14 · pills 999
- **Shadows:**
  - sm `0 0 0 1px #3f424d`
  - md `0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,.55)`
  - lg `0 0 0 1px #9397ab, 0 16px 40px rgba(0,0,0,.65)`
- **Type:** Inter (heading and body), headings at weight 500.
- **Components used:** `.btn` (`-primary` outlined, `-secondary`, `-ghost`, `-icon`, `-block`), `.tag` (`-accent`, `-neutral`, `-outline`), `.card`, `.field`, `.input`, `.lighten`.
- **Focus:** `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`.
- **Minimum tap target:** 44px.

## Assets
- **Icons:** simple stroke icons (24px viewBox, 1.6–1.8 stroke). Replace them with **Phosphor** equivalents per the design system: Sparkle, Shuffle, Heart, Camera, Image, Plus, CaretLeft/Right, Hanger, User, Wardrobe/Dresser, X.
- **Garment silhouettes:** placeholder SVG paths (`P` map). Replace them with real cut-outs.
- **Imagery:** none beyond user photos.

## Files
- `screenshots/` — 15 reference captures (top of each screen, 430px column): outfit, occasion, occasion with Holiday party, match result, wardrobe, wardrobe in-tone, item detail, add (idle / scanning / done), looks, profile, quiz question, quiz result, all tones. The HTML prototype is the source of truth for full-length screens.
- `Clothesline App.dc.html` — **the main working prototype.** All screens and logic (`TONES`, `SEED`, `PRESETS`, `KW`, `QUIZ`, `scoreLook`, `describe`, `classifyHex`, `sampleColor`) live in its `<script>` class.
- `Clothesline Directions.dc.html` — the design exploration canvas:
  - Turn 1: three directions (1a Spotlight, 1b Ledger, 1c Tone wheel). Ledger was chosen, with 1a's glow and callouts for Match.
  - Turn 2: Ledger across the app (2a–2e).
  - Turn 3: occasion flow (3a input, 3b Holiday party, 3c Botanical garden).
- `_ds/nocturne-…/styles.css` and `readme.md` — the design system tokens, components and rules.
- `support.js` — prototype runtime only; not part of the build.

## Open items / out of scope in the prototype
- Real background removal, attribute tagging and TCI database lookup.
- Live weather and location; LLM occasion parsing.
- Extra lines: outerwear, shoes, accessories (the strips generalise to N categories).
- A calendar for planning looks to dates, "I wore this" tracking, and wear-frequency insights.
- Accounts, sync and sharing.
- TCI licensing and branding approval before using the TCI name or palettes commercially.
