#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/.run_logs"
PID_DIR="$ROOT_DIR/.run_pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

API_KEY="${DUKE_API_KEY:-}"

usage() {
  cat <<'EOF'
Usage:
  ./start_all_services.sh [--api-key YOUR_KEY]

Options:
  --api-key   One-time DUKE_API_KEY for tutor backend.

You can also pass DUKE_API_KEY from env:
  DUKE_API_KEY="xxx" ./start_all_services.sh
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-key)
      shift
      [[ $# -gt 0 ]] || { echo "Missing value for --api-key"; exit 1; }
      API_KEY="$1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ ! -x "$ROOT_DIR/.venv/bin/python" ]]; then
  echo "Error: Python venv not found at $ROOT_DIR/.venv"
  echo "Please create it first (example): python3 -m venv .venv"
  exit 1
fi

if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo "Error: node_modules not found."
  echo "Please run: npm install"
  exit 1
fi

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti "tcp:${port}" || true)"
  if [[ -n "$pids" ]]; then
    echo "Stopping processes on port ${port}: $pids"
    # shellcheck disable=SC2086
    kill $pids || true
    sleep 1
    pids="$(lsof -ti "tcp:${port}" || true)"
    if [[ -n "$pids" ]]; then
      echo "Force stopping processes on port ${port}: $pids"
      # shellcheck disable=SC2086
      kill -9 $pids || true
    fi
  fi
}

start_service() {
  local name="$1"
  local cwd="$2"
  local cmd="$3"
  local log="$LOG_DIR/${name}.log"
  local pidfile="$PID_DIR/${name}.pid"

  echo "Starting ${name}..."
  nohup bash -lc "cd \"$cwd\" && $cmd" >"$log" 2>&1 &
  local pid=$!
  echo "$pid" >"$pidfile"
  echo "  PID: $pid"
  echo "  Log: $log"
}

echo "Preparing ports..."
kill_port 3000
kill_port 8000
kill_port 8001
kill_port 8002

start_service "engine_backend" \
  "$ROOT_DIR/engine_backend" \
  "../.venv/bin/uvicorn main:app --port 8000"

start_service "playerbot_backend" \
  "$ROOT_DIR/playerbot_backend" \
  "../.venv/bin/uvicorn main:app --port 8001"

if [[ -n "$API_KEY" ]]; then
  start_service "tutor_backend" \
    "$ROOT_DIR/tutor_backend" \
    "DUKE_API_KEY=\"$API_KEY\" ../.venv/bin/uvicorn main:app --port 8002"
else
  start_service "tutor_backend" \
    "$ROOT_DIR/tutor_backend" \
    "../.venv/bin/uvicorn main:app --port 8002"
fi

start_service "node_server" \
  "$ROOT_DIR" \
  "node server.js"

sleep 2

echo
echo "Service URLs:"
echo "  Node/UI:      http://localhost:3000"
echo "  Engine docs:  http://localhost:8000/docs"
echo "  Playerbot:    http://localhost:8001/docs"
echo "  Tutor docs:   http://localhost:8002/docs"
echo
echo "Tip: tail logs with:"
echo "  tail -f .run_logs/node_server.log"

