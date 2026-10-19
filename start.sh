#!/usr/bin/env bash
# MindBridge lab launcher. Learner runs:  bash /app/lab/start.sh
# Installs dependencies, builds the app, starts the server, opens Chrome.
set -euo pipefail

# Run correctly no matter where it's called from.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

LAB_ID="lc4_project"
PORT="${PORT:-3000}"
APP="apps/mindbridge"
URL="http://localhost:$PORT"
export LAB_ID PORT

# Colour only on a real terminal so redirected logs stay clean.
if [ -t 1 ]; then
  CH=$'\033[1;36m'; CO=$'\033[1;32m'; CE=$'\033[1;31m'; CR=$'\033[0m'
else
  CH=''; CO=''; CE=''; CR=''
fi
say()  { printf '\n%s%s%s\n' "$CH" "$*" "$CR"; }
info() { printf '   %s\n' "$*"; }
ok()   { printf '   %s[OK]%s %s\n' "$CO" "$CR" "$*"; }

say "MindBridge Lab — preparing your environment"
info "Lab: $LAB_ID"
info "Please keep this window open. The first run can take a few minutes."

# ---- 1/4 Dependencies -------------------------------------------------------
say "[1/4] Checking dependencies"
if [ -d node_modules ]; then
  ok "Already installed — skipping."
else
  info "Installing dependencies (first run only). npm output will scroll below..."
  npm install
  ok "Dependencies installed."
fi

# ---- 2/4 Build --------------------------------------------------------------
say "[2/4] Building the application"
if [ -f "$APP/backend/dist/server.js" ] && [ -d "$APP/frontend/dist" ]; then
  ok "Already built — skipping."
else
  info "Compiling the backend and frontend. Please wait..."
  npm run build --workspaces --if-present
  ok "Build complete."
fi

# ---- 3/4 Server (creates + seeds the database on first start) ---------------
say "[3/4] Starting the server"
( cd "$ROOT/$APP/backend" && exec env PORT="$PORT" LAB_ID="$LAB_ID" node dist/server.js ) \
  >/tmp/lab-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM

is_up() { (exec 3<>"/dev/tcp/127.0.0.1/$PORT") >/dev/null 2>&1; }
printf '   Waiting for the server to come online'
for _ in $(seq 120); do
  if is_up; then break; fi
  printf '.'
  sleep 1
done
printf '\n'
if ! is_up; then
  printf '   %s[ERROR]%s Server did not start. Last log lines:\n' "$CE" "$CR" >&2
  tail -n 20 /tmp/lab-server.log >&2 || true
  exit 1
fi
ok "Server is up at $URL"

# ---- 4/4 Browser (on by default; set OPEN_BROWSER=0 to skip) ----------------
say "[4/4] Opening Chrome"
if [ "${OPEN_BROWSER:-1}" = "1" ]; then
  export DISPLAY="${DISPLAY:-:1}"
  # The X/VNC display may need a moment if the lab just booted.
  for _ in $(seq 30); do
    command -v xdpyinfo >/dev/null 2>&1 || break
    xdpyinfo >/dev/null 2>&1 && break
    sleep 1
  done
  LAUNCHED=''
  for b in google-chrome google-chrome-stable chromium-browser chromium; do
    if command -v "$b" >/dev/null 2>&1; then
      "$b" --no-sandbox --no-first-run --no-default-browser-check --start-maximized "$URL" \
        >/tmp/lab-chrome.log 2>&1 &
      LAUNCHED="$b"; break
    fi
  done
  if [ -n "$LAUNCHED" ]; then
    ok "Chrome is opening at $URL"
  else
    info "Couldn't find Chrome — open a browser yourself and go to $URL"
  fi
else
  info "Browser auto-open is off — open a browser and go to $URL"
fi

say "Your lab is ready."
info "App URL: $URL"
info "Keep this terminal open. Press Ctrl-C here to stop the lab when you're done."
printf '\n'

# Stay attached so the server keeps running until the learner stops it.
wait "$SERVER_PID"
