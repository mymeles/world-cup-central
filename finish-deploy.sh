#!/usr/bin/env bash
#
# finish-deploy.sh — one-time finisher for the World Cup Central deployment.
#
# Does the two steps the assistant isn't allowed to do for you:
#   1. Sets the backend secrets on Render (SUPABASE_ANON_KEY, GOOGLE_GENERATIVE_AI_API_KEY)
#      and triggers a redeploy.
#   2. Disables Vercel Deployment Protection so the site is publicly reachable.
#
# Tokens are read from your local Render/Vercel CLI configs; secret values are read
# from ./server/.env. Nothing is printed or sent anywhere except Render & Vercel.
#
# Run from the repo root:   bash finish-deploy.sh
#
set -euo pipefail

RENDER_SERVICE_ID="srv-d8oscfrsq97s73fdtic0"
VERCEL_PROJECT_ID="prj_tfc4IBE7oQbayVyB4zZ82kmUNeyq"
VERCEL_TEAM_ID="team_Va39LBIglFdrA2KcnIgmnWMz"
RENDER_CLI_CFG="$HOME/.render/cli.yaml"
VERCEL_CLI_CFG="$HOME/Library/Application Support/com.vercel.cli/auth.json"
ENV_FILE="server/.env"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
die()  { printf "  \033[31m✗ %s\033[0m\n" "$1"; exit 1; }

[ -f "$ENV_FILE" ] || die "Run this from the repo root ($ENV_FILE not found)."

# --- tokens (never printed) ---
RENDER_TOKEN=$(python3 -c "import yaml;print(yaml.safe_load(open('$RENDER_CLI_CFG'))['api']['key'])" 2>/dev/null) \
  || die "Couldn't read Render token. Run 'render login' first."
VERCEL_TOKEN=$(python3 -c "import json;print(json.load(open('$VERCEL_CLI_CFG'))['token'])" 2>/dev/null) \
  || die "Couldn't read Vercel token. Run 'vercel login' first."

# --- secret values from server/.env (never printed) ---
read_env() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"; }
SUPABASE_ANON_KEY=$(read_env SUPABASE_ANON_KEY)
GEMINI_KEY=$(read_env GOOGLE_GENERATIVE_AI_API_KEY)
[ -n "$SUPABASE_ANON_KEY" ] || die "SUPABASE_ANON_KEY is empty in $ENV_FILE"
[ -n "$GEMINI_KEY" ]        || die "GOOGLE_GENERATIVE_AI_API_KEY is empty in $ENV_FILE"

# ---------------------------------------------------------------------------
bold "1) Setting backend secrets on Render"
set_render_env() {
  local key="$1" val="$2"
  local body; body=$(python3 -c "import json,sys;print(json.dumps({'value':sys.argv[1]}))" "$val")
  local code; code=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
    -H "Authorization: Bearer $RENDER_TOKEN" -H "Content-Type: application/json" \
    -d "$body" "https://api.render.com/v1/services/$RENDER_SERVICE_ID/env-vars/$key")
  case "$code" in 200|201) ok "$key set ($code)";; *) die "$key failed (HTTP $code)";; esac
}
set_render_env "SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
set_render_env "GOOGLE_GENERATIVE_AI_API_KEY" "$GEMINI_KEY"

bold "   Triggering Render redeploy"
DEP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $RENDER_TOKEN" -H "Content-Type: application/json" \
  -d '{"clearCache":"do_not_clear"}' "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys")
case "$DEP_CODE" in 200|201|202) ok "redeploy queued ($DEP_CODE)";; *) die "deploy trigger failed (HTTP $DEP_CODE)";; esac

# ---------------------------------------------------------------------------
bold "2) Disabling Vercel Deployment Protection (making the site public)"
V_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  -d '{"ssoProtection":null}' \
  "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID?teamId=$VERCEL_TEAM_ID")
case "$V_CODE" in 200) ok "Vercel Authentication disabled (200)";; *) die "Vercel update failed (HTTP $V_CODE)";; esac

# ---------------------------------------------------------------------------
bold "3) Quick verification"
printf "  frontend  "; curl -s -m 25 -o /dev/null -w "HTTP %{http_code}\n" "https://world-cup-central-three.vercel.app/"
printf "  backend   "; curl -s -m 60 -o /dev/null -w "HTTP %{http_code} (health)\n" "https://worldcup-backend-hy35.onrender.com/health"

echo ""
ok "Done. The Render redeploy takes ~1-2 min; after it finishes, /api/matches serves live data."
echo "  Frontend: https://world-cup-central-three.vercel.app"
echo "  Backend : https://worldcup-backend-hy35.onrender.com"
