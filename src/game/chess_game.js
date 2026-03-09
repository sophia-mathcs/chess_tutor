const { Chess } = require('chess.js');

class ChessGame {
  constructor() {
    this.game = new Chess();
  }

  move(from, to) {
    return this.game.move({ from, to, promotion: 'q' });
  }

  reset() {
    this.game.reset();
  }

  loadFen(fen) {
    return this.game.load(fen);
  }

  getGame() {
    return this.game;
  }
}

module.exports = new ChessGame();