const express = require('express');
const path = require('path');
const board_API_Routes = require('./src/routes/board_api_routes');
const engine_API_Routes = require('./src/routes/engine_api_routes');
const clock_API_Routes = require('./src/routes/clock_api_routes');
const general_API_Routes = require('./src/routes/general_api_routes');
const playerbot_API_Routes = require('./src/routes/playerbot_api_routes');
const engineService = require('./src/services/engine_service');


const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/board', board_API_Routes);
app.use('/api/engine', engine_API_Routes);
app.use('/api/clock', clock_API_Routes);
app.use('/api/general', general_API_Routes);
app.use('/api/playerbot', playerbot_API_Routes);

engineService.connectStream()

app.listen(PORT, () => {
  console.log(`
    Chessground control API started

    Open in your browser:  http://localhost:${PORT}
`);
});