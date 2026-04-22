const { Chess } = require('chess.js');

class ChessGame {
  constructor() {
    this.game = new Chess();
  }

  move(from, to) {
    try {
      return this.game.move({ from, to, promotion: 'q' });
    } catch (err) {
      // chess.js throws on invalid/duplicate moves; return null instead
      // so API handlers can respond with 400 without crashing Node.
      return null;
    }
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