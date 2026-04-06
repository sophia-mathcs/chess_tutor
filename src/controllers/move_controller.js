const chessGame = require('../game/chess_game');
const buildStatus = require('../game/status_builder');
const sse = require('../services/sse_service');
const engineService = require('../services/engine_service')
const tutorService = require('../services/tutor_service')

exports.move = (req, res) => {
  const { from, to } = req.body || {};

  if (!from || !to) {
    return res.status(400).json({
      error: 'Provide { "from": "...", "to": "..." }',
    });
  }

  const game = chessGame.getGame();
  const beforeFen = game.fen()

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

  // If the engine is running, update its position to the new game state
  const fen = status.fen

  engineService.setPosition(fen)

  if (engineService.getState().running) {
    engineService.startAnalysis(fen)
  }

  sse.broadcast({
    type: 'setFen',
    fen: status.fen,
    status,
  });

  // Async tutor analysis should not block move response.
  const playedMove = `${from}${to}`
  tutorService.analyze(beforeFen, status.fen, playedMove)
    .then((result) => {
      if (result && result.explanation) {
        sse.broadcast({
          type: 'tutorHint',
          explanation: result.explanation
        })
      }
    })
    .catch((err) => {
      console.warn('Tutor analyze skipped:', err.message)
    })

  res.json({
    ok: true,
    move: { from, to },
    status,
  });
};