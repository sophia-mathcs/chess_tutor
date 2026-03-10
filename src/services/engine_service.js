const path = require('path')
const { Worker } = require('worker_threads')
const sse = require('./sse_service')

let engine = null

let state = {
  running: false,
  depth: 15,
  multipv: 1,
  skill: 20,
  lastEval: null,
  bestMove: null,
  pv: [],
  engineName: 'Stockfish'
}

function getEngine() {

  if (!engine) {

    const enginePath = path.join(
      __dirname,
      '../../engines/stockfish-18-lite-single/stockfish-18-lite-single.js'
    )

    engine = new Worker(enginePath)

    engine.on('message', handleEngineMessage)

    engine.postMessage('uci')
    engine.postMessage('isready')
  }

  return engine
}

function handleEngineMessage(line) {

  if (typeof line !== 'string') return

  // -------- evaluation + PV --------

  if (line.includes('score cp')) {

    const evalMatch = line.match(/score cp (-?\d+)/)
    const depthMatch = line.match(/depth (\d+)/)
    const pvMatch = line.match(/ pv (.+)/)

    if (evalMatch) state.lastEval = parseInt(evalMatch[1])
    if (depthMatch) state.depth = parseInt(depthMatch[1])

    if (pvMatch) {
      state.pv = pvMatch[1].split(' ')
    }

    sse.broadcast({
      type: 'engineUpdate',
      evalScore: state.lastEval,
      depth: state.depth,
      pv: state.pv
    })
  }

  // -------- best move --------

  if (line.includes('bestmove')) {

    const match = line.match(/bestmove (\S+)/)

    if (match) {

      state.bestMove = match[1]

      sse.broadcast({
        type: 'engineBestMove',
        move: state.bestMove
      })
    }
  }
}

exports.startAnalysis = (fen) => {

  const e = getEngine()

  e.postMessage('ucinewgame')
  e.postMessage(`position fen ${fen}`)
  e.postMessage(`go depth ${state.depth}`)

  state.running = true
}

exports.stopAnalysis = () => {

  if (!engine) return

  engine.postMessage('stop')

  state.running = false
}

exports.stopCurrentMove = () => {

  if (!engine) return

  engine.postMessage('stop')
}

exports.setPosition = (fen) => {

  const e = getEngine()

  e.postMessage(`position fen ${fen}`)
}

exports.setDepth = (depth) => {

  state.depth = depth
}

exports.setMultiPV = (value) => {

  const e = getEngine()

  state.multipv = value

  e.postMessage(`setoption name MultiPV value ${value}`)
}

exports.setSkillLevel = (level) => {

  const e = getEngine()

  state.skill = level

  e.postMessage(`setoption name Skill Level value ${level}`)
}

exports.getBestMove = (fen) => {

  return new Promise(resolve => {

    const e = getEngine()

    e.postMessage(`position fen ${fen}`)
    e.postMessage(`go depth ${state.depth}`)

    setTimeout(() => {

      resolve({
        bestMove: state.bestMove,
        eval: state.lastEval,
        pv: state.pv
      })

    }, 500)

  })
}

exports.getState = () => state

exports.getInfo = () => ({
  name: state.engineName,
  depth: state.depth,
  multipv: state.multipv,
  skill: state.skill
})