const express = require('express')
const router = express.Router()

const playerbotService = require('../services/playerbot_service')


// ================= PlayerBotController ==================


// Start playerbot session
// POST /api/playerbot/start
router.post('/start', async (req, res) => {
  try {
    const { bot_color, elo } = req.body
    const data = await playerbotService.start(bot_color, elo)

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

    res.json({
      ok: true,
      data
    })

  } catch (err) {

    console.error('PlayerBot stop error:', err)

    res.status(500).json({
      ok: false,
      error: err.message
    })
  }

})


// Get bot status
// GET /api/playerbot/status
router.get('/status', (req, res) => {

  res.json({
    ok: true,
    data: playerbotService.status()
  })

})


module.exports = router