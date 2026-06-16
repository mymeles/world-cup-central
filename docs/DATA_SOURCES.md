# External Data — what we consume & from where

The app is built against a **server-side provider gateway** (`app/api/data+api.ts`).
It uses ESPN's public World Cup scoreboard as a no-key fixture/status/score
fallback, and it never generates fake live scores or final results. With
`SPORTS_API_KEY`, it also calls API-Football from the server and lets that
keyed provider override matching ESPN/seed fixtures.

## 1. Live football data (fixtures, scores, standings, lineups, events)

| Provider | What you get | Notes / Pricing shape |
|---|---|---|
| **ESPN scoreboard** | Public World Cup fixtures, live/final status, scores, venue | No key; useful fallback for MVP live/past results. Coverage and terms should be reviewed before production scale. **Current fallback.** |
| **API-Football** (api-sports.io) | Fixtures, live scores & events, lineups, standings, players, stats | Best price/coverage for an indie launch. Free tier to start, paid by request volume. **Current default.** |
| **Sportradar** | Official, low-latency live data, deep stats | Enterprise pricing/contracts. Best for scale once monetizing. |
| **Opta / Stats Perform** | Gold-standard advanced metrics (xG, event-level) | Enterprise. |
| **football-data.org** | Competitions, fixtures, standings | Generous free tier; lighter live coverage — good for MVP. |
| **Entain / The Odds API** | Betting odds (for odds display / affiliate) | Optional, useful for monetization. |

**What we map into our types:** `Match` (kickoff, status, score, minute, venue),
`Team` (rank, group, confederation), `StandingRow`, `Scorer`, plus future
lineups/events.

## 2. Reference & metadata
- **FIFA / official 2026 site** — schedule, venues, group draw, kickoff times.
- **FIFA World Ranking** — feeds team `rank` and seeds the power `rating`.
- **Country flags** — currently emoji; can swap to flag CDN (e.g. flagcdn.com) or bundled SVGs.
- **Venues / stadiums** — 16 host stadiums (already seeded in `data/worldcup.ts`).
- **Player photos / crests** — provider media endpoints or Wikimedia (mind licensing).

## 3. AI / LLM
- **Google Gemini** — the AI tab uses `@ai-sdk/google` with `GOOGLE_GENERATIVE_AI_API_KEY` and defaults to `gemini-2.5-flash`.
- The AI is **grounded**: we inject the app data snapshot (`lib/insights.ts → buildContext`) so answers match what the app shows.

## 4. Our own derived data (no external dependency)
- **Power ratings** → Elo-style ratings per team (`data/worldcup.ts`).
- **Predictions** → independent-Poisson model (`lib/predict.ts`).
- **Title odds** → Monte-Carlo tournament simulation (`lib/simulate.ts`).
- **Standings** → computed from results (`computeStandings`).

## 5. Platform services (for production)
- **Push**: Expo Push Notifications (native) / web push.
- **Auth & accounts**: Clerk or Supabase (favourites, predictions, subscriptions).
- **Payments**: RevenueCat (iOS/Android IAP) + Stripe (web).
- **Analytics**: PostHog / Vercel Analytics.

## How to go live (checklist)
1. Keep the seed data as schedule-only fallback, never as a source of final scores.
2. Use the built-in ESPN scoreboard fallback for no-key live/past scores during development.
3. Create an API-Football key when you need a stronger provider.
4. Put the key in `.env` as `SPORTS_API_KEY`.
5. Keep `SPORTS_API_PROVIDER=api-football`.
6. Set `SPORTS_API_FOOTBALL_LEAGUE` and `SPORTS_API_FOOTBALL_SEASON` for the competition when confirmed by the provider.
7. Add `GOOGLE_GENERATIVE_AI_API_KEY` to enable the full conversational AI.
