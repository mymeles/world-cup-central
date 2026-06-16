# ⚽️ World Cup Central

The ultimate 2026 FIFA World Cup companion — live scores, schedules, standings,
AI-powered predictions, deep stats, and a built-in AI analyst you can chat with
about any team, player or match.

**One codebase → iOS, Android, and Web** (Expo + React Native + Expo Router).

## Quick start

> **Node version:** use Node 20–24 LTS (an `.nvmrc` pins **22**). Run `nvm use`
> first. Node 25+ is not yet supported by Metro and the bundler will crash.

```bash
nvm use            # → Node 22 (see .nvmrc)
npm install
npm run web        # open in the browser
# or
npm run ios        # iOS simulator (needs Xcode)
npm run android    # Android emulator (needs Android Studio)
```

The app runs with **no accounts or API keys** using schedule-only seed fixtures,
ESPN scoreboard fallback data for live/final match status, and a rule-based AI
fallback. It does not generate fake final scores.

To enable the full conversational AI, copy `.env.example` → `.env` and set
`GOOGLE_GENERATIVE_AI_API_KEY` (Google Gemini). `GEMINI_MODEL` defaults to
`gemini-2.5-flash`.

## What's inside

| Tab | What it does |
|---|---|
| **Matches** | Fixtures by day, live provider polling, filters, match detail |
| **Groups** | All 12 groups, standings from provider/fallback data |
| **Predict** | Monte-Carlo title odds + per-match win probabilities |
| **Stats** | Tournament aggregates, scorer feed placeholder, power rankings |
| **AI** | Chat analyst grounded in app data |

## How the predictions work (they're real)

Team power ratings → expected goals (log-linear link) → **independent-Poisson**
scoreline distribution → win/draw/loss probabilities + most-likely score
(`lib/predict.ts`). Title odds come from **1,000 full-tournament Monte-Carlo
simulations** (`lib/simulate.ts`). The model is transparent, not a black box.

## Going live with real data

[`app/api/data+api.ts`](app/api/data+api.ts) uses ESPN's public World Cup
scoreboard as a no-key fallback. Set a server-side `SPORTS_API_KEY` when you
want API-Football to override that fallback with a stronger keyed provider.
See [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## Docs
- [Feature list](docs/FEATURES.md)
- [External data sources](docs/DATA_SOURCES.md)
- [Build plan & roadmap](docs/PLAN.md)

## Deploy
- **Web** → Vercel (`npm run build:web`, output is a server build).
- **Native** → EAS Build → App Store / Play Store.

> Team groupings, ratings and fixtures in `data/worldcup.ts` are schedule-only
> fallback data. Live/final scores must come from ESPN or a configured sports
> provider.
