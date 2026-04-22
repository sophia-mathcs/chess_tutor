# Executive Summary: Chess Tutor Web Application

---

## The Problem

Chess is a game that rewards deliberate, analytical thinking, but learning to think that way is genuinely hard. The tools available to most players fall into two categories, and neither is sufficient on its own.

On one side are chess engines. Programs like Stockfish play at a superhuman level and can identify the best move in any position almost instantly. But they do not explain anything. A player who makes a losing move and asks the engine for help receives a better move in return, not an understanding of why their move was wrong or what they should be thinking about next. Engine output is accurate but not instructional.

On the other side are static learning platforms: books, courses, and puzzle trainers. These explain concepts well but cannot respond to what a specific player just did in a real game. They teach general principles without connecting those principles to the player's own decisions in the moment.

The gap between these two approaches is the problem this project addresses. Players need a system that responds to their actual moves, explains what went wrong in plain language, and does so fast enough to feel like a natural part of the game rather than an interruption.

---

## Our Approach

The Chess Tutor Web Application is a fully playable chess platform that combines real-time engine analysis with natural language coaching feedback. It is designed so that every move a player makes is an opportunity to learn.

When a player moves a piece, the system immediately checks whether the move was strong or weak by comparing it against what a chess engine would have recommended. Before generating any explanation, the system gathers a set of verified facts about the position: what piece moved, whether it captured anything, whether the destination square was already being threatened, which pieces were left undefended after the move, and whether the move put the opponent in check. These facts are computed directly from the board, not guessed.

All of that information is then passed to an AI language model, which synthesizes it into a short, plain-prose coaching explanation. The model is explicitly instructed not to invent any tactical details that were not provided to it. This grounding step is what separates the system from a general-purpose AI assistant: the explanations are tied to what actually happened on the board.

After reading an explanation, players can ask follow-up questions in a text field beneath it. Questions like "What do you mean by that?" or "What if I had moved my knight instead?" continue the same conversation with full knowledge of the position. The coaching context resets automatically when the player makes their next move.

The system also includes a configurable AI opponent. The default bot blends two versions of Maia, a neural network trained on millions of real human games, with a strength-limited engine. A learned model decides which to use on each move based on the complexity of the position and the player's chosen skill level. The result is an opponent that makes the kinds of mistakes real humans make, not the kind of perfect play that makes learning difficult. A second bot mode draws moves directly from a database of real games, retrieving positions similar to the current one and selecting the move that real players at a matching skill level most commonly chose.

All features update in real time. The evaluation bar, the coaching explanation, and the engine's recommended move all arrive live without requiring the player to refresh or navigate away.

---

## Results

The system successfully delivers real-time chess gameplay with integrated instructional feedback. Players receive immediate, context-aware explanations after each move, grounded in verified analysis rather than general chess knowledge.

The follow-up question feature works as intended: users can ask for clarification, explore alternative moves, or request simpler language, and the system responds with awareness of the specific position that prompted the question. Novice Mode, which instructs the AI to define chess terms as it uses them, makes the system accessible to players who are new to the game.

The AI opponent behaves realistically at every skill level. At lower settings it blunders and hesitates in ways that reflect genuine human patterns. At higher settings it plays sharply but still within human bounds. Players report that the combination of a realistic opponent and move-by-move feedback creates a more effective learning loop than playing against a traditional engine alone.

Toggle states, skill level settings, and mode preferences all persist across browser refreshes, so returning to a session requires no reconfiguration.

---

## Future Work

Several directions would meaningfully extend the system's instructional value.

The most impactful near-term addition would be persistent game storage. Currently all game data is held in memory and lost when the server restarts. Saving completed games to a database would allow players to review past sessions, track improvement over time, and return to positions they found difficult.

On the coaching side, the system currently explains each move in isolation. A player profiling layer would let the system recognize recurring mistakes across a session and adapt its explanations accordingly. A player who repeatedly leaves pieces undefended would receive feedback that names and reinforces that pattern over time rather than treating each instance as a fresh occurrence.

Richer visualizations, including threat maps and piece activity indicators overlaid directly on the board, would help players see what the coaching explanation is describing rather than having to imagine it from text alone.

Finally, multiplayer support would allow two human players to use the coaching system together, receiving feedback on their moves as a shared learning activity rather than only in solo practice.
