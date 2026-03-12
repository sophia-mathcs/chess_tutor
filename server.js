const express = require('express');
const path = require('path');
const board_API_Routes = require('./src/routes/board_api_routes');
const engine_API_Routes = require('./src/routes/engine_api_routes');
const general_API_Routes = require('./src/routes/general_api_routes');
const engineService = require('./src/services/engine_service')

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/board', board_API_Routes);
app.use('/api/engine', engine_API_Routes);
app.use('/api/general', general_API_Routes);

engineService.connectStream()

app.listen(PORT, () => {
  console.log(`
    Chessground control API started

    Open in your browser:  http://localhost:${PORT}

    Example API calls from this machine (run in your terminal):

    # Make a move (e2 -> e4)
    curl -X POST http://localhost:${PORT}/api/board/move -H "Content-Type: application/json" -d '{"from":"e2","to":"e4"}'

    # Set a FEN position
    curl -X POST http://localhost:${PORT}/api/board/set-fen -H "Content-Type: application/json" -d '{"fen":"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR"}'

    # Select square e4
    curl -X POST http://localhost:${PORT}/api/board/select -H "Content-Type: application/json" -d '{"key":"e4"}'

    # Flip the board
    curl -X POST http://localhost:${PORT}/api/board/flip

    # Reset the board
    curl -X POST http://localhost:${PORT}/api/board/reset
`);
});