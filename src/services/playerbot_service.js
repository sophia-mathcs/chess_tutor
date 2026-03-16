const PLAYERBOT_URL = 'http://localhost:8001/playerbot'

let state = {
  running: false,
  elo: 800
}

// Generic POST request helper
async function post(endpoint, body = {}) {
  const res = await fetch(`${PLAYERBOT_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

// ---------- lifecycle ----------
exports.start = (elo = 800) => {
  state.elo = elo
  return post('/start', { elo })
}

exports.quit = () => post('/stop')

// ---------- move request ----------
exports.getMove = (fen, whiteTime = 0, blackTime = 0) => {
  return post('/get-move', { fen, whiteTime, blackTime })
}
