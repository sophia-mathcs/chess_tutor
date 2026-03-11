const sse = require('./sse_service')

const ENGINE_URL = 'http://localhost:8000/engine'

let state = {
  depth: 15,
  multipv: 1,
  running: false
}

async function post(endpoint, body = {}) {

  const res = await fetch(`${ENGINE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  return res.json()
}

async function get(endpoint) {

  const res = await fetch(`${ENGINE_URL}${endpoint}`)
  return res.json()
}


// ---------- lifecycle ----------

exports.init = () => post('/init')

exports.quit = () => post('/quit')


// ---------- analysis ----------

exports.startAnalysis = (fen) => {

  state.running = true

  return post('/start', { fen })
}

exports.stopAnalysis = async () => {

  state.running = false
  
  await post('/stop')

  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }

}

exports.stopCurrentMove = () => post('/stop-move')


// ---------- position ----------

exports.setPosition = (fen) => post('/set-position', { fen })


// ---------- configuration ----------

exports.setDepth = (depth) => {

  state.depth = depth

  return post('/depth', { depth })
}

exports.setMultiPV = (value) => {

  state.multipv = value

  return post('/multipv', { value })
}

exports.setSkillLevel = (level) => post('/skill-level', { level })


// ---------- queries ----------

exports.getBestMove = () => get('/best-move')

exports.getState = () => state

exports.getInfo = () => get('/info')



// ---------- real-time updates ----------
let lastHash = ''

pollInterval = setInterval(async () => {

  const updates = await get('/updates')

  const hash = JSON.stringify(updates.lines)

  if (updates.lines.length > 0 && hash !== lastHash) {

    lastHash = hash

    sse.broadcast({
      type: 'engineUpdate',
      lines: updates.lines
    })

  }

}, 200)
