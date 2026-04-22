# Chess Web Server Documentation

---

# 1. Summary

## Problem Statement

The objective of this project is to build an interactive chess tutoring system that helps players understand positions, improve decision-making, and receive actionable feedback in real time. Traditional chess engines provide optimal moves but lack pedagogical value; they do not explain *why* a move is good or bad in a way that aligns with human learning. Conversely, static learning platforms lack interactivity and responsiveness to user decisions.

The core challenge is to bridge the gap between engine-level accuracy and human-understandable instruction while maintaining a seamless user experience. This requires not only strong backend evaluation but also real-time feedback delivery, intuitive UI/UX, and adaptive responses based on player behavior.

---

## Proposed Solution

The system implements a hybrid architecture combining deterministic chess logic, engine-based evaluation, and natural language feedback generation. A Node.js backend manages game state, validates moves, and orchestrates interactions between components. Python-based engine services provide position evaluation using Stockfish (for optimal play) and Maia (for human-like move modeling).

When a user makes a move, the system evaluates the resulting position, compares it against engine-recommended lines, and generates structured insights. These insights are passed to an LLM-based feedback module, which translates raw engine outputs into pedagogically useful explanations. This enables contextual feedback such as identifying blunders, suggesting alternatives, and reinforcing strong decisions.

On the frontend, the system emphasizes responsiveness and clarity: move history, candidate moves, probabilities, and feedback are presented in a way that minimizes cognitive overload while maximizing learning value. Additional features such as text-to-speech and move highlighting enhance accessibility and engagement.

---

## Results

The system successfully delivers real-time chess gameplay with integrated instructional feedback. Users receive immediate, context-aware explanations after each move, improving their ability to understand positional concepts rather than simply memorizing engine outputs. The integration of Maia introduces variability and human-like play, making interactions more realistic and pedagogically effective.

Performance optimizations—such as lazy data writes, reduced sampling in training pipelines, and asynchronous engine calls—ensure that the system remains responsive under typical usage conditions. The modular architecture also enables independent scaling of frontend, backend, and engine components.

Overall, the system demonstrates that combining engine evaluation with LLM-based interpretation provides a significantly more effective learning experience than either approach alone.

---

## Future Work

Future improvements focus on scalability, personalization, and deeper instructional quality. On the infrastructure side, introducing persistent storage (e.g., Redis or Postgres) and WebSocket-based communication will enable real-time multiplayer support and session recovery. Engine workloads can be offloaded to distributed task queues to improve scalability under high concurrency.

On the modeling side, feedback quality can be enhanced by incorporating player profiling—adapting explanations based on skill level, common mistakes, and learning progression. Additional heuristics can be introduced to better detect tactical motifs and strategic themes beyond raw evaluation differences.

From a UX perspective, improvements include richer visualizations (e.g., threat maps, piece activity indicators) and tighter integration between board interactions and feedback. These enhancements aim to further reduce the gap between engine computation and human understanding.

---

# 2. FAQ (Design Decisions & User Operation)

## Design Decisions

### Why combine Stockfish and Maia?
Stockfish provides ground-truth optimal evaluation, while Maia approximates human decision-making. Using both allows the system to balance correctness with realism, which is critical for training.

---

### Why use an LLM instead of rule-based explanations?
Rule-based systems struggle with generalization and produce rigid feedback. An LLM can synthesize engine outputs into flexible, context-aware explanations that better match human coaching styles.

---

### Why separate Node.js and Python services?
Node.js is optimized for handling concurrent client requests and API orchestration, while Python provides better support for ML models and engine tooling. This separation ensures each layer operates in its optimal environment.

---

### Why limit Stockfish via ELO instead of depth?
Depth-limited engines still play unnaturally strong moves in critical positions. ELO-based limiting produces more human-like inaccuracies, improving training realism.

---

### Why validate moves before engine evaluation?
Ensures correctness and prevents invalid states from propagating into engine or feedback systems. This also reduces unnecessary engine calls.

---

### How is latency managed?
Through asynchronous engine calls, reduced evaluation depth, and selective analysis (e.g., focusing on top candidate lines rather than exhaustive search).

---

## User Operation

### How does a user interact with the system?
1. User makes a move on the frontend  
2. Move is sent to backend API  
3. Backend validates and updates game state  
4. Engine evaluates the position  
5. LLM generates feedback  
6. Frontend displays updated board + feedback  

---

### What kind of feedback does the user receive?
- Move quality (good, inaccuracy, mistake, blunder)  
- Suggested alternatives  
- Positional insights (e.g., king safety, piece activity)  
- Encouragement or corrective guidance  

---

### Can users play against bots?
Yes. Bots can be configured for:
- Strength (via ELO)  
- Style (optimal vs human-like)  

---

### Is the system real-time?
Yes, within practical limits. Feedback is delivered immediately after each move with minimal delay.

---

### What happens if the engine is slow or fails?
Fallback behavior includes:
- Returning last known evaluation  
- Skipping deep analysis  
- Still providing lightweight feedback  

---

# 3. Technical Documentation

## 3.1 System Architecture

The system follows a layered architecture:

- Frontend (Client)  
- Backend API (Node.js / Express)  
- Game Manager (State + Logic)  
- Engine Interface Layer  
- Python Engine Services (Stockfish / Maia / ML)  
- LLM Feedback Module  

---

## 3.2 Backend Responsibilities

### API Layer
- Accepts HTTP requests (`/move`, `/state`, etc.)  
- Validates input schema  
- Routes requests to game manager  

---

### Game Manager
Central authority for game state:
- Maintains active games in memory  
- Enforces turn order  
- Applies moves using chess logic  
- Triggers engine + feedback pipeline  

---

### Chess Logic
Implemented via `chess.js`:
- Legal move validation  
- FEN/PGN tracking  
- Game termination detection  

---

## 3.3 Engine Interface Layer

Acts as a boundary between Node and Python:
- Sends FEN positions  
- Requests evaluation  
- Receives best moves and scores  

Supports:
- REST calls  
- Subprocess communication  

---

## 3.4 Python Engine Services

### Components
- Stockfish wrapper  
- Maia model interface  
- Evaluation aggregator  

### Responsibilities
- Compute best move and top candidate lines  
- Return structured evaluation data  
- Optionally provide probabilities (Maia)  

---

## 3.5 LLM Feedback Module

### Inputs
- Current FEN  
- Previous FEN  
- Player move  
- Engine top lines  

### Processing
- Compare player move vs optimal moves  
- Identify deviations and patterns  
- Generate natural language explanation  

### Outputs
- Textual feedback  
- Optional structured tags (e.g., “blunder”)  

---

## 3.6 Frontend Responsibilities

- Render board state  
- Capture user moves  
- Display:
  - Move history  
  - Engine suggestions  
  - LLM feedback  
- Provide interaction features (TTS, copy, etc.)  

---

## 3.7 Data Pipeline

### Input
- PGN datasets  

### Processing
- Feature extraction  
- Position evaluation  
- Move probability modeling  

### Optimizations
- Parallel processing  
- Lazy saving  
- Reduced sampling  

---

## 3.8 State Management

### In-Memory Model
```js
{
  gameId,
  players,
  fen,
  moveHistory,
  turn
}
```

Limitations
- No persistence
- No recovery after restart

## 3.9 Performance Considerations
- Engine evaluation is CPU-bound
- Latency minimized via:
    - Async execution
    - Limited depth
    - Selective analysis


## 3.10 Security Considerations
- Input validation at API boundary
- Enforcement of legal moves
- Rate limiting
- Engine sandboxing