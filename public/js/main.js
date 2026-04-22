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
    playerBotSelect,
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
const retrievalLoadingEl = document.getElementById('retrieval-loading');

function isRetrievalModelSelected() {
    return playerBotSelect.value === 'retrieval_model';
}

function setPlayerBotLoading(isLoading) {
    const show = isLoading && isRetrievalModelSelected();
    retrievalLoadingEl?.classList.toggle('hidden', !show);
    playerbotToggle.disabled = isLoading;
    playerBotSelect.disabled = isLoading;
}

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
createBoard();

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

// --------------------------- PERSIST TOGGLE STATE ---------------------------
function saveToggleState() {
    localStorage.setItem('toggle_engine', engineToggle.checked)
    localStorage.setItem('toggle_bot',    playerbotToggle.checked)
    localStorage.setItem('toggle_tutor',  tutorToggle.checked)
    localStorage.setItem('toggle_novice', noviceToggle.checked)
    localStorage.setItem('elo',           elo)
    localStorage.setItem('player_bot_type', playerBotSelect.value)
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
    saveToggleState();
});

// --------------------------- SELECT ELO ---------------------------
// Handler for choosing the opposition bot rating
let elo = 800; // default value

eloSelect.addEventListener("change", (e) => {
  const val = parseInt(e.target.value, 10);

  if (!Number.isNaN(val)) {
    elo = val;
    saveToggleState();
  }
});

playerBotSelect.addEventListener("change", () => {
    saveToggleState();
});

// --------------------------- PLAYERBOT TOGGLE ---------------------------
// Handler for enabling/disabling theplayerbot
playerbotToggle.addEventListener("change", async () => {
    if (playerbotToggle.checked) {
        try {
            setPlayerBotLoading(true);
            // Start the bot with opposite color of user
            const color = colorSelect.value === 'white' ? 'b' : 'w';
            const res = await fetch('/api/playerbot/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bot_color: color, elo: elo, bot_type: playerBotSelect.value })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.ok === false) {
                throw new Error(data.error || `start failed (${res.status})`);
            }
            console.log('Playerbot activated, elo:', elo, 'type:', playerBotSelect.value);
        } catch (err) {
            console.error('Playerbot activation failed:', err);
            playerbotToggle.checked = false;
            alert('Player bot failed to start. Check backend logs and dependencies.');
        } finally {
            setPlayerBotLoading(false);
        }

    } else {
        // Stop engine server-side
        setPlayerBotLoading(false);
        await fetch('/api/playerbot/stop', { method: 'POST' });

        console.log('Playerbot deactivated');
    }
    saveToggleState();
});




// --------------------------- NOVICE TOGGLE ---------------------------
const noviceToggle = document.getElementById('toggle-novice')
noviceToggle.addEventListener("change", async () => {
    await fetch('/api/tutor/novice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novice: noviceToggle.checked })
    })
    saveToggleState()
})

// --------------------------- TUTOR STATUS BADGE (clickable) ---------------------------
document.getElementById('tutor-status').addEventListener('click', () => {
    tutorToggle.click()
})

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
    saveToggleState()
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
        createBoard(color);

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
            setPlayerBotLoading(true);
            // Start the bot
            const bot_color = colorSelect.value === 'white' ? 'b': 'w';
            const res = await fetch('/api/playerbot/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bot_color: bot_color, elo: elo, bot_type: playerBotSelect.value })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.ok === false) {
                playerbotToggle.checked = false;
                console.error('Playerbot restart failed:', data.error || res.status);
            } else {
                console.log('Playerbot reset, reactivated, elo', elo, 'type:', playerBotSelect.value);
            }
            setPlayerBotLoading(false);

        } else {
            // Stop bot
            setPlayerBotLoading(false);
            await fetch('/api/playerbot/stop', { method: 'POST' });

            console.log('Playerbot deactivated');
        }

    } catch (err) {
        console.error('Failed to reset board', err);
        setPlayerBotLoading(false);
    }
}

// --------------------------- NEW GAME BUTTON ---------------------------
// Starts a new game with selected color and clock
let newGameInFlight = false;
newGameBtn.addEventListener("click", async () => {
    if (newGameInFlight) return;
    newGameInFlight = true;

    try {
    await appInitPromise;

    const color = colorSelect.value;
    const clockTime = parseInt(clockSelect.value, 10);

    // Reset the board first
    await resetBoard({ color });

    // Reset clock based on time control
    await resetClock({ color, clockTime });
    if (clockTime > 0) {
        // Start clock deterministically at new-game time to avoid relying on
        // the first SSE move event (which can be delayed/missed).
        await fetch('/api/clock/start', { method: 'POST' });
        await syncClockState();
        state.clockStatus.started = true;
    }

    // Set the playerColor in state
    state.playerColor = color;
    } finally {
        newGameInFlight = false;
    }
});

async function initializeFreshState() {
    // Refresh should behave like starting a brand-new game.
    colorSelect.value = 'white'
    clockSelect.value = '0'
    elo = 800
    eloSelect.value = '800'
    playerBotSelect.value = 'human_bot_trained'

    engineToggle.checked = false
    playerbotToggle.checked = false
    tutorToggle.checked = false
    noviceToggle.checked = false

    evalBar.classList.add('hidden')
    state.ground.set({ drawable: { autoShapes: [] } })

    await fetch('/api/engine/stop', { method: 'POST' })
    await fetch('/api/playerbot/stop', { method: 'POST' })
    await fetch('/api/tutor/disable', { method: 'POST' })
    await fetch('/api/tutor/novice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novice: false })
    })

    const badge = document.getElementById('tutor-status')
    badge.textContent = 'Off'
    badge.className = 'tutor-badge tutor-off'
    clearTutorPanel()

    await resetBoard({ color: 'white' })
    await resetClock({ color: 'white', clockTime: 0 })
    state.playerColor = 'white'

    localStorage.removeItem('toggle_engine')
    localStorage.removeItem('toggle_bot')
    localStorage.removeItem('toggle_tutor')
    localStorage.removeItem('toggle_novice')
    localStorage.removeItem('elo')
    localStorage.removeItem('player_bot_type')
}

// --------------------------- INITIAL LOAD ---------------------------
connect();
const appInitPromise = initializeFreshState();