const express = require('express');
const path = require('path');
const apiRoutes = require('./src/routes/api_routes');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`
    Chessground control API started

    Open in your browser:  http://localhost:${PORT}

    Example API calls from this machine (run in your terminal):

    # Make a move (e2 -> e4)
    curl -X POST http://localhost:${PORT}/api/move -H "Content-Type: application/json" -d '{"from":"e2","to":"e4"}'

    # Set a FEN position
    curl -X POST http://localhost:${PORT}/api/set-fen -H "Content-Type: application/json" -d '{"fen":"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR"}'

    # Select square e4
    curl -X POST http://localhost:${PORT}/api/select -H "Content-Type: application/json" -d '{"key":"e4"}'

    # Flip the board
    curl -X POST http://localhost:${PORT}/api/flip

    # Reset the board
    curl -X POST http://localhost:${PORT}/api/reset
`);
});