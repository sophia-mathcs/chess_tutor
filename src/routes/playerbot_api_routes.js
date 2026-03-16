const express = require('express')
const router = express.Router()
const playerbotService = require('./playerbot_service')

// ================= PlayerBotController ==================

// Start playerbot session
// POST /api/playerbot/start
router.post('/start', async (req, res) => {
  try {
    const { elo } = req.body
    const data = await playerbotService.start(elo)
    res.json({ ok: true, data })
  } catch (err) {
    console.error('PlayerBot start error:', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Stop playerbot session
// POST /api/playerbot/stop
router.post('/stop', async (req, res) => {
  try {
    const data = await playerbotService.quit()
    res.json({ ok: true, data })
  } catch (err) {
    console.error('PlayerBot stop error:', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Request a move from the playerbot
// POST /api/playerbot/get-move
router.post('/get-move', async (req, res) => {
  try {
    const { fen, whiteTime, blackTime } = req.body
    const move = await playerbotService.getMove(fen, whiteTime, blackTime)
    res.json({ ok: true, move })
  } catch (err) {
    console.error('PlayerBot get-move error:', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router