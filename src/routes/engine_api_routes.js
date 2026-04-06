const express = require('express')
const router = express.Router()
const engineController = require('../controllers/engine_controller')

// ================= EngineController ==================

// Start engine analysis
// POST /api/engine/start
router.post('/start', engineController.start)

// Stop engine analysis
// POST /api/engine/stop
router.post('/stop', engineController.stop)

// Set engine position without starting analysis
// POST /api/engine/set-position
router.post('/set-position', engineController.setPosition)

// Set search depth
// POST /api/engine/depth
// Body: { "depth": 10 }
router.post('/depth', engineController.depth)

// Set number of principal variations (MultiPV)
// POST /api/engine/multipv
// Body: { "value": 3 }
router.post('/multipv', engineController.multiPV)

// Set skill level (0-20)
// POST /api/engine/skill-level
// Body: { "level": 10 }
router.post('/skill-level', engineController.skillLevel)

// Stop current engine move calculation
// POST /api/engine/stop-move
router.post('/stop-move', engineController.stopMove)

// Request best move from engine
// GET /api/engine/best-move
router.get('/best-move', engineController.bestMove)

// Get current engine state (running, depth, PV, etc.)
// GET /api/engine/state
router.get('/state', engineController.state)

// Get engine info (name, version, options)
// GET /api/engine/info
router.get('/info', engineController.info)

module.exports = router