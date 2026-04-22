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
