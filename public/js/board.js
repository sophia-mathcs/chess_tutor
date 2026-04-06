// board.js
import { state } from './state.js';
import { boardEl, whiteClockEl, blackClockEl, fenDisplay, evalFill, statusEl } from './domRefs.js';
import { onUserMove } from './players.js';
import { Chessground } from 'chessground';

// Create and initialize the Chessground board
export function createBoard(color = 'white') {
    state.ground = Chessground(boardEl, {
        coordinates: true,
        orientation: color,
        animation: { duration: 200 },
        movable: {
            free: false,
            dests: new Map(),
            events: { after: onUserMove },
        },
    });
}


// Apply a new game status to the board
export function applyStatus(status) {
    // Avoid re-applying the same status to prevent unnecessary updates and potential animation glitches
    if (
    state.lastBoardStatus &&
    state.lastBoardStatus.fen === status.fen &&
    state.lastBoardStatus.turn === status.turn &&
    JSON.stringify(state.lastBoardStatus.dests) === JSON.stringify(status.dests)
    ) {
    return;
    }

    // Log the status being applied for debugging purposes
    console.log("APPLY STATUS", {
    fen: status.fen,
    turn: status.turn,
    destCount: Object.keys(status.dests || {}).length
    })

    state.lastBoardStatus = status;

    const destEntries = Object.entries(status.dests || {});
    const destsMap = new Map(destEntries.map(([from, tos]) => [from, tos]));

    // clear any square selection first
    state.ground.set({ selected: undefined });

    // Update the board position and legal moves based on the new status
    state.ground.set({
    fen: status.fen,
    turnColor: status.turn,
    movable: {
        dests: destsMap,
        color: status.turn,
        events: { after: onUserMove },
    }
    });

    // Update status text
    updateStatusText(status);

    // Update FEN display
    if (fenDisplay) fenDisplay.textContent = status.fen;
}


// Update display text
export function updateStatusText(status) {
    if (!status) {
        statusEl.textContent = 'Connected. Waiting for game state…';
        return;
    }
    let text = `Turn: ${status.turn}.`;
    if (status.isCheckmate) text = `Checkmate + ${status.turn === 'white' ? 'Black' : 'White'} wins!`;
    else if (status.isDraw) text = ' Draw.';
    else if (status.inCheck) text += ' Check.';
    statusEl.textContent = text;
}


// Update the eval bar visual
export function updateEvalBar(cp) {
    const MAX_CP = 1000;
    cp = Math.max(-MAX_CP, Math.min(MAX_CP, cp));
    const pct = 50 + (cp / MAX_CP) * 50;
    evalFill.style.height = pct + "%";
    evalFill.style.bottom = "0";
}


// Draw the best move arrow on the board
export function drawBestMove(move) {
    const turn = state.lastBoardStatus?.turn;
    const hideForBotTurn =
        state.playerbotEnabled &&
        state.playerbotColor &&
        turn === state.playerbotColor;

    if (hideForBotTurn) {
        state.ground.set({
            drawable: {
                visible: true,
                autoShapes: []
            }
        });
        return;
    }

    if (!move || move.length < 4) return;

    const from = move.slice(0,2), to = move.slice(2,4);
    state.ground.set({
    drawable: {
        visible: true,
        autoShapes: [{ orig: from, dest: to, brush: 'green' }]
    }
    });
}


// Flip the clocks' positions in the UI
export function flipClocks() {
    const boardRow = document.querySelector('.board-row');
    const whiteClock = whiteClockEl.closest('.clock');
    const blackClock = blackClockEl.closest('.clock');

    if (state.clocksFlipped) {
        boardRow.before(blackClock);
        boardRow.after(whiteClock);
    } else {
        boardRow.before(whiteClock);
        boardRow.after(blackClock);
    }

    state.clocksFlipped = !state.clocksFlipped;
}

// Flip the Chessground board orientation
export function flipBoard() {
    if (!state.ground) return;

    const current = state.ground.state.orientation;
    const next = current === 'white' ? 'black' : 'white';

    state.ground.set({ orientation: next });
}