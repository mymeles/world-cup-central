# Feature List — World Cup Central

Legend: ✅ built in this v0 · 🟡 partially scaffolded · ⬜ planned

## 1. Matches & Schedule
- ✅ Full fixture list grouped by day (Today / Tomorrow / dates)
- ✅ Filters: All · Live · Today · Upcoming · Results
- 🟡 Live match tracking (ESPN no-key fallback; API-Football override with `SPORTS_API_KEY`)
- ✅ Match detail screen (scoreline, venue, stage, kickoff)
- ⬜ Lineups, formations, live commentary & event timeline (goals, cards, subs)
- ⬜ Push notifications for kickoff, goals, full-time (per-team subscriptions)
- ⬜ Add-to-calendar / reminders

## 2. Teams & Groups
- ✅ 48 teams across 12 groups (A–L) with flags, FIFA rank, confederation
- ✅ Live-updating group standings (P/W/D/L/GD/Pts) with qualification highlighting
- ✅ Best-third-place race indicator
- ⬜ Team profile pages (squad, fixtures, form guide, history)
- ⬜ Player profiles & per-player stats
- ⬜ Knockout bracket view with projected paths

## 3. Forecasts & Predictions (customizable)
- ✅ Per-match win/draw/loss probabilities (independent-Poisson model)
- ✅ Expected goals (xG) and most-likely scoreline per match
- ✅ Monte-Carlo title odds (1,000 full-tournament simulations)
- ✅ Power rankings driving the model (transparent)
- 🟡 Customizable forecasts — model parameters are centralized in `lib/predict.ts`; UI controls to tweak home-advantage / form weighting are planned
- ⬜ User predictions / bracket challenge + leaderboards (monetizable)
- ⬜ Confidence intervals & calibration tracking vs actual results

## 4. Stats (previous & current)
- 🟡 Tournament aggregates (real match totals use ESPN/API-Football provider data)
- 🟡 Golden Boot race (real scorer feed pending provider mapping)
- ✅ Power rankings
- ⬜ Historical World Cup data (past winners, records, H2H archives)
- ⬜ Advanced team/player stats (possession, xG timelines, heatmaps)

## 5. AI (built-in)
- ✅ Conversational AI analyst chat ("everything World Cup")
- 🟡 Answers grounded in app data; live grounding uses ESPN/API-Football provider data
- ✅ Works with zero keys via a rule-based fallback; full LLM with a key
- ✅ Suggested prompts; per-match "Ask the AI" deep link
- ⬜ Streaming responses & tool-calling (let the model query live data directly)
- ⬜ Proactive insights ("3 upsets brewing today"), match recaps, daily briefing
- ⬜ Voice input

## 6. UX & Platform
- ✅ Dark, sports-broadcast design system (single source of truth in `constants/theme.ts`)
- ✅ Universal: one codebase → iOS, Android, Web (Expo Router)
- ✅ Tab navigation (Matches / Groups / Predict / Stats / AI)
- ✅ React Query data layer with a swappable provider seam
- ⬜ Light theme, localization (multi-language), accessibility pass
- ⬜ Onboarding, favourite-team personalization, home feed
- ⬜ Offline caching, skeleton loaders, haptics polish

## 7. Monetization (post-development)
- ⬜ Subscription tier (advanced AI, deeper stats, ad-free)
- ⬜ Bracket/prediction contests with prizes
- ⬜ Sponsored content slots, affiliate odds links
- ⬜ Analytics + paywall (RevenueCat for native, Stripe for web)
