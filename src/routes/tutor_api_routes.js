const express = require('express')
const router = express.Router()
const tutorController = require('../controllers/tutor_controller')

// POST /api/tutor/enable
router.post('/enable', tutorController.enable)

// POST /api/tutor/disable
router.post('/disable', tutorController.disable)

// GET /api/tutor/state
router.get('/state', tutorController.state)

module.exports = router
