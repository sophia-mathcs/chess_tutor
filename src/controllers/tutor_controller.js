const tutorService = require('../services/tutor_service')

// POST /api/tutor/enable
exports.enable = (req, res) => {
  tutorService.enable()
  res.json({ ok: true, tutor: tutorService.getState() })
}

// POST /api/tutor/disable
exports.disable = (req, res) => {
  tutorService.disable()
  res.json({ ok: true, tutor: tutorService.getState() })
}

// GET /api/tutor/state
exports.state = (req, res) => {
  res.json({ ok: true, tutor: tutorService.getState() })
}

// POST /api/tutor/novice
exports.novice = (req, res) => {
  tutorService.setNovice(!!req.body.novice)
  res.json({ ok: true, tutor: tutorService.getState() })
}

// POST /api/tutor/followup
exports.followup = async (req, res) => {
  try {
    const { question } = req.body
    if (!question) return res.status(400).json({ ok: false, error: 'question required' })
    const result = await tutorService.followup(question)
    res.json({ ok: true, explanation: result.explanation })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
