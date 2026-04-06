const express = require('express');
const router = express.Router();

// Import controllers
const clockController = require('../controllers/clock_controller');

// ================= Clock Controller ==================

// Start the clock timers
// POST /api/board/start
router.post('/start', clockController.start);

// Stop the clock timers
// POST /api/board/stop
router.post('/stop', clockController.stop);

// Reset the clock times to initial values
// POST /api/board/reset
// Body: { time: <seconds>, startingTurn: 'white' | 'black' }
// Example: { "time": 300, "startingTurn": "white" }
router.post('/reset', clockController.reset);

// Switch turn (for clock purposes)
// POST /api/board/switch-turn
router.post('/switch-turn', clockController.switchTurn);

// Get current clock state
// GET /api/clock/state
// Returns current times, running turn, and serverTime
router.get('/state', clockController.state);

module.exports = router;