# Deployment Guide

This guide covers everything needed to install and run the Chess Tutor Web App on a local Windows machine.

---

## Directory Structure

The application expects a specific layout. Ensure your project root looks like this before starting:

```
Sta 561 Chess/                        ← project root
│
├── chess_tutor/                      ← application code
│   ├── engine_backend/
│   ├── playerbot_backend/
│   ├── tutor_backend/
│   ├── public/
│   ├── src/
│   ├── server.js
│   ├── package.json
│   └── requirements.txt
│
└── engines/                          ← engine binaries (must be one level above chess_tutor/)
    ├── stockfish/
    │   └── stockfish-windows-x86-64-avx2.exe
    └── maia2/                        ← Maia2 model weight files
```

The Python backends resolve engine paths relative to the project root, so this layout must be exact.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 18+ | For the frontend server |
| Python 3.10+ | For all three Python backends |
| Stockfish (Windows AVX2) | Binary placed at `engines/stockfish/stockfish-windows-x86-64-avx2.exe` |
| Maia2 model weights | Files placed in `engines/maia2/` |
| Duke LiteLLM API access | Required for the tutor backend LLM calls |

---

## Step 1 — Install Stockfish

1. Download the Windows AVX2 build from https://stockfishchess.org/download/
2. Extract the archive
3. Place `stockfish-windows-x86-64-avx2.exe` at:
   ```
   Sta 561 Chess/engines/stockfish/stockfish-windows-x86-64-avx2.exe
   ```

---

## Step 2 — Install Maia2 Model Weights

1. Download the Maia2 model weight files (see the Maia2 repository for links)
2. Place them in:
   ```
   Sta 561 Chess/engines/maia2/
   ```

---

## Step 3 — Install Node.js Dependencies

From the `chess_tutor/` directory:

```bash
cd chess_tutor
npm install
```

This installs Express and other Node.js dependencies listed in `package.json`.

---

## Step 4 — Set Up the Python Virtual Environment

From the `chess_tutor/` directory:

```bash
# Create the virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate
```

The venv must be activated in every terminal that runs a Python service.

---

## Step 5 — Install Python Dependencies

With the venv activated:

```bash
pip install -r requirements.txt
pip install aiohttp numpy maia2
```

The `requirements.txt` covers `fastapi`, `uvicorn`, `python-chess`, and `openai`. The additional installs cover the playerbot backend (`aiohttp`, `numpy`) and the Maia2 inference engine (`maia2`).

---

## Step 6 — Configure the LLM API Key

The tutor backend calls the Duke LiteLLM proxy. The API key is configured in:

```
chess_tutor/tutor_backend/tutor.py
```

Find this block near the top of the `TutorAnalyzer.__init__` method:

```python
self.llm = OpenAI(
    api_key="YOUR_API_KEY_HERE",
    base_url="https://litellm.oit.duke.edu/v1",
)
```

Replace `YOUR_API_KEY_HERE` with your Duke LiteLLM API key. Alternatively, load it from an environment variable:

```python
import os
self.llm = OpenAI(
    api_key=os.environ["DUKE_API_KEY"],
    base_url="https://litellm.oit.duke.edu/v1",
)
```

If using the environment variable approach, set it before starting the tutor backend:

```bash
# Windows Command Prompt
set DUKE_API_KEY=your_key_here

# Windows PowerShell
$env:DUKE_API_KEY = "your_key_here"
```

---

## Step 7 — Start the Application

Four processes must run simultaneously. Open four terminal windows, activate the venv in each Python terminal, and run:

### Terminal 1 — Frontend Server (port 3000)
```bash
cd chess_tutor
node server.js
```

### Terminal 2 — Engine Backend (port 8000)
```bash
cd chess_tutor/engine_backend
# activate venv: ..\venv\Scripts\activate
uvicorn main:app --port 8000
```

### Terminal 3 — Playerbot Backend (port 8001)
```bash
cd chess_tutor/playerbot_backend
# activate venv: ..\venv\Scripts\activate
uvicorn main:app --port 8001
```

### Terminal 4 — Tutor Backend (port 8002)
```bash
cd chess_tutor/tutor_backend
# activate venv: ..\venv\Scripts\activate
uvicorn main:app --port 8002
```

> **Important:** The engine and tutor backends use paths relative to their working directory. Always run `uvicorn` from within each backend's own folder (e.g., `engine_backend/`, not `chess_tutor/`).

---

## Step 8 — Open the Application

Navigate to:

```
http://localhost:3000
```

---

## Verification Checklist

Once all four services are running, confirm each is working:

| Check | How to verify |
|---|---|
| Frontend loads | Page appears at http://localhost:3000 with the board visible |
| Engine works | Enable the Engine toggle — eval bar appears and updates after moves |
| Bot works | Enable the Bot toggle, start a new game — bot responds after your move |
| Tutor works | Enable the Tutor toggle, make a move — explanation appears within a few seconds |
| Follow-up works | After a tutor explanation, type a question in the text field and press Enter |

---

## Troubleshooting

### Engine backend fails to start
- Confirm Stockfish is at `engines/stockfish/stockfish-windows-x86-64-avx2.exe` (one level above `chess_tutor/`)
- Confirm you are running `uvicorn` from inside `chess_tutor/engine_backend/`

### Playerbot backend fails to start
- Confirm Stockfish and Maia2 model files are in the correct locations under `engines/`
- Confirm `maia2`, `aiohttp`, and `numpy` are installed in the active venv
- The bot listens to the Node.js SSE stream — start the frontend server first

### Tutor returns no explanation or an error
- Confirm the API key in `tutor_backend/tutor.py` is correct
- Confirm the tutor backend is running on port 8002 (`uvicorn main:app --port 8002`)
- Confirm you are running `uvicorn` from inside `chess_tutor/tutor_backend/`

### Bot or engine toggles don't restore after refresh
- Toggle state is saved to browser localStorage. If state is not restoring, check the browser console for errors during `restoreToggleState()` in `main.js`

### "Game is already over" error
- Clicking Start New Game resets the board. If the old game was in a checkmate/draw state, moves will be rejected until a new game is started.

---

## Port Summary

| Service | Port | Start command |
|---|---|---|
| Frontend (Node.js) | 3000 | `node server.js` |
| Engine backend | 8000 | `uvicorn main:app --port 8000` |
| Playerbot backend | 8001 | `uvicorn main:app --port 8001` |
| Tutor backend | 8002 | `uvicorn main:app --port 8002` |
