const chessGame = require('../game/chess_game');
const buildStatus = require('../game/status_builder');
const sse = require('../services/sse_service');

exports.move = (req, res) => {
  const { from, to } = req.body || {};

  if (!from || !to) {
    return res.status(400).json({
      error: 'Provide { "from": "...", "to": "..." }',
    });
  }

  const game = chessGame.getGame();

  if (game.isGameOver()) {
    return res.status(400).json({
      error: 'Game is already over',
      status: buildStatus(game),
    });
  }

  const result = chessGame.move(from, to);

  if (!result) {
    return res.status(400).json({
      error: 'Illegal move',
    });
  }

  const status = buildStatus(game);

  sse.broadcast({
    type: 'setFen',
    fen: status.fen,
    status,
  });

  res.json({
    ok: true,
    move: { from, to },
    status,
  });
};