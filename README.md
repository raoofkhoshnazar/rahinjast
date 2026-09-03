# RahInjast

RahInjast is a Next.js MVP that collects a user's profile and recommends the strongest German immigration pathway based on a structured rules dataset derived from the supplied Germany visa guide.

- **GitHub:** https://github.com/raoofkhoshnazar/rahinjast
- **Live site:** https://raoofkhoshnazar.github.io/rahinjast/

## What it does

- Guides the user through a four-step profile form
- Saves in-progress answers in localStorage
- Evaluates Germany visa paths with a reusable recommendation engine
- Ranks the best-fit options and explains blockers, missing thresholds, and PR outlook

## Included Germany pathways

- EU Blue Card
- Skilled Worker Visa (Academic)
- Skilled Worker Visa (Vocational)
- Opportunity Card (Chancenkarte)
- Job Seeker Visa
- Ausbildung Visa
- Student Visa
- Studienkolleg Visa
- Language Course Visa
- Freelancer / Self-Employment Visa
- Family Reunification Visa
- Permanent Residence outlook

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4

## Project structure

- `src/components/rahinjast-app.tsx` – main client UI and multi-step flow
- `src/lib/visa/types.ts` – reusable recommendation engine types
- `src/lib/visa/engine.ts` – generic ranking helpers and thresholds context
- `src/lib/visa/countries/germany.ts` – Germany-specific visa definitions and evaluation logic
- `src/types/profile.ts` – typed user profile model

The matching engine is structured so future countries can add their own visa config module without rewriting the intake or ranking primitives.

## Local development

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 43123
```

Then open `http://127.0.0.1:43123`.

## Validation notes

This MVP is rules-driven from the provided guide, but German thresholds change over time. Update the numbers in `src/lib/visa/engine.ts` and `src/lib/visa/countries/germany.ts` when annual government thresholds change.
