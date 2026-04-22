const TUTOR_URL = 'http://localhost:8002/tutor'

const state = { enabled: false, novice: false }

async function post(endpoint, body = {}) {
  const res = await fetch(`${TUTOR_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Tutor request failed: ${res.status}`)
  return res.json()
}

exports.enable    = () => { state.enabled = true }
exports.disable   = () => { state.enabled = false }
exports.setNovice = (val) => { state.novice = val }
exports.getState  = () => state

exports.analyze = (before_fen, after_fen, played_move) =>
  post('/analyze', { before_fen, after_fen, played_move, novice: state.novice })
