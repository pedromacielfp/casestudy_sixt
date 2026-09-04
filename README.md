# Sixt CRM Dashboard

MVP dashboard prototype tracking one-time to repeat customer conversion for Sixt
US leisure rentals. Mock data only.

## Generate the data

Requires [uv](https://docs.astral.sh/uv/). From `analytics/`:

    uv run python generate.py

Writes `analytics/output/crm.json` and `app/public/data/crm.json` (the app reads
the latter). The script self-checks every business rule with assertions.

## Run the app

Requires Node 20+. From `app/`:

    npm install
    npm run dev        # http://localhost:3000

`npm run build` for a production build.

## Chat assistant

Optional. Needs an [OpenRouter](https://openrouter.ai) key in `app/.env.local`:

    OPENROUTER_API_KEY=sk-or-...
    OPENROUTER_MODEL=minimax/minimax-m3:free

The route `app/src/app/api/chat/route.ts` calls OpenRouter server-side (the key
never reaches the browser) and sends only the `meta` block and the precomputed
KPI summary, never the customer data. Without the key the panel shows a notice
and the rest of the dashboard is unaffected.

## Layout

- `analytics/` - Python data generator (stdlib only, `uv`)
- `app/` - Next.js 16 dashboard (client-rendered, recharts + shadcn/ui + Tailwind)
- `PLAN.md` - phase plan and success criteria
- `AGENTS.md` - the MVP specification

The dashboard is a single page: headline KPIs, channel breakdown, marketing
engagement, LTV segments, cohort & frequency, and an assumptions panel. One
segment toggle (All / B2C / B2P) and one year selector (2024-2026, default 2026)
recompute every view in the browser.
