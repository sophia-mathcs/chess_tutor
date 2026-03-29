// game/player_registry.js

const gameRegistry = new Map()
const playerIndex = new Map()

/*
=== gameRegistry structure ===
gameId: {
  white: playerId | null,
  black: playerId | null
}

=== playerIndex structure ===
playerId: {
  gameId,
  color
}
*/

function createGameEntry(gameId) {

  if (!gameRegistry.has(gameId)) {

    gameRegistry.set(gameId, {
      white: null,
      black: null
    })

  }

}

function gameExists(gameId) {
  return gameRegistry.has(gameId)
}

function getGame(gameId) {
  return gameRegistry.get(gameId)
}

function assignPlayer(gameId, color, playerId) {

  const game = gameRegistry.get(gameId)

  if (!game) {
    throw new Error("Game does not exist")
  }

  if (color !== "white" && color !== "black") {
    throw new Error("Invalid color")
  }

  game[color] = playerId

  playerIndex.set(playerId, {
    gameId,
    color
  })

}

function removePlayer(playerId) {

  const entry = playerIndex.get(playerId)

  if (!entry) return

  const { gameId, color } = entry

  const game = gameRegistry.get(gameId)

  if (game) {
    game[color] = null
  }

  playerIndex.delete(playerId)

}

function destroyGame(gameId) {

  const game = gameRegistry.get(gameId)

  if (!game) return

  if (game.white) {
    playerIndex.delete(game.white)
  }

  if (game.black) {
    playerIndex.delete(game.black)
  }

  gameRegistry.delete(gameId)

}

function getPlayer(playerId) {
  return playerIndex.get(playerId)
}

module.exports = {
  createGameEntry,
  gameExists,
  getGame,
  assignPlayer,
  removePlayer,
  destroyGame,
  getPlayer
}