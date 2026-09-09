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
    OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free

The route `app/src/app/api/chat/route.ts` calls OpenRouter server-side (the key
never reaches the browser) and sends only the `meta` block and the precomputed
KPI summary, never the customer data. Without the key the panel shows a notice
and the rest of the dashboard is unaffected.

The assistant is scoped to this dashboard only. Anything off-topic (general
knowledge, coding, questions about the model itself, writing tasks, investment
advice) gets a fixed refusal: _"Sorry, I can only answer questions about this
dashboard..."_. The scope rules and refusal string live in
`app/src/lib/chat-context.ts`.

To check it, with the dev server running:

    npm run chat:eval        # fires in-scope + out-of-scope questions, prints pass/fail

The free OpenRouter model is rate-limited; running the eval a few times in a row
returns HTTP 429, which the script reports as `SKIP` (not a failure). Wait a
minute and rerun, or add a small credit balance to the OpenRouter account to
raise the limit.

## Layout

- `analytics/` - Python data generator (stdlib only, `uv`)
- `app/` - Next.js 16 dashboard (client-rendered, recharts + shadcn/ui + Tailwind)
- `PLAN.md` - phase plan and success criteria
- `AGENTS.md` - the MVP specification

The dashboard is a single page: headline KPIs, channel breakdown, marketing
engagement, LTV segments, cohort & frequency, and an assumptions panel. One
segment toggle (All / B2C / B2P) and one year selector (2024-2026, default 2026)
recompute every view in the browser.
