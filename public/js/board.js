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
    if (!move || move.length < 4) return;

    const from = move.slice(0,2), to = move.slice(2,4);
    state.ground.set({
    drawable: {
        visible: true,
        autoShapes: [{ orig: from, dest: to, brush: 'green' }]
    }
    });
}

function squareToPoint(square, orientation, size) {
    const files = "abcdefgh";
    const file = files.indexOf(square[0]);
    const rank = parseInt(square[1], 10);
    if (file < 0 || Number.isNaN(rank)) return null;

    let x;
    let y;
    if (orientation === "black") {
        x = ((7 - file) + 0.5) * (size / 8);
        y = ((rank - 1) + 0.5) * (size / 8);
    } else {
        x = (file + 0.5) * (size / 8);
        y = ((8 - rank) + 0.5) * (size / 8);
    }
    return { x, y };
}

export function clearRetrievalChoices() {
    if (!state.ground) return;
    state.ground.set({
        drawable: {
            visible: true,
            autoShapes: []
        }
    });

    const wrap = boardEl;
    if (!wrap) return;
    wrap.querySelectorAll(".retrieval-choice-label").forEach((el) => el.remove());
}

export function drawRetrievalChoices(choices) {
    if (!state.ground || !Array.isArray(choices) || choices.length === 0) {
        clearRetrievalChoices();
        return;
    }

    const top3 = choices.slice(0, 3).filter((c) => c && c.uci && c.uci.length >= 4);
    if (top3.length === 0) {
        clearRetrievalChoices();
        return;
    }

    const brushes = ["green", "yellow", "blue"];
    const shapes = top3.map((choice, idx) => ({
        orig: choice.uci.slice(0, 2),
        dest: choice.uci.slice(2, 4),
        brush: brushes[idx] || "green",
    }));

    state.ground.set({
        drawable: {
            visible: true,
            autoShapes: shapes
        }
    });

    const wrap = boardEl;
    if (!wrap) return;
    wrap.querySelectorAll(".retrieval-choice-label").forEach((el) => el.remove());

    const boardRect = boardEl.getBoundingClientRect();
    const size = Math.min(boardRect.width, boardRect.height);
    const orientation = state.ground.state.orientation || "white";

    top3.forEach((choice, idx) => {
        const orig = choice.uci.slice(0, 2);
        const dest = choice.uci.slice(2, 4);
        const p1 = squareToPoint(orig, orientation, size);
        const p2 = squareToPoint(dest, orientation, size);
        if (!p1 || !p2) return;

        const lx = p1.x + (p2.x - p1.x) * 0.72;
        const ly = p1.y + (p2.y - p1.y) * 0.72;

        const label = document.createElement("div");
        label.className = "retrieval-choice-label";
        label.textContent = `Top ${idx + 1}`;
        label.style.left = `${lx}px`;
        label.style.top = `${ly}px`;
        wrap.appendChild(label);
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