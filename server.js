const express = require('express');
const path = require('path');
const { Chess } = require('chess.js');

const app = express();
const PORT = 3000;

// Chess engine to enforce legal moves and track game state
const game = new Chess();

function buildStatus() {
  // Build legal move destinations for each from-square
  const moves = game.moves({ verbose: true });
  const dests = {};
  for (const m of moves) {
    if (!dests[m.from]) dests[m.from] = [];
    dests[m.from].push(m.to);
  }

  return {
    fen: game.fen(),
    turn: game.turn() === 'w' ? 'white' : 'black',
    inCheck: game.inCheck(),
    isCheckmate: game.isCheckmate(),
    isDraw: game.isDraw(),
    isStalemate: game.isStalemate(),
    isThreefoldRepetition: game.isThreefoldRepetition(),
    isInsufficientMaterial: game.isInsufficientMaterial(),
    isGameOver: game.isGameOver(),
    dests,
  };
}

// Store all SSE client connections
const sseClients = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Broadcast command to all open board pages
function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(msg);
    } catch (e) {
      // Connection is already closed
    } 
  });
}

// ========== Public API endpoints ==========

// Make a move: POST /api/move   body: { "from": "e2", "to": "e4" }
app.post('/api/move', (req, res) => {
  const { from, to } = req.body || {};
  if (!from || !to) {
    return res
      .status(400)
      .json({ error: 'Please provide "from" and "to", e.g. { "from": "e2", "to": "e4" }' });
  }

  if (game.isGameOver()) {
    return res.status(400).json({
      error: 'Game is already over',
      status: buildStatus(),
    });
  }

  // Let chess.js validate and apply the move
  const moveResult = game.move({ from, to, promotion: 'q' });
  if (!moveResult) {
    return res.status(400).json({ error: 'Illegal move according to chess rules' });
  }

  const status = buildStatus();
  broadcast({ type: 'setFen', fen: status.fen, status });
  res.json({ ok: true, move: { from, to }, status });
});

// Set board FEN: POST /api/set-fen   body: { "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR" }
app.post('/api/set-fen', (req, res) => {
  const { fen } = req.body || {};
  if (!fen) {
    return res.status(400).json({ error: 'Please provide a "fen" string' });
  }

  // Keep chess.js game state in sync with the board
  const loaded = game.load(fen);
  if (!loaded) {
    return res.status(400).json({ error: 'Invalid FEN string' });
  }

  const status = buildStatus();
  broadcast({ type: 'setFen', fen: status.fen, status });
  res.json({ ok: true, status });
});

// Select a square: POST /api/select   body: { "key": "e4" } or { "key": null } to clear selection
app.post('/api/select', (req, res) => {
  const { key } = req.body || {};
  broadcast({ type: 'select', key: key ?? null });
  res.json({ ok: true, key: key ?? null });
});

// Flip board orientation: POST /api/flip
app.post('/api/flip', (req, res) => {
  broadcast({ type: 'flip' });
  res.json({ ok: true });
});

// Reset to starting position: POST /api/reset
app.post('/api/reset', (req, res) => {
  game.reset();
  const status = buildStatus();
  broadcast({ type: 'setFen', fen: status.fen, status });
  res.json({ ok: true, status });
});

// Get current game status (FEN, side to move, game over flags, etc.)
app.get('/api/state', (req, res) => {
  res.json({ ok: true, status: buildStatus() });
});

// The board page receives commands via SSE
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.push(res);
  req.on('close', () => {
    const i = sseClients.indexOf(res);
    if (i !== -1) sseClients.splice(i, 1);
  });
});

// Index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  Chessground control API started

  Open in your browser:  http://localhost:${PORT}

  Example API calls from this machine (run in your terminal):

  # Make a move (e2 -> e4)
  curl -X POST http://localhost:${PORT}/api/move -H "Content-Type: application/json" -d '{"from":"e2","to":"e4"}'

  # Set a FEN position
  curl -X POST http://localhost:${PORT}/api/set-fen -H "Content-Type: application/json" -d '{"fen":"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR"}'

  # Select square e4
  curl -X POST http://localhost:${PORT}/api/select -H "Content-Type: application/json" -d '{"key":"e4"}'

  # Flip the board
  curl -X POST http://localhost:${PORT}/api/flip

  # Reset the board
  curl -X POST http://localhost:${PORT}/api/reset
`);
});
