# Chess Web Server Documentation

---

# 1. Summary

## Problem Statement

The objective of this project is to build an interactive chess tutoring system that helps players understand positions, improve decision-making, and receive actionable feedback in real time. Traditional chess engines provide optimal moves but lack pedagogical value; they do not explain *why* a move is good or bad in a way that aligns with human learning. Conversely, static learning platforms lack interactivity and responsiveness to user decisions.

The core challenge is to bridge the gap between engine-level accuracy and human-understandable instruction while maintaining a seamless user experience. This requires not only strong backend evaluation but also real-time feedback delivery, intuitive UI/UX, and adaptive responses based on player behavior.

---

## Proposed Solution

The system implements a hybrid architecture combining deterministic chess logic, engine-based evaluation, and natural language feedback generation. A Node.js backend manages game state, validates moves, and orchestrates interactions between five components. Python-based services provide position evaluation using Stockfish, human-like move generation using Maia, and move coaching via a grounded LLM pipeline.

When a user makes a move, the system computes verified tactical facts from the position (using python-chess and Stockfish), classifies the move by centipawn loss, and passes all of this structured data to an LLM. The LLM synthesizes the grounded inputs into a plain-prose coaching explanation. Users can then ask follow-up questions that continue the same conversation with full positional context.

On the frontend, the system emphasizes responsiveness and clarity: the eval bar, engine lines, and tutor panel update in real time via Server-Sent Events. Toggle states (Engine, Bot, Tutor, Novice Mode, ELO) persist across browser refreshes via localStorage.

---

## Results

The system successfully delivers real-time chess gameplay with integrated instructional feedback. Users receive immediate, context-aware explanations after each move, grounded in verified engine and python-chess analysis. The integration of Maia introduces variability and human-like play, making interactions more realistic and pedagogically effective.

The follow-up question feature allows multi-turn coaching conversations anchored to a specific position — users can ask "What do you mean by X?" or "What if I played Y instead?" and receive contextually aware responses without repeating the position context.

Overall, the system demonstrates that combining engine evaluation with grounded LLM interpretation provides a significantly more effective learning experience than either approach alone.

---

## Future Work

Future improvements focus on scalability, personalization, and deeper instructional quality. On the infrastructure side, introducing persistent storage (e.g., Redis or Postgres) and session recovery would allow users to review past games and track improvement over time.

On the modeling side, feedback quality can be enhanced by incorporating player profiling — adapting explanations based on skill level, recurring mistakes, and learning progression. Additional heuristics can detect tactical motifs (forks, pins, skewers) and name them in the explanation.

From a UX perspective, improvements include richer visualizations (threat maps, piece activity indicators) and tighter integration between board interactions and feedback. Multiplayer support and WebSocket-based communication are also natural extensions.

---

# 2. FAQ

## Design Decisions

### Why combine Stockfish and Maia?
Stockfish provides ground-truth optimal evaluation, while Maia approximates human decision-making at a specific ELO. Using both allows the system to balance correctness with realism: Stockfish identifies the best move, Maia generates plausible human alternatives. The bot uses all three engines (weak Maia, same-ELO Maia, ELO-limited Stockfish) blended by a learned policy.

---

### Why use an LLM instead of rule-based explanations?
Rule-based systems struggle with generalization and produce rigid, repetitive feedback. An LLM can synthesize engine outputs into flexible, context-aware explanations that better match human coaching styles. Critically, the LLM in this system is *grounded* — it only receives verified facts and is instructed not to invent details beyond what it is given.

---

### Won't the LLM hallucinate?
This is a real risk, which is why all tactical facts are computed *before* calling the LLM. The system pre-computes from python-chess: the piece moved, any captured piece, whether the destination was already attacked, which of the mover's pieces are left en prise after the move, whether check was given, and the same breakdown for the engine's best alternative. Centipawn scores, the best move, and the principal variation come from Stockfish. A full list of legal moves is also passed to prevent the LLM from suggesting illegal alternatives. The system prompt explicitly instructs the model not to invent tactical details not present in the data.

---

### Why separate Node.js and Python services?
Node.js is optimized for handling concurrent client requests and API orchestration, while Python provides better support for ML models and engine tooling (python-chess, Stockfish bindings, Maia inference). This separation ensures each layer operates in its optimal environment and can be scaled or replaced independently.

---

### Why limit Stockfish via ELO instead of depth?
Depth-limited engines still find tactically devastating moves in critical positions — they just find them slightly slower. ELO-based limiting introduces realistic inaccuracies throughout the game, producing more human-like play overall.

---

### Why validate moves server-side before engine evaluation?
Ensures correctness and prevents invalid game states from propagating into engine or LLM systems. It also avoids unnecessary compute calls for illegal input.

---

### How is latency managed?
Engine and tutor calls run asynchronously — the move response is returned to the frontend immediately, and engine updates and tutor explanations are pushed separately via SSE as they complete. Stockfish analysis in the tutor runs at depth 12, which is fast enough for near-real-time feedback.

---

### What is Maia?
Maia is a neural network trained on millions of human chess games. Unlike Stockfish, which plays the objectively best move, Maia predicts what a human player at a given ELO would most likely play. This makes it far more realistic as a training opponent — it blunders, hesitates, and makes the kinds of mistakes real humans make.

---

### What is the difference between the Engine toggle and the Tutor toggle?
The **Engine toggle** enables Stockfish analysis and shows the eval bar (a visual estimate of who is winning) and a best-move arrow on the board. It runs continuously, updating after every move.

The **Tutor toggle** enables natural language coaching after each of *your* moves. It does not affect the eval bar. The two are independent — you can run either or both.

---

### What do the move classifications mean?
The tutor classifies each player move based on centipawn (cp) loss relative to the engine's best move:

| Classification | Centipawn Loss |
|---|---|
| Fine | ≤ 20 cp |
| Inaccuracy | 21 – 50 cp |
| Mistake | 51 – 100 cp |
| Blunder | > 100 cp |

One centipawn equals 1/100th of a pawn in material value. A blunder typically means dropping a piece or missing a forced win.

---

### Can I ask follow-up questions?
Yes. After the tutor explains a move, a text field appears beneath the explanation. You can type questions like "What do you mean by that?" or "What if I had played my knight to f6 instead?" and receive a contextually aware response. The follow-up has access to all the same position data as the original explanation. The context resets when you make a new move.

---

### What is Novice Mode?
Novice Mode adds an instruction to the tutor prompt asking the LLM to explain in beginner-friendly language and define any chess terms it uses. It is designed for players who are new to chess terminology. Toggle it on or off via the chip next to the Tutor heading in the right panel.

---

### Why does the bot sometimes make obviously bad moves?
This is intentional. The bot uses a learned policy to select between three engines on each move: Weak Maia (ELO − 300), Same-strength Maia, and ELO-limited Stockfish. The weak Maia engine is chosen relatively often at lower ELO settings, producing realistic human-like mistakes and variability. A bot that plays perfectly every move would not simulate a real human opponent.

---

### Does the system save my games or progress?
No. All game state is stored in memory on the Node.js server. Restarting the server loses the current game. Toggle states (Engine on/off, Bot on/off, Tutor on/off, Novice Mode, ELO) are saved to browser localStorage and restored on page refresh.

---

### What ELO should I set?
Use the following rough reference values to choose a bot strength that matches your level:

| Level | ELO Range |
|---|---|
| Beginner | 100 – 800 |
| Amateur | 800 – 1400 |
| Intermediate | 1400 – 1800 |
| Advanced | 1800 – 2200 |
| Expert / Master | 2200+ |
| Grandmaster | 2500 |
| Super GM | 2700 |
| Engine-level | 3000+ |

---

### What happens when the game ends?
The board freezes and no further moves are accepted. If the bot delivers the final checkmate, that move is not analyzed by the tutor (bot moves are never tutored). Your last move before the bot's winning move is still analyzed and explained as normal. If you deliver checkmate yourself, the tutor will analyze and explain that move.

---

### What is the eval bar?
The vertical bar to the left of the board shows Stockfish's assessment of the current position. White fills from the bottom; a 50/50 bar means an even position. The bar is only visible when the Engine toggle is on. It updates after every move as the engine re-evaluates the position.

---

### Can I play as Black?
Yes. In the New Game panel, set the Color selector to "Black" before clicking Start New Game. The board orientation will flip so Black is on the bottom. You can also use the Flip Board button at any time to mirror the orientation without resetting the game.

---

### How do I run the system?
Four processes must run simultaneously, each in its own terminal (Python venv activated):

```bash
# Terminal 1 – Frontend server (port 3000)
cd chess_tutor
node server.js

# Terminal 2 – Engine backend (port 8000)
cd chess_tutor/engine_backend
uvicorn main:app --port 8000

# Terminal 3 – Playerbot backend (port 8001)
cd chess_tutor/playerbot_backend
uvicorn main:app --port 8001

# Terminal 4 – Tutor backend (port 8002)
cd chess_tutor/tutor_backend
uvicorn main:app --port 8002
```

Then open `http://localhost:3000`. The environment variable `DUKE_API_KEY` must be set before starting the tutor backend.

---

### How do I get better?
- Play with the Tutor enabled and read every explanation, even for moves labeled "fine."
- Enable Novice Mode if any chess terms are unfamiliar.
- Use the follow-up question field to ask about anything that is unclear.
- Focus more attention on blunders and mistakes than on inaccuracies.
- Set the bot ELO slightly above your current level — enough to be challenging but not overwhelming.
- After a loss, use the engine eval bar to identify which move caused the position to swing.

---

## User Operation

### How does a user interact with the system?
1. User makes a move on the frontend board
2. Move is sent to the backend API (`/api/board/move`)
3. Backend validates and updates game state
4. Engine evaluation is triggered (if Engine toggle is on)
5. Tutor analysis runs asynchronously (if Tutor toggle is on)
6. Frontend receives updates via SSE and displays explanations in real time

---

### What kind of feedback does the user receive?
- Move classification (fine, inaccuracy, mistake, blunder) based on centipawn loss
- The engine's best alternative move and why it was better
- Tactical details: captures, checks, en prise pieces, whether the destination was attacked
- A plain-prose 3–5 sentence coaching explanation
- Follow-up question support for any additional clarification

---

### Can users play against bots?
Yes. Toggle the Bot on, then set the ELO in the New Game panel. The bot uses a learned policy to blend Maia and Stockfish for human-like play. Start a new game for the bot to take effect with the chosen settings.

---

### Is the system real-time?
Yes, within practical limits. Move validation and board updates are immediate. Engine eval and tutor explanations arrive within a few seconds via SSE, depending on analysis depth and LLM response time.

---

### What happens if the engine or tutor service is unavailable?
If the engine backend is unreachable, engine updates simply stop arriving — the board and game still function. If the tutor backend is unreachable, tutor analysis silently fails and no explanation is displayed. No part of the system crashes the frontend.

---

# 3. Technical Documentation

## 3.1 System Architecture

The system follows a five-service architecture:

```
Frontend (public/)         → Browser UI, Chessground board
Backend API (src/)         → Node.js / Express, authoritative orchestrator
Engine Backend             → Python / FastAPI, Stockfish analysis (port 8000)
Playerbot Backend          → Python / FastAPI, Maia + policy-based moves (port 8001)
Tutor Backend              → Python / FastAPI, grounded LLM coaching (port 8002)
```

The Node.js backend is the single source of truth for game state. The three Python services are stateless compute workers.

---

## 3.2 Backend Responsibilities

### API Layer (`src/routes/`)
- Accepts HTTP requests (`/move`, `/board`, `/engine`, `/clock`, `/stream`, `/playerbot`, `/tutor`)
- Performs lightweight input validation
- Routes requests to controllers

### Controllers (`src/controllers/`)
- Receive parsed request data from routes
- Orchestrate game state updates, engine calls, and tutor analysis
- Return structured responses
- Do not store state

### Game Layer (`src/game/`)
- `game_state`: Holds board (chess.js instance), FEN, move history
- `game_status`: Tracks turn, checkmate, draw, and other lifecycle states
- Pure state + rules; no external dependencies

### Services (`src/services/`)
- Engine service → communicates with engine backend, manages running/stopped state
- PlayerBot service → communicates with playerbot backend, tracks ELO and running state
- Tutor service → communicates with tutor backend, tracks enabled/novice state
- SSE service → broadcasts real-time events to all connected clients

---

## 3.3 Real-Time Communication (SSE)

The system uses Server-Sent Events (SSE) for all real-time updates. The frontend connects to `/api/general/stream` and receives events:

| Event Type | Payload | Consumer |
|---|---|---|
| `setFen` | `status`, `fen`, `source` | Board, clocks, tutor |
| `engineUpdate` | `lines` | Engine panel |
| `tutorUpdate` | `explanation` | Tutor panel |
| `flip` | — | Board orientation |
| `select` | `key` | Square highlight |

The `source` field on `setFen` indicates whether the move was made by the player or the bot. The frontend uses this to suppress the "Analyzing your move…" indicator during bot moves — preventing it from interrupting a player move's tutor analysis that is still in flight.

---

## 3.4 Engine Backend (`engine_backend/`, port 8000)

Wraps Stockfish for continuous position evaluation.

**Endpoints:**
- `POST /engine/start` — begin analysis at a given FEN
- `POST /engine/stop` — halt analysis
- `POST /engine/set-position` — update the position mid-analysis

**Output (via SSE):** depth, evaluation (centipawns), best move, principal variation lines.

---

## 3.5 Playerbot Backend (`playerbot_backend/`, port 8001)

Generates human-like moves using a three-engine blending policy.

**Engines used:**
1. Weak Maia (ELO − 300) — simulates lower-skill human play
2. Same-strength Maia — matches target ELO distribution
3. ELO-limited Stockfish — provides tactical sharpness in critical positions

**Policy:** A learned linear model (`engine_policy_v1.npz`) takes position evaluation (centipawns), position complexity (eval spread across top moves), and player ELO as input, and outputs a softmax probability distribution over the three engines. One engine is sampled per move.

The bot listens to the SSE stream directly (not polled) and submits moves back to the Node.js server via `POST /api/board/move` with `source: "bot"`.

---

## 3.6 Tutor Backend (`tutor_backend/`, port 8002)

Analyzes player moves and generates coaching explanations using a grounded LLM pipeline.

### Analysis Pipeline (per player move)

1. **Stockfish evaluation** (depth 12) on both positions
   - Centipawn scores before and after
   - Best move and principal variation (5 moves)
   - Delta from the mover's perspective → move classification

2. **Move classification**
   - Blunder: > 100 cp lost
   - Mistake: > 51 cp lost
   - Inaccuracy: > 21 cp lost
   - Fine: ≤ 20 cp lost

3. **Board facts** (python-chess)
   - Game phase, material balance, king locations and castling status

4. **Move facts** (python-chess)
   - Piece moved, from/to squares, capture
   - Whether the destination was already attacked by the opponent
   - Which of the mover's pieces are left en prise after the move
   - Whether the move gives check
   - Same breakdown for the engine's best alternative

5. **Legal moves list** (SAN notation)
   - All legal moves before the played move
   - Passed to LLM to prevent it from suggesting illegal alternatives

All facts are computed deterministically from python-chess and Stockfish — the LLM receives verified data and is instructed not to invent anything beyond it.

### Follow-Up Question Feature

After `analyze()` completes, the full LLM message history (system prompt + grounding user message + assistant response) is cached in `TutorAnalyzer._conv_messages`. When the user submits a follow-up question, it is appended to this history and the LLM is called again. The assistant response is then appended, allowing chained follow-ups. The cache is replaced on every new `analyze()` call, so context resets automatically with each new player move.

### Novice Mode

When `novice=True`, an additional sentence is appended to the user message asking the LLM to use beginner-friendly language and define chess terms. The system prompt is unchanged.

### LLM Configuration

- Model: `gpt-5.2` via Duke LiteLLM proxy (`https://litellm.oit.duke.edu/v1`)
- Temperature: 0.4
- Max tokens: 300
- Output format: plain prose — no headers, no bullet points, no markdown

---

## 3.7 Frontend (`public/`)

The frontend is stateless with respect to game rules. It does not validate moves or compute outcomes — it relies entirely on the backend.

### Key Modules
- `board.js` — Chessground board instance, eval bar, best-move arrow
- `players.js` — user move handler
- `sse.js` — SSE connection, event routing
- `tutor.js` — tutor panel state, follow-up question handling
- `engine.js` — engine panel display
- `clock.js` — clock rendering and sync
- `main.js` — initialization, toggle event listeners, localStorage persistence

### Toggle Persistence
The state of the Engine, Bot, Tutor, and Novice Mode toggles plus the ELO value is saved to `localStorage` on every change and restored on page load. This means all active features survive a browser refresh.

### Follow-Up Question Feature (Frontend)
After a `tutorUpdate` SSE event is received, a text input appears beneath the explanation. The user can type a question and submit via Enter or the Ask button. The question is sent to `POST /api/tutor/followup`. While awaiting a response, the panel shows "Thinking…" and the button is disabled. On response, the explanation is replaced with the follow-up answer and the input is cleared. The input is hidden and the Python conversation cache is reset when the player makes a new move.

---

## 3.8 State Management

### In-Memory Model (Node.js)
```js
{
  fen,           // current board position
  moveHistory,   // list of moves played
  turn,          // whose turn it is
  isGameOver,    // game termination flag
}
```

Toggle and service states are managed in their respective service modules (`tutor_service.js`, `engine_service.js`, `playerbot_service.js`).

**Limitations:**
- No persistence — state is lost on server restart
- No multi-game support — one game per server instance

---

## 3.9 Performance Considerations
- Engine evaluation is CPU-bound; async execution prevents blocking the request loop
- Tutor analysis at depth 12 is fast enough for near-real-time feedback (typically 1–3 seconds)
- SSE allows engine and tutor results to arrive independently without blocking each other
- Follow-up questions re-use the cached conversation context, avoiding re-analysis of the position

---

## 3.10 Security Considerations
- All moves are validated server-side against the chess.js legal move list
- Input validation at all API boundaries
- Engine and LLM services are network-isolated (localhost only)
- LLM output is stripped of markdown formatting before display
