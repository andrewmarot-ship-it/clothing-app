# Clothesline

A virtual wardrobe that matches outfits to your colour tone. Photograph your clothes, hang them on two clotheslines (tops and bottoms), and flip through them to build outfits. Every piece is placed in one of the **TCI 12 Tones** and scored against yours. **Match me** recommends outfits for an occasion you type or pick.

Mobile-first web app built with React, TypeScript and Vite, styled with the Nocturne design system.

## Getting started

```sh
npm install
cp .env.example .env.local   # add your API keys (optional, see below)
npm run dev                  # http://localhost:5173
```

The dev server also serves the `api/` functions, so photo capture works locally. Without keys the app still runs: new pieces fall back to a drawn silhouette, and you fill in the details yourself.

| Variable | Used for |
|---|---|
| `BG_REMOVAL_API_KEY` | Background removal ([remove.bg](https://www.remove.bg/api)) |
| `ANTHROPIC_API_KEY` | Garment tagging with Claude |
| `TAG_MODEL` | Optional tagging-model override (default `claude-haiku-5-5`) |

### Deploying

1. In [Vercel](https://vercel.com/new), import `andrewmarot-ship-it/clothing-app`. It detects Vite: no build settings to change.
2. Add the variables above under Project → Settings → Environment Variables.
3. Every PR then gets a preview link, and `main` deploys to production.

GitHub Actions (`.github/workflows/ci.yml`) runs lint, tests and the build on every PR.

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run the domain unit tests (Vitest) |
| `npm run lint` | Lint with oxlint |

## Screens

| Tab | Screen |
|---|---|
| **Outfit** (home) | A first-run checklist (find your tone, add a top, add a bottom), then two clotheslines, a fitting panel with contrast and tone-fit meters, Shuffle, Save look and "I wore this today" |
| **Wardrobe** | Every piece, filterable by tops, bottoms or "in my tone" |
| **Add** | Take or upload a photo; the app reads its colour, places it in a tone and hangs it on the line |
| **Looks** | Saved outfits |
| **Profile** | Your tone, its palette, how much of your wardrobe fits it, and your most-worn and waiting-to-be-worn pieces |

Pushed screens: **Occasion** → **Match** (Match me results), **Item** detail → **Edit** (details, or retake the photo), the 3-question **Quiz** to find your tone, and **All 12 tones**.

The app starts empty: there's no demo wardrobe.

## Project layout

```
api/             Vercel functions: process-photo (background removal + tagging)
src/
  domain/        Pure, unit-tested logic: tones, colour (OKLCH/OKLab), image
                 pixels, occasions, outfit scoring and reason copy, quiz
  state/         App state (React context), localStorage + IndexedDB photos
  components/    Garment rendering, clothesline, tab bar, back row
  screens/       One component per screen
  styles/        nocturne.css (design-system tokens) + app.css
design/handoff/  The original design handoff: spec, prototype, screenshots
```

The design spec is `design/handoff/README.md`. To open the HTML prototype, serve that folder (`npx serve design/handoff`) and open `Clothesline App.dc.html`.

## Photo capture

Pieces are photographed **laid flat on a plain, light surface**. The app shows your real garment, cut out, never a generated mock-up, because tone matching depends on true colour.

1. **Check** (browser): downscale to 1024px; warn on blur, darkness or glare, and let the user retake or carry on.
2. **Cut out and tag** (`api/process-photo`): remove.bg removes the background while Claude tags the piece (category, type, fabric, formality, warmth, colour name). The two calls run in parallel, and either can fail on its own.
3. **Read the colour** (browser, `src/domain/pixels.ts`): keep the largest piece of the mask, and use the surface as a grey card to correct the lighting when it's near-neutral. Then run k-means in OKLab on the garment pixels, flagging two-colour patterns.
4. **Place it in a tone** with `classifyHex`, then straighten small tilts, crop, and save a transparent WebP.

Cut-outs and original photos are stored in IndexedDB; the rest of the state is in `localStorage`. If processing fails, the piece is drawn as a silhouette and the original photo is kept, so it can be reprocessed later.

## What's real and what's simulated

- **Storage:** everything lives in this browser. There are no accounts yet.
- **Occasions:** they're parsed by keyword. Weather is fixed placeholder text.
- **Tone palettes:** they're placeholders. Commercial use needs TCI's licensed tone data and branding approval.
- **`/api/process-photo` is unauthenticated:** anyone who finds it can spend your API credits. Put it behind sign-in before sharing a deployment.

## Next steps

- LLM occasion parsing, e.g. the Claude API returning `{label, code, when, setting, warmth, contrastPref, finish[]}`, plus a forecast API for weather
- Accounts and a backend: items, photos in object storage, saved looks, wear history ("I wore this")
- More lines: outerwear, shoes, accessories
- PWA offline support (service worker); the web manifest is already in place
