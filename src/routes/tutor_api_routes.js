const express = require('express')
const router = express.Router()

const tutorService = require('../services/tutor_service')

router.post('/analyze', async (req, res) => {
  try {
    const { before_fen, after_fen, played_move } = req.body || {}
    const data = await tutorService.analyze(before_fen, after_fen, played_move)
    res.json({ ok: true, data })
  } catch (err) {
    console.error('Tutor analyze error:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router

