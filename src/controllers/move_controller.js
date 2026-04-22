const chessGame = require('../game/chess_game');
const buildStatus = require('../game/status_builder');
const sse = require('../services/sse_service');
const engineService = require('../services/engine_service')
const tutorService = require('../services/tutor_service')

exports.move = async (req, res) => {
  const { from, to } = req.body || {};
  const retrievalChoices = req.body.retrieval_top_choices || [];

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

  let result = null
  try {
    result = chessGame.move(from, to);
  } catch (err) {
    console.warn('Move apply failed:', err.message)
    result = null
  }

  if (!result) {
    return res.status(400).json({
      error: 'Illegal move',
    });
  }

  const status = buildStatus(game);

  // If the engine is running, update its position to the new game state
  const fen = status.fen

  try {
    await engineService.setPosition(fen)
    if (engineService.getState().running) {
      await engineService.startAnalysis(fen)
    }
  } catch (err) {
    // Keep move flow alive even if external engine backend is unavailable.
    console.warn('Engine sync failed:', err.message)
  }

  sse.broadcast({
    type: 'setFen',
    fen: status.fen,
    status,
    source: req.body.source || 'player',
    retrievalTopChoices: retrievalChoices,
  });
  if (retrievalChoices.length) {
    console.log('Broadcast retrievalTopChoices:', retrievalChoices.length);
  }

  res.json({
    ok: true,
    move: { from, to },
    status,
  });

  if (tutorService.getState().enabled && req.body.source !== 'bot') {
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