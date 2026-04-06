const engineService = require('../services/engine_service')
const chessGame = require('../game/chess_game')
const sse = require('../services/sse_service')

// ================= EngineController ==================

// Start engine analysis on the current game position
// POST /api/engine/start
exports.start = (req, res) => {
  const fen = chessGame.getGame().fen()
  engineService.startAnalysis(fen)
  sse.broadcast({ type: 'engineStart', fen })
  res.json({ ok: true })
}

// Stop engine analysis
// POST /api/engine/stop
exports.stop = (req, res) => {
  engineService.stopAnalysis()
  sse.broadcast({ type: 'engineStop' })
  res.json({ ok: true })
}

// Set engine position without starting analysis
// POST /api/engine/set-position
exports.setPosition = (req, res) => {
  const fen = chessGame.getGame().fen()
  engineService.setPosition(fen)
  res.json({ ok: true })
}

// Set search depth
// POST /api/engine/depth
// Body: { "depth": 10 }
exports.depth = (req, res) => {
  const { depth } = req.body || {}
  if (depth === undefined) return res.status(400).json({ error: 'Provide depth' })
  engineService.setDepth(depth)
  res.json({ ok: true })
}

// Set number of principal variations (MultiPV)
// POST /api/engine/multipv
// Body: { "value": 3 }
exports.multiPV = (req, res) => {
  const { value } = req.body || {}
  if (value === undefined) return res.status(400).json({ error: 'Provide MultiPV value' })
  engineService.setMultiPV(value)
  res.json({ ok: true })
}

// Set skill level (0-20)
// POST /api/engine/skill-level
// Body: { "level": 10 }
exports.skillLevel = (req, res) => {
  const { level } = req.body || {}
  if (level === undefined) return res.status(400).json({ error: 'Provide skill level' })
  engineService.setSkillLevel(level)
  res.json({ ok: true })
}

// Stop current engine move calculation without resetting engine
// POST /api/engine/stop-move
exports.stopMove = (req, res) => {
  engineService.stopCurrentMove()
  res.json({ ok: true })
}

// Request best move from engine
// GET /api/engine/best-move
exports.bestMove = async (req, res) => {
  const result = await engineService.getBestMove()
  res.json({ ok: true, result })
}

// Get current engine state (running, depth, PV, etc.)
// GET /api/engine/state
exports.state = (req, res) => {
  const engineState = engineService.getState()
  res.json({ ok: true, engine: engineState })
}

// Get engine info (name, version, options)
// GET /api/engine/info
exports.info = (req, res) => {
  try {
    const engineStatus = engineService.getInfo ? engineService.getInfo() : {
      name: 'Unknown Engine',
      version: 'n/a',
      options: {}
    }
    res.json({ ok: true, info: engineStatus })
  } catch (err) {
    console.error('Engine info error:', err)
    res.status(500).json({ ok: false, error: 'Failed to retrieve engine info' })
  }
}
