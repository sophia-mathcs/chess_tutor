// main.js
// This file orchestrates the entire chessboard UI, engine, clock, and user interactions.


// Import application state object
import { state } from './state.js';

// Import DOM references
import { 
    initDOMRefs,
    boardEl,
    statusEl,
    fenDisplay,
    evalFill,
    engineDepthEl,
    engineEvalEl,
    engineBestMoveEl,
    enginePvEl,
    whiteClockEl,
    blackClockEl,
    eloSelect,
    colorSelect,
    newGameBtn,
    clockSelect,
    engineToggle,
    playerbotToggle,
    tutorToggle,
    flipBtn,
    evalBar
} from './domRefs.js';

import { clearTutorPanel, setEnabled as setTutorEnabled } from './tutor.js';

// Initialize DOM references (if any setup needed)
initDOMRefs();

// --------------------------- CLOCK MODULE ---------------------------
// Import clock helpers
import { 
    renderClock, 
    syncClockState, 
    resetClock 
} from './clock.js';

// Sync the clock state with server, then start rendering loop
syncClockState().then(() => {
    renderClock(); // This starts the continuous clock rendering loop
});

// --------------------------- BOARD MODULE ---------------------------
// Import board functions
import { 
    createBoard,
    applyStatus,
    flipClocks,
    updateEvalBar,
    updateStatusText,
    drawBestMove
} from './board.js';

// Initialize Chessground board instance
createBoard(boardEl); 

// --------------------------- PLAYERS MODULE ---------------------------
// Import user move handler
import { onUserMove } from './players.js';

// --------------------------- SSE MODULE ---------------------------
// Import server-sent events connection handler
import { connect } from './sse.js';

// --------------------------- INITIAL STATE ---------------------------
// Load the initial board state from the server
async function loadInitialState() {
    try {
        const res = await fetch('/api/board/state');
        const data = await res.json();
        if (data && data.status) {
            // Apply initial status to board and UI
            applyStatus(data.status);
        }
    } catch (err) {
        console.warn('Failed to load initial state', err);
    }
}

// --------------------------- ENGINE TOGGLE ---------------------------
// Handler for enabling/disabling the engine
engineToggle.addEventListener("change", async () => {
    if (engineToggle.checked) {
        // Show evaluation UI and reset engine info
        evalBar.classList.remove("hidden");
        enginePvEl.textContent = "Analyzing...";
        engineEvalEl.textContent = "-";
        engineBestMoveEl.textContent = "-";
        engineDepthEl.textContent = "-";

        // Start the engine with current FEN
        await fetch('/api/engine/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fen: state.lastBoardStatus.fen })
        });


        console.log('Engine activated');

    } else {
        // Hide eval UI and reset engine info
        evalBar.classList.add("hidden");
        enginePvEl.textContent = "-";
        engineEvalEl.textContent = "-";
        engineBestMoveEl.textContent = "-";
        engineDepthEl.textContent = "-";

        // Remove board arrows
        state.ground.set({ drawable: { autoShapes: [] } });

        // Stop engine server-side
        await fetch('/api/engine/stop', { method: 'POST' });


        console.log('Engine deactivated');
    }
});

// --------------------------- SELECT ELO ---------------------------
// Handler for choosing the opposition bot rating
let elo = 800; // default value

eloSelect.addEventListener("change", (e) => {
  const val = parseInt(e.target.value, 10);

  if (!Number.isNaN(val)) {
    elo = val;
  }
});

// --------------------------- PLAYERBOT TOGGLE ---------------------------
// Handler for enabling/disabling theplayerbot
playerbotToggle.addEventListener("change", async () => {
    if (playerbotToggle.checked) {
        // Start the engine with current FEN
        const color = colorSelect.value === 'white' ? 'b': 'w';
        await fetch('/api/playerbot/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bot_color: color, elo: elo })
        });

        console.log('Playerbot activated, elo:', elo);

    } else {
        // Stop engine server-side
        await fetch('/api/playerbot/stop', { method: 'POST' });

        console.log('Playerbot deactivated');
    }
});




// --------------------------- TUTOR TOGGLE ---------------------------
tutorToggle.addEventListener("change", async () => {
    const badge = document.getElementById('tutor-status')
    if (tutorToggle.checked) {
        await fetch('/api/tutor/enable', { method: 'POST' })
        setTutorEnabled(true)
        badge.textContent = 'On'
        badge.className = 'tutor-badge tutor-on'
        document.getElementById('hint-text').textContent = 'Tutor active. Make a move to get feedback.'
        console.log('Tutor activated')
    } else {
        await fetch('/api/tutor/disable', { method: 'POST' })
        setTutorEnabled(false)
        badge.textContent = 'Off'
        badge.className = 'tutor-badge tutor-off'
        clearTutorPanel()
        console.log('Tutor deactivated')
    }
})


// --------------------------- FLIP BOARD ---------------------------
// Handler for flipping board orientation
flipBtn.addEventListener("click", async () => {
    // Call backend flip API
    const res = await fetch('/api/board/flip', { method: 'POST' });
    const data = await res.json();

    if (!data.ok) {
        console.warn('Flip failed, no status returned');
        return;
    }

    // Flip clocks visually
    flipClocks();

    console.log('Board flipped');
});

// --------------------------- RESET BOARD ---------------------------
// Resets the board and optionally sets orientation
export async function resetBoard({ color = 'white'} = {}) {
    try {
        // Reset engine display
        engineDepthEl.textContent = '-'
        engineEvalEl.textContent = '-'
        engineBestMoveEl.textContent = '-'
        enginePvEl.textContent = engineToggle.checked ? 'Analyzing...' : '-'

        // Reset tutor display
        document.getElementById('hint-text').textContent = tutorToggle.checked
            ? 'Tutor active. Make a move to get feedback.'
            : 'Enable Tutor to receive move explanations.'

        // Destroy existing board for a clean start
        if (state.ground) {
            state.lastBoardStatus = null;
            state.ground.destroy();
        }

        // Create new board with selected color
        createBoard(boardEl, color);

        // Call backend to reset server-side board
        const res = await fetch('/api/board/reset', { method: 'POST' });
        const data = await res.json();

        if (!res.ok) console.log("RESET FAILED", data);

        // Apply initial board state
        await loadInitialState();

        // Force orientation of board and clock if needed
        const orientation = color === 'white' ? 'white' : color === 'black' ? 'black' : data.status.turn;
        if (state.ground.state.orientation !== orientation) {
            state.ground.set({ orientation });
        }
        if (orientation === 'black' && state.clocksFlipped !== true) {
            flipClocks();
        } 

        // Restart engine if toggled on
        if (engineToggle.checked) {
            await fetch('/api/engine/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen: data.status.fen })
            });
        }


        // Restart playerbot if toggled on
        if (playerbotToggle.checked) {
            // Start the bot
            const bot_color = colorSelect.value === 'white' ? 'b': 'w';
            await fetch('/api/playerbot/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bot_color: bot_color, elo: elo })
            });

            console.log('Playerbot reset, reactivated, elo', elo);

        } else {
            // Stop bot
            await fetch('/api/playerbot/stop', { method: 'POST' });

            console.log('Playerbot deactivated');
        }

    } catch (err) {
        console.error('Failed to reset board', err);
    }
}

// --------------------------- NEW GAME BUTTON ---------------------------
// Starts a new game with selected color and clock
newGameBtn.addEventListener("click", async () => {
    const color = colorSelect.value;
    const clockTime = parseInt(clockSelect.value, 10);

    // Reset the board first
    await resetBoard({ color });

    // Reset clock based on time control
    await resetClock({ color, clockTime });

    // Set the playerColor in state
    state.playerColor = color;
});

// --------------------------- INITIAL LOAD ---------------------------
// Load initial state and connect SSE
loadInitialState();
resetClock({ color:'white', clockTime: 'No Clock'})
connect();