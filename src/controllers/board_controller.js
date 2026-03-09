const chessGame = require('../game/chess_game');
const buildStatus = require('../game/status_builder');
const sse = require('../services/sse_service');

exports.setFen = (req, res) => {
  const { fen } = req.body || {};

  if (!fen) {
    return res.status(400).json({ error: 'Provide a FEN string' });
  }

  const ok = chessGame.loadFen(fen);

  if (!ok) {
    return res.status(400).json({ error: 'Invalid FEN' });
  }

  const game = chessGame.getGame();
  const status = buildStatus(game);

  sse.broadcast({
    type: 'setFen',
    fen: status.fen,
    status,
  });

  res.json({ ok: true, status });
};

exports.reset = (req, res) => {
  chessGame.reset();

  const game = chessGame.getGame();
  const status = buildStatus(game);

  sse.broadcast({
    type: 'setFen',
    fen: status.fen,
    status,
  });

  res.json({ ok: true, status });
};

exports.flip = (req, res) => {
  sse.broadcast({ type: 'flip' });
  res.json({ ok: true });
};

exports.select = (req, res) => {
  const { key } = req.body || {};

  sse.broadcast({
    type: 'select',
    key: key ?? null,
  });

  res.json({ ok: true });
};

exports.state = (req, res) => {
  const game = chessGame.getGame();

  res.json({
    ok: true,
    status: buildStatus(game),
  });
};