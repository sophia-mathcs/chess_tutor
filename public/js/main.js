// main.js
import { state } from './state.js';

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

initDOMRefs();

import {
    renderClock,
    syncClockState,
    resetClock
} from './clock.js';

syncClockState().then(() => {
    renderClock();
});

import {
    createBoard,
    applyStatus,
    flipClocks,
    updateEvalBar,
    updateStatusText,
    drawBestMove
} from './board.js';

createBoard();

import { onUserMove } from './players.js';

import { connect } from './sse.js';

async function loadInitialState() {
    try {
        const res = await fetch('/api/board/state');
        const data = await res.json();
        if (data && data.status) {
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
}

// --------------------------- ENGINE TOGGLE ---------------------------
engineToggle.addEventListener("change", async () => {
    if (engineToggle.checked) {
        evalBar.classList.remove("hidden");
        enginePvEl.textContent = "Analyzing...";
        engineEvalEl.textContent = "-";
        engineBestMoveEl.textContent = "-";
        engineDepthEl.textContent = "-";

        await fetch('/api/engine/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fen: state.lastBoardStatus.fen })
        });

        console.log('Engine activated');

    } else {
        evalBar.classList.add("hidden");
        enginePvEl.textContent = "-";
        engineEvalEl.textContent = "-";
        engineBestMoveEl.textContent = "-";
        engineDepthEl.textContent = "-";

        state.ground.set({ drawable: { autoShapes: [] } });

        await fetch('/api/engine/stop', { method: 'POST' });

        console.log('Engine deactivated');
    }
    saveToggleState();
});

// --------------------------- SELECT ELO ---------------------------
let elo = 800;

eloSelect.addEventListener("change", (e) => {
  const val = parseInt(e.target.value, 10);

  if (!Number.isNaN(val)) {
    elo = val;
    saveToggleState();
  }
});

// --------------------------- PLAYERBOT TOGGLE ---------------------------
playerbotToggle.addEventListener("change", async () => {
    if (playerbotToggle.checked) {
        const color = colorSelect.value === 'white' ? 'b': 'w';
        await fetch('/api/playerbot/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bot_color: color, elo: elo })
        });

        console.log('Playerbot activated, elo:', elo);

    } else {
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
flipBtn.addEventListener("click", async () => {
    const res = await fetch('/api/board/flip', { method: 'POST' });
    const data = await res.json();

    if (!data.ok) {
        console.warn('Flip failed, no status returned');
        return;
    }

    flipClocks();

    console.log('Board flipped');
});

// --------------------------- RESET BOARD ---------------------------
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

        if (state.ground) {
            state.lastBoardStatus = null;
            state.ground.destroy();
        }

        createBoard(color);

        const res = await fetch('/api/board/reset', { method: 'POST' });
        const data = await res.json();

        if (!res.ok) console.log("RESET FAILED", data);

        await loadInitialState();

        const orientation = color === 'white' ? 'white' : color === 'black' ? 'black' : data.status.turn;
        if (state.ground.state.orientation !== orientation) {
            state.ground.set({ orientation });
        }
        if (orientation === 'black' && state.clocksFlipped !== true) {
            flipClocks();
        }

        if (engineToggle.checked) {
            await fetch('/api/engine/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen: data.status.fen })
            });
        }

        if (playerbotToggle.checked) {
            const bot_color = colorSelect.value === 'white' ? 'b': 'w';
            await fetch('/api/playerbot/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bot_color: bot_color, elo: elo })
            });

            console.log('Playerbot reset, reactivated, elo', elo);

        } else {
            await fetch('/api/playerbot/stop', { method: 'POST' });

            console.log('Playerbot deactivated');
        }

    } catch (err) {
        console.error('Failed to reset board', err);
    }
}

// --------------------------- NEW GAME BUTTON ---------------------------
newGameBtn.addEventListener("click", async () => {
    const color = colorSelect.value;
    const clockTime = parseInt(clockSelect.value, 10);

    await resetBoard({ color });

    await resetClock({ color, clockTime });

    state.playerColor = color;
});

// --------------------------- INITIAL LOAD (reset on refresh) ---------------------------
async function resetSessionOnRefresh() {
    try {
        // Reset UI controls to defaults
        colorSelect.value = 'white';
        clockSelect.value = '0';
        eloSelect.value = '800';
        elo = 800;

        engineToggle.checked = false;
        playerbotToggle.checked = false;
        tutorToggle.checked = false;
        noviceToggle.checked = false;

        // Reset tutor badge and panel
        const badge = document.getElementById('tutor-status')
        if (badge) { badge.textContent = 'Off'; badge.className = 'tutor-badge tutor-off'; }
        document.getElementById('hint-text').textContent = 'Enable Tutor to receive move explanations.';
        document.getElementById('followup-area').style.display = 'none';
        setTutorEnabled(false);

        // Reset engine display
        evalBar.classList.add('hidden');
        enginePvEl.textContent = '-';
        engineEvalEl.textContent = '-';
        engineBestMoveEl.textContent = '-';
        engineDepthEl.textContent = '-';
        updateEvalBar(0);

        // Reset clock UI state
        state.clockStatus.on = false;
        state.clockStatus.started = false;
        state.clockStatus.clockExpired = false;
        state.ground?.set({ drawable: { autoShapes: [] } });

        // Reset backend services
        await fetch('/api/playerbot/stop', { method: 'POST' });
        await fetch('/api/engine/stop', { method: 'POST' });
        await fetch('/api/tutor/disable', { method: 'POST' });
        await fetch('/api/board/reset', { method: 'POST' });
        await fetch('/api/clock/stop', { method: 'POST' });
        await fetch('/api/clock/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time: 0, startingTurn: 'white' })
        });

    } catch (err) {
        console.warn('Failed to reset session on refresh', err);
    }
}

resetSessionOnRefresh()
    .then(() => loadInitialState())
    .then(() => resetClock({ color: 'white', clockTime: 0 }))
    .finally(() => connect());
