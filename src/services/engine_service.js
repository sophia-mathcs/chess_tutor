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
let running = false

exports.connectStream = async () => {

  if (running) return
  running = true

  while (running) {

    try {

      console.log("Connecting to Python engine stream...")

      const res = await fetch('http://localhost:8000/engine/stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ""

      while (true) {

        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split("\n\n")

        buffer = parts.pop()

        for (const part of parts) {

          const line = part.trim()

          if (!line.startsWith("data:")) continue

          const json = line.slice(5).trim()

          try {

            const data = JSON.parse(json)

            sse.broadcast(data)

          } catch (err) {

            console.warn("Bad engine stream message", json)

          }

        }

      }

    } catch (err) {

      console.log("Engine stream disconnected:", err.message)

    }

    console.log("Reconnecting to engine stream in 2s...")
    await new Promise(r => setTimeout(r, 2000))

  }
}
