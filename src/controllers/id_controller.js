// controllers/createPlayerIds.js

const { v4: uuidv4 } = require("uuid")
const registry = require("../game/player_registry")

function createPlayerIds(req, res) {

  const { gameId, colors } = req.body

  if (!gameId || !Array.isArray(colors)) {
    return res.status(400).json({ error: "invalid request" })
  }

  registry.createGameEntry(gameId)

  const myIds = {}

  for (const color of colors) {

    if (color !== "white" && color !== "black") {
      continue
    }

    const id = uuidv4()

    registry.assignColor(gameId, color, id)

    myIds[color] = id
  }

  res.json({
    gameId,
    playerIds: myIds
  })
}

module.exports = createPlayerIds