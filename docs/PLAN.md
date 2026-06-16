# Build Plan — World Cup Central

## Product vision
The single best place to follow the 2026 World Cup: live scores, schedules,
standings, deep + customizable forecasts, historical & current stats, and an AI
analyst you can chat with about any team, player or match. Beautiful, fast, and
identical across iOS, Android and web. Built to monetize once polished.

## Architecture (why this stack)
- **Expo + React Native + Expo Router (TypeScript)** — ONE codebase compiles to
  native iOS, native Android, and a real web app. This is the core requirement
  ("drastically cross-compile"). Web deploys to Vercel; native ships via EAS.
- **Expo Router API routes** — server endpoints (the AI chat) colocated with the app.
- **React Query** — caching/loading/refetch over a swappable data provider.
- **Server data gateway** (`app/api/data+api.ts`) — sports keys stay server-side; live provider data overrides schedule-only seed fixtures.
- **Own model layer** (`lib/predict.ts`, `lib/simulate.ts`) — real, transparent stats.
- **Google Gemini** — Gemini-powered analyst, grounded in app data.

```
app/(tabs)/        Matches · Groups · Predict · Stats · AI
app/match/[id]     Match detail + prediction
app/api/chat       AI endpoint (server)
components/         Design-system + feature components
constants/theme    Single source of design truth
data/              Schedule-only fallback dataset
lib/               predict · simulate · insights · dataProvider · hooks · format
types/             Domain model
docs/              FEATURES · DATA_SOURCES · PLAN
```

## Phased roadmap

### Phase 0 — Foundation ✅ (this build)
Universal app shell, design system, navigation, schedule-only fallback data, all five core screens,
prediction engine, Monte-Carlo title odds, grounded AI chat with offline fallback.

### Phase 1 — Real data (1–2 weeks)
- Finish API-Football competition mapping and add real standings, scorers, lineups.
- Live polling for in-play matches from the server gateway.
- Team & player profile pages; knockout bracket view.

### Phase 2 — Engagement (2–3 weeks)
- Auth + favourite teams + personalized home feed.
- Push notifications (kickoff / goals / FT).
- Streaming AI with tool-calling (model queries live data itself); match recaps & daily briefing.

### Phase 3 — Customizable forecasts & social (2–3 weeks)
- User-tunable model (home advantage, form weighting, injuries).
- Bracket challenge + prediction leaderboards.
- Calibration tracking (model accuracy vs reality).

### Phase 4 — Monetize & ship (2 weeks)
- Subscription tier (advanced AI + stats), RevenueCat + Stripe.
- App Store / Play Store submission via EAS; web on Vercel.
- Analytics, A/B, performance & accessibility passes.

## Definition of done for v0 (met)
- Runs on web today; native-ready (`expo start`).
- No external accounts required to demo.
- Real (not fake) predictions and a working, grounded AI chat.

## Risks / decisions
- **Data licensing/cost** is the main external dependency — pick provider early.
- **AI cost** scales with usage → caching + rule-based fallback mitigate.
- 2026 squads/groups finalize over time → seed data is clearly marked illustrative.
