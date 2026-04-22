const express = require('express');
const router = express.Router();

const streamController = require('../controllers/stream_controller');

// ==========================================
// ========== Public API endpoints ==========
// ==========================================


// ========== Index page ====================
router.post('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== Streaming ================
// The board page receives commands via SSE
router.get('/stream', streamController.stream);

module.exports = router;