const { Chess } = require('chess.js');
const buildStatus = require('./status_builder');

class ChessGame {

  constructor() {
    this.game = new Chess();
    this.gameId = null;
  }

  buildStatus() {
    return buildStatus(this.game);
  }

  move(from, to) {
    return this.game.move({ from, to, promotion: 'q' });
  }

  reset() {
    this.game.reset();
    this.gameId = null;
  }

  loadFen(fen) {
    return this.game.load(fen);
  }

  getGame() {
    return this.game;
  }

  fen() {
    return this.game.fen();
  }

  turn() {
    return this.game.turn() === 'w' ? 'white' : 'black';
  }

  setGameId(id) {
    this.gameId = id;
  }

  getGameId() {
    return this.gameId;
  }

}

module.exports = ChessGame;