function buildStatus(game) {
  const moves = game.moves({ verbose: true });

  const dests = {};

  for (const m of moves) {
    if (!dests[m.from]) dests[m.from] = [];
    dests[m.from].push(m.to);
  }

  return {
    fen: game.fen(),
    turn: game.turn() === 'w' ? 'white' : 'black',
    inCheck: game.inCheck(),
    isCheckmate: game.isCheckmate(),
    isDraw: game.isDraw(),
    isStalemate: game.isStalemate(),
    isThreefoldRepetition: game.isThreefoldRepetition(),
    isInsufficientMaterial: game.isInsufficientMaterial(),
    isGameOver: game.isGameOver(),
    dests,
  };
}

module.exports = buildStatus;