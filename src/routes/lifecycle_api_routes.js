const express = require('express');
const router = express.Router();

const gameManager = require('../game/game_manager');


/*
Create a new game
POST /api/lifecycle/create-game
Body: {}
Returns a new gameId
*/
router.post('/create-game', (req, res) => {

  try {

    const gameId = gameManager.createGame();

    res.json({
      ok: true,
      gameId
    });
    
    const { mode } = req.body || {};
    gameManager.setMode(mode);

  } catch (err) {

    res.status(500).json({
      error: 'Failed to create game'
    });

  }

});



/*
Destroy a game
POST /api/lifecycle/destroy-game
Body: { "gameId": "..." }
Removes the game and all associated players
*/
router.post('/destroy-game', (req, res) => {

  const { gameId } = req.body || {};

  if (!gameId) {
    return res.status(400).json({
      error: 'Provide { "gameId": "..." }'
    });
  }

  try {

    gameManager.destroyGame(gameId);

    res.json({
      ok: true
    });

  } catch (err) {

    res.status(500).json({
      error: 'Failed to destroy game'
    });

  }

});


/*
Assign a player to a color
POST /api/lifecycle/assign-player
Body: { "gameId": "...", "color": "white|black" }
Returns a playerId for the assigned player
*/
router.post('/assign-player', (req, res) => {

  const { gameId, color } = req.body || {};

  if (!gameId || !color) {
    return res.status(400).json({
      error: 'Provide { "gameId": "...", "color": "white|black" }'
    });
  }

  if (color !== 'white' && color !== 'black') {
    return res.status(400).json({
      error: 'Color must be "white" or "black"'
    });
  }

  try {

    const playerId = gameManager.assignPlayer(gameId, color);

    res.json({
      ok: true,
      gameId,
      playerId,
      color
    });

  } catch (err) {

    res.status(400).json({
      error: err.message
    });

  }

});


/*
Remove a player from a game
POST /api/lifecycle/remove-player
Body: { "playerId": "..." }
Removes the player from the game
*/
router.post('/remove-player', (req, res) => {

  const { playerId } = req.body || {};

  if (!playerId) {
    return res.status(400).json({
      error: 'Provide { "playerId": "..." }'
    });
  }

  try {

    gameManager.removePlayer(playerId);

    res.json({
      ok: true
    });

  } catch (err) {

    res.status(500).json({
      error: 'Failed to remove player'
    });

  }

});


module.exports = router;