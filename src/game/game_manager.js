const { v4: uuidv4 } = require('uuid');

const ChessGame = require('./chess_game');
const buildStatus = require('./status_builder');

const sse = require('../services/sse_service');
const engineService = require('../services/engine_service');

class GameManager {

  constructor() {

    this.games = new Map();
    // gameId: game

    this.players = new Map();
    // playerId: { gameId, color }

    this.modes = new Map();
    // gameId: mode

  }

  buildStatus(gameId) {
    const game = this.games.get(gameId);

    return buildStatus(game);
  }

  getGame(gameId) {

    const game = this.games.get(gameId);

    return game;
  }

  createGame(mode) {

    const gameId = uuidv4();

    const game = new ChessGame();

    this.games.set(gameId, game);

    this.modes.set(gameId, mode)

    return gameId;
  }

  destroyGame(gameId) {

    const game = this.games.get(gameId);

    if (!game) return;

    const players = this.players(gameId);

    if (players.white) this.players.delete(players.white);
    if (players.black) this.players.delete(players.black);

    this.games.delete(gameId);

  }

  assignPlayer(gameId, color) {

    const game = this.games.get(gameId);

    if (!game) throw new Error("Game does not exist");

    const playerId = uuidv4();

    this.players.set(playerId, {
      gameId,
      color
    });

    return playerId;
  }

  removePlayer(playerId) {

    this.players.delete(playerId);

  }

  getGameFromPlayer(playerId) {

    const player = this.players.get(playerId);

    if (!player) return null;

    return this.games.get(player.gameId);
  }

  getGameMode(gameId) {

    return this.modes.get(gameId);

  }

  makeMove(playerId, from, to) {

    const player = this.players.get(playerId);

    if (!player) return null;

    const { gameId, color } = player;

    const game = this.games.get(gameId);

    if (!game) return null;

    const chess = game.getGame();

    if (chess.isGameOver()) return null;

    if (game.turn() !== color) return null;

    const result = game.move(from, to);

    if (!result) return null;

    const status = buildStatus(chess);

    const fen = status.fen;

    engineService.setPosition(fen);

    if (engineService.getState().running) {
      engineService.startAnalysis(fen);
    }

    sse.broadcast({
      type: 'setFen',
      fen: status.fen,
      status,
    });

    return {
      ok: true,
      move: result,
      status
    };

  }

}

module.exports = new GameManager();