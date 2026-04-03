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

  if (game.isGameOver()) {
    return res.status(400).json({
      error: 'Game is already over',
      status: buildStatus(game),
    });
  }

  const before_fen = game.fen()

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

  res.json({
    ok: true,
    move: { from, to },
    status,
  });

  if (tutorService.getState().enabled) {
    const after_fen   = status.fen
    const played_move = from + to + (result.promotion || '')
    ;(async () => {
      try {
        const data = await tutorService.analyze(before_fen, after_fen, played_move)
        sse.broadcast({ type: 'tutorUpdate', explanation: data.explanation })
      } catch (err) {
        console.error('Tutor analysis failed:', err.message)
      }
    })()
  }
};