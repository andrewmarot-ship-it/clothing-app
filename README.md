# Clothesline

A virtual wardrobe that matches outfits to your colour tone. Photograph your clothes, hang them on two clotheslines (tops and bottoms), and flip through them to build outfits. Every piece is placed in one of the **TCI 12 Tones** and scored against yours. **Match me** recommends outfits for an occasion you type or pick.

Mobile-first web app built with React, TypeScript and Vite, styled with the Nocturne design system.

## Getting started

```sh
npm install
npm run dev        # http://localhost:5173
```

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
| **Outfit** (home) | Two clotheslines, a fitting panel with contrast and tone-fit meters, Shuffle and Save look |
| **Wardrobe** | Every piece, filterable by tops, bottoms or "in my tone" |
| **Add** | Take or upload a photo; the app reads its colour, places it in a tone and hangs it on the line |
| **Looks** | Saved outfits |
| **Profile** | Your tone, its palette, and how much of your wardrobe fits it |

Pushed screens: **Occasion** → **Match** (Match me results), **Item** detail, the 3-question **Quiz** to find your tone, and **All 12 tones**.

## Project layout

```
src/
  domain/        Pure, unit-tested logic: tones, colour (OKLCH), occasions,
                 outfit scoring and reason copy, quiz, seed wardrobe
  state/         App state (React context) with localStorage persistence
  components/    Garment rendering, clothesline, tab bar, back row
  screens/       One component per screen
  styles/        nocturne.css (design-system tokens) + app.css
design/handoff/  The original design handoff: spec, prototype, screenshots
```

The design spec is `design/handoff/README.md`. To open the HTML prototype, serve that folder (`npx serve design/handoff`) and open `Clothesline App.dc.html`.

## What's real and what's simulated

Like the prototype, this build keeps everything in the browser:

- **Storage:** your tone, wardrobe (including photos, downscaled), outfit and saved looks are kept in `localStorage`.
- **Photo scan:** it reads the dominant colour from the centre of the photo and classifies it into a tone with an OKLCH fallback classifier. Background removal and attribute tagging are simulated. New pieces default to cotton, casual, light.
- **Occasions:** they're parsed by keyword. Weather is fixed placeholder text.
- **Tone palettes:** they're placeholders. Commercial use needs TCI's licensed tone data and branding approval.

## Next steps

- Server-side garment segmentation (cut-outs) and vision tagging (category, kind, fabric, formality, warmth)
- LLM occasion parsing, e.g. the Claude API returning `{label, code, when, setting, warmth, contrastPref, finish[]}`, plus a forecast API for weather
- Accounts and a backend: items, photos in object storage, saved looks, wear history ("I wore this")
- More lines: outerwear, shoes, accessories
- PWA offline support (service worker); the web manifest is already in place
