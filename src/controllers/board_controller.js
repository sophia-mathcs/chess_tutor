const gameManager = require('../game/game_manager');

// Set the board to a specific FEN
// POST /api/board/set-fen
// Body: { gameId, fen }
exports.setFen = (req, res) => {
  const { gameId, fen } = req.body || {};

  if (!fen || gameId === undefined) {
    return res.status(400).json({ error: 'Provide gameId and FEN string' });
  }

  const game = gameManager.getGame(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const ok = game.loadFen(fen);
  if (!ok) {
    return res.status(400).json({ error: 'Invalid FEN' });
  }

  const status = game.buildStatus();

  gameManager.broadcastUpdate(gameId, status);

  res.json({ ok: true, status });
};


// Reset the board
// POST /api/board/reset
// Body: { gameId }
exports.reset = (req, res) => {
  const { gameId } = req.body || {};

  const game = gameManager.getGame(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  game.reset();

  const status = game.buildStatus();

  gameManager.broadcastUpdate(gameId, status);

  res.json({ ok: true, status });
};


// Flip board (visual only)
// POST /api/board/flip
// Body: { gameId }
exports.flip = (req, res) => {
  const { gameId } = req.body || {};

  if (gameId === undefined) {
    return res.status(400).json({ error: 'Provide gameId' });
  }

  gameManager.broadcastRaw({
    type: 'flip',
    gameId
  });

  res.json({ ok: true });
};


// Select a square (UI highlight)
// POST /api/board/select
// Body: { gameId, key }
exports.select = (req, res) => {
  const { gameId, key } = req.body || {};

  if (gameId === undefined) {
    return res.status(400).json({ error: 'Provide gameId' });
  }

  gameManager.broadcastRaw({
    type: 'select',
    gameId,
    key: key ?? null
  });

  res.json({ ok: true });
};


// Get current board state
// GET /api/board/state?gameId=0
exports.state = (req, res) => {
  const gameId = req.query.gameId;

  const game = gameManager.getGame(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const status = game.buildStatus();

  res.json({
    ok: true,
    status
  });
};