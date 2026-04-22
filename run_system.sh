#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${ROOT_DIR}/.venv"
LOG_DIR="${ROOT_DIR}/.run_logs"
STOCKFISH_BIN="${ROOT_DIR}/../engines/stockfish/stockfish-windows-x86-64-avx2.exe"
STOCKFISH_BIN_ALT1="${ROOT_DIR}/../engines/stockfish/stockfish"
STOCKFISH_BIN_ALT2="${ROOT_DIR}/../engines/stockfish/stockfish-macos"

ENGINE_DIR="${ROOT_DIR}/engine_backend"
PLAYERBOT_DIR="${ROOT_DIR}/playerbot_backend"
TUTOR_DIR="${ROOT_DIR}/tutor_backend"

NODE_CMD="node server.js"
ENGINE_CMD="uvicorn main:app --port 8000"
PLAYERBOT_CMD="uvicorn main:app --port 8001"
TUTOR_CMD="uvicorn main:app --port 8002"

mkdir -p "${LOG_DIR}"

echo "==> Project root: ${ROOT_DIR}"

free_port_if_busy() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "${pids}" ]; then
    echo "==> Port ${port} is busy; stopping existing process(es): ${pids}"
    # shellcheck disable=SC2086
    kill ${pids} >/dev/null 2>&1 || true
    sleep 1
    pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
    if [ -n "${pids}" ]; then
      echo "==> Force-stopping remaining listener(s) on ${port}: ${pids}"
      # shellcheck disable=SC2086
      kill -9 ${pids} >/dev/null 2>&1 || true
    fi
    sleep 1
  fi
}

free_port_if_busy 3000
free_port_if_busy 8000
free_port_if_busy 8001
free_port_if_busy 8002

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found."
  exit 1
fi

if [ ! -d "${VENV_DIR}" ]; then
  echo "==> Creating Python virtual environment (.venv)"
  python3 -m venv "${VENV_DIR}"
fi

echo "==> Activating virtual environment"
# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"

echo "==> Installing frontend dependencies (npm)"
cd "${ROOT_DIR}"
npm install

echo "==> Installing Python dependencies (pip)"
python -m pip install --upgrade pip
pip install -r "${ROOT_DIR}/requirements.txt"
pip install aiohttp numpy maia2 pandas scikit-learn tqdm gdown pyzstd pyyaml einops
pip install torch

resolve_stockfish_path() {
  if [ -f "${STOCKFISH_BIN}" ]; then
    echo "${STOCKFISH_BIN}"
    return 0
  fi
  if [ -f "${STOCKFISH_BIN_ALT1}" ]; then
    echo "${STOCKFISH_BIN_ALT1}"
    return 0
  fi
  if [ -f "${STOCKFISH_BIN_ALT2}" ]; then
    echo "${STOCKFISH_BIN_ALT2}"
    return 0
  fi
  if command -v stockfish >/dev/null 2>&1; then
    command -v stockfish
    return 0
  fi
  return 1
}

STOCKFISH_PATH_RESOLVED="$(resolve_stockfish_path || true)"

if [ -z "${STOCKFISH_PATH_RESOLVED}" ] && command -v brew >/dev/null 2>&1; then
  echo "==> Stockfish not found. Attempting auto-install via Homebrew..."
  brew install stockfish
  STOCKFISH_PATH_RESOLVED="$(resolve_stockfish_path || true)"
fi

if [ -z "${STOCKFISH_PATH_RESOLVED}" ]; then
  echo "ERROR: Stockfish binary not found."
  echo "Looked in:"
  echo "  ${STOCKFISH_BIN}"
  echo "  ${STOCKFISH_BIN_ALT1}"
  echo "  ${STOCKFISH_BIN_ALT2}"
  echo "  (and PATH: stockfish)"
  echo
  echo "Install stockfish (e.g. 'brew install stockfish') or place binary under ../engines/stockfish."
  exit 1
fi
export STOCKFISH_PATH="${STOCKFISH_PATH_RESOLVED}"
echo "==> Using Stockfish: ${STOCKFISH_PATH}"

PIDS=()

start_service() {
  local name="$1"
  local cwd="$2"
  local cmd="$3"
  local log_file="${LOG_DIR}/${name}.log"

  echo "==> Starting ${name} in ${cwd}"
  (
    cd "${cwd}"
    # shellcheck disable=SC2086
    bash -lc "source '${VENV_DIR}/bin/activate' && ${cmd}"
  ) >"${log_file}" 2>&1 &

  local pid=$!
  PIDS+=("${pid}")
  echo "    PID=${pid}, log=${log_file}"
}

cleanup() {
  echo
  echo "==> Stopping services..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "${pid}" >/dev/null 2>&1; then
      kill "${pid}" >/dev/null 2>&1 || true
    fi
  done
  wait || true
  echo "==> All services stopped."
}

trap cleanup EXIT INT TERM

start_service "frontend_3000" "${ROOT_DIR}" "${NODE_CMD}"
start_service "engine_8000" "${ENGINE_DIR}" "${ENGINE_CMD}"
start_service "playerbot_8001" "${PLAYERBOT_DIR}" "${PLAYERBOT_CMD}"
start_service "tutor_8002" "${TUTOR_DIR}" "${TUTOR_CMD}"

echo
echo "System is starting..."
echo "Open: http://localhost:3000"
echo "Logs: ${LOG_DIR}"
echo "Press Ctrl+C to stop all services."
echo

wait
