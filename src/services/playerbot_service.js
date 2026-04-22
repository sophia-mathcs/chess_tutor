const PLAYERBOT_URL = 'http://localhost:8001/playerbot'

let state = {
  running: false,
  elo: 800,
  bot_type: 'human_bot_trained'
}

// Generic POST helper
async function post(endpoint, body = {}) {

  const res = await fetch(`${PLAYERBOT_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    throw new Error(`PlayerBot request failed: ${res.status}`)
  }

  return res.json()
}


// ---------- lifecycle ----------

exports.start = async (bot_color = "w", elo = 800, bot_type = "human_bot_trained") => {

  const data = await post('/start', { bot_color, elo, bot_type })

  state.running = true
  state.elo = elo
  state.bot_type = bot_type

  return data
}


exports.quit = async () => {

  const data = await post('/stop')

  state.running = false

  return data
}


// ---------- status ----------

exports.status = () => {
  return {
    running: state.running,
    elo: state.elo,
    bot_type: state.bot_type
  }
}