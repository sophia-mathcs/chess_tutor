const gameManager = require('../game/game_manager');

// Make a move
// POST /api/boardmove
// Body: { gameId, playerId, from, to }
exports.move = (req, res) => {

  const { gameId, playerId, from, to } = req.body || {};

  if (gameId === undefined || !playerId || !from || !to) {
    return res.status(400).json({
      error: 'Provide { "gameId": ..., "playerId": "...", "from": "...", "to": "..." }'
    });
  }

  const game = gameManager.getGame(gameId);

  if (!game) {
    return res.status(404).json({
      error: 'Game not found'
    });
  }

  // Determine which color this player controls
  const result = gameManager.makeMove(playerId, from, to);

  if (!result) {
    return res.status(400).json({
      error: 'Illegal move'
    });
  }

  res.json({
    ok: true,
    move: { from, to },
    status: result.status
  });

};