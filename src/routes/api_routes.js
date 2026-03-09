const express = require('express');

const moveController = require('../controllers/move_controller');
const boardController = require('../controllers/board_controller');
const streamController = require('../controllers/stream_controller');

const router = express.Router();


// ==========================================
// ========== Public API endpoints ==========
// ==========================================

// ========== Index page ====================
router.post('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== moveController ================
// Make a move: POST /api/move   body: { "from": "e2", "to": "e4" }
router.post('/move', moveController.move);


// ========== boardController ===============
// Set board FEN: POST /api/set-fen   body: { "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR" }
router.post('/set-fen', boardController.setFen);

// Reset to starting position: POST /api/reset
router.post('/reset', boardController.reset);

// Flip board orientation: POST /api/flip
router.post('/flip', boardController.flip);

// Select a square: POST /api/select   body: { "key": "e4" } or { "key": null } to clear selection
router.post('/select', boardController.select);

// Get current game status (FEN, side to move, game over flags, etc.)
router.get('/state', boardController.state);

// The board page receives commands via SSE
router.get('/stream', streamController.stream);

module.exports = router;



