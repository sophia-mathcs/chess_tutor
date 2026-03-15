const express = require('express');
const router = express.Router();

// Import controllers
const moveController = require('../controllers/move_controller');
const boardController = require('../controllers/board_controller');

// ==========================================
// ========== Public API endpoints ==========
// ==========================================


// ================= MoveController ==================
// Make a move
// POST /api/board/move
// Body: { "from": "e2", "to": "e4" }
// The controller validates and applies the move, then broadcasts the new state
router.post('/move', moveController.move);

// ================= BoardController ==================
// Set the board to a specific FEN
// POST /api/board/set-fen
// Body: { "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR" }
// Updates the chess game and broadcasts the new state
router.post('/set-fen', boardController.setFen);

// Select a square on the board
// POST /api/board/select
// Body: { "key": "e4" } or { "key": null } to clear selection
// Broadcasts the selection to all connected clients
router.post('/select', boardController.select);

// Flip board orientation
// POST /api/board/flip
// No body required
// Broadcasts a flip command to all clients
router.post('/flip', boardController.flip);

// Reset the board to starting position
// POST /api/board/reset
// No body required
// Resets the game and broadcasts the new state
router.post('/reset', boardController.reset);

// Get current game state
// GET /api/board/state
// Returns the full game status including FEN, turn, and game-over flags
router.get('/state', boardController.state);


module.exports = router;



