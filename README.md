# Clothesline

A virtual wardrobe that matches outfits to your colour tone. Photograph your clothes, hang them on two clotheslines (tops and bottoms), and flip through them to build outfits. Every piece is placed in one of the **TCI 12 Tones** and scored against yours. **Match me** recommends outfits for an occasion you type or pick.

Mobile-first web app built with React, TypeScript and Vite, styled with the Nocturne design system.

## Getting started

```sh
npm install
cp .env.example .env.local   # add your API keys (optional, see below)
npm run dev                  # http://localhost:5173
```

The dev server also serves the API routes in `server/`, so photo capture works locally. Without keys the app still runs: new pieces fall back to a drawn silhouette, and you fill in the details yourself.

| Variable | Used for |
|---|---|
| `BG_REMOVAL_API_KEY` | Background removal ([remove.bg](https://www.remove.bg/api)) |
| `ANTHROPIC_API_KEY` | Garment tagging with Claude |
| `TAG_MODEL` | Optional tagging-model override (default `claude-haiku-5-5`) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Sign-in and sync. Public values, baked into the client at build time and read by the server to verify sign-ins |
| `PHOTO_LIMIT_PER_HOUR`, `PHOTO_LIMIT_PER_DAY` | Optional spend guard on photo processing (defaults 30 per client per hour, 300 per day overall) |

### Deploying

The app deploys to [Railway](https://railway.com) as a single Node service. Railway runs `npm run build`, then `npm start` (see `railway.json`), and checks `/healthz`. Set the variables above on the service, and every push to the connected branch redeploys.

The server (`server/index.ts`) is plain `node:http`, run directly by Node's built-in TypeScript support (Node ≥ 22.18). It serves the built app with long-lived caching for fingerprinted assets, plus the `/api/*` routes.

GitHub Actions (`.github/workflows/ci.yml`) runs lint, tests and the build on every PR.

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck and build to `dist/` |
| `npm start` | Run the production server (serves `dist/` and the API) |
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

On a device's first launch, a **Welcome** screen draws a clothesline, pegs three pieces to it, and offers sign-in or "Continue without an account". It doesn't come back after that, and opening a sign-in link skips it.

Pushed screens: **Occasion** → **Match** (Match me results), **Item** detail → **Edit** (details, or retake the photo), the 3-question **Quiz** to find your tone, and **All 12 tones**.

The app starts empty: there's no demo wardrobe.

## Project layout

```
server/          Node server: static app + /api/process-photo (background removal + tagging)
src/
  domain/        Pure, unit-tested logic: tones, colour (OKLCH/OKLab), image
                 pixels, occasions, outfit scoring and reason copy, quiz
  state/         App state (React context), localStorage + IndexedDB photos,
                 Supabase sign-in and sync
  components/    Garment rendering, clothesline, tab bar, back row
  screens/       One component per screen
  styles/        nocturne.css (design-system tokens) + app.css
design/handoff/  The original design handoff: spec, prototype, screenshots
```

The design spec is `design/handoff/README.md`. To open the HTML prototype, serve that folder (`npx serve design/handoff`) and open `Clothesline App.dc.html`.

## Photo capture

Pieces are photographed **laid flat on a plain, light surface**. The app shows your real garment, cut out, never a generated mock-up, because tone matching depends on true colour.

1. **Check** (browser): downscale to 1024px; warn on blur, darkness or glare, and let the user retake or carry on.
2. **Cut out and tag** (`POST /api/process-photo`, `server/`): remove.bg removes the background while Claude tags the piece (category, type, fabric, formality, warmth, colour name). The two calls run in parallel, and either can fail on its own.
3. **Read the colour** (browser, `src/domain/pixels.ts`): keep the largest piece of the mask, and use the surface as a grey card to correct the lighting when it's near-neutral. Then run k-means in OKLab on the garment pixels, flagging two-colour patterns.
4. **Place it in a tone** with `classifyHex`, then straighten small tilts, crop, and save a transparent WebP.

Cut-outs and original photos are stored in IndexedDB; the rest of the state is in `localStorage`. If processing fails, the piece is drawn as a silhouette and the original photo is kept, so it can be reprocessed later.

## Accounts and sync

Sign-in is passwordless: Supabase emails a magic link. Signed out, the app works on this device only; adding pieces needs an account, because each photo costs a remove.bg credit and a Claude call.

- **Data:** `profiles` (tone, your colours, saved looks, wear log, outfit) and `items` (one row per piece), with row-level security so each user reaches only their own rows. Photos live in a private `photos` bucket, one folder per user.
- **Sync** (`src/domain/sync.ts`, `src/state/useCloudSync.ts`): each piece syncs on its own, and the newest change wins. Deletions travel as tombstones so other devices learn about them. The profile is one record where the newest change wins. There's a full merge on sign-in and when the app comes back into view, and local edits are pushed about 1.5 seconds after they happen. The first sign-in uploads whatever was already on the device.
- **Signing out** sends anything pending, then clears the device. It refuses if something couldn't sync.
- **Server:** `/api/process-photo` requires a valid Supabase access token (checked with `getClaims`), and its limit counts per account.

Supabase setup (once): under Authentication → URL Configuration, set the Site URL to the deployed URL and add `http://localhost:5173/**` to Redirect URLs. The built-in email sender only delivers to the project's team members, a few emails an hour; configure custom SMTP (for example Resend) before inviting other people.

## What's real and what's simulated

- **Occasions:** they're parsed by keyword. Weather is fixed placeholder text.
- **Tone palettes:** they're placeholders. Commercial use needs TCI's licensed tone data and branding approval.
- **Photo limits:** an in-memory limit caps processing at 30 photos per account per hour and 300 per day overall. It resets on redeploy.

## Next steps

- LLM occasion parsing, e.g. the Claude API returning `{label, code, when, setting, warmth, contrastPref, finish[]}`, plus a forecast API for weather
- More lines: outerwear, shoes, accessories
- PWA offline support (service worker); the web manifest is already in place
