const TUTOR_URL = 'http://localhost:8002/tutor'

async function post(endpoint, body = {}) {
  const res = await fetch(`${TUTOR_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    throw new Error(`Tutor request failed: ${res.status}`)
  }

  return res.json()
}

exports.analyze = async (before_fen, after_fen, played_move) => {
  return post('/analyze', { before_fen, after_fen, played_move })
}

exports.quit = async () => {
  return post('/quit')
}

